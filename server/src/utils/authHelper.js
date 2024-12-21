const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('config');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const crypto = require('crypto');
const cache = require('./redis');

const SALT_ROUNDS = 12; // Increased from default 10
const TOKEN_EXPIRY = '15m'; // Shorter access token lifetime
const REFRESH_TOKEN_EXPIRY = '7d';
const VERIFICATION_CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Hash a password with bcrypt
 */
const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        return bcrypt.hash(password, salt);
    } catch (error) {
        logger.error('Error hashing password:', error);
        throw new Error('Password hashing failed');
    }
};

/**
 * Compare a plain password with a hashed password
 */
const comparePassword = async (plainPassword, hashedPassword) => {
    try {
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        logger.error('Error comparing passwords:', error);
        throw new Error('Password comparison failed');
    }
};

/**
 * Generate a secure random string for various security purposes
 */
const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a JWT access token
 */
const generateJWT = (payload) => {
    try {
        const token = jwt.sign(
            {
                ...payload,
                iat: Math.floor(Date.now() / 1000),
                jti: generateSecureToken(16) // Add unique token ID
            },
            config.get('jwt.secret'),
            {
                expiresIn: TOKEN_EXPIRY,
                algorithm: 'HS256',
                audience: config.get('app.domain'),
                issuer: config.get('app.name')
            }
        );

        // Log token generation for audit
        logger.info(`Access token generated for user ${payload.uid}`);
        return token;
    } catch (error) {
        logger.error('Error generating JWT:', error);
        throw new Error('Token generation failed');
    }
};

/**
 * Generate a refresh token with family tracking
 */
const generateRefreshToken = (user) => {
    try {
        const tokenFamily = user.tokenFamily || generateTokenFamily();
        
        const token = jwt.sign(
            {
                userId: user.uid,
                tokenVersion: user.tokenVersion,
                family: tokenFamily,
                type: 'refresh',
                jti: generateSecureToken(16)
            },
            config.get('jwt.refreshSecret'),
            {
                expiresIn: REFRESH_TOKEN_EXPIRY,
                algorithm: 'HS256',
                audience: config.get('app.domain'),
                issuer: config.get('app.name')
            }
        );

        // Log refresh token generation
        logger.info(`Refresh token generated for user ${user.uid}`);
        return token;
    } catch (error) {
        logger.error('Error generating refresh token:', error);
        throw new Error('Refresh token generation failed');
    }
};

/**
 * Add a token to the blacklist
 */
const blacklistToken = async (token, expiry) => {
    try {
        const decoded = jwt.decode(token);
        if (!decoded) {
            throw new Error('Invalid token format');
        }

        // Store in Redis with TTL matching token expiry
        const timeToExpiry = expiry || (decoded.exp - Math.floor(Date.now() / 1000));
        if (timeToExpiry > 0) {
            await cache.set(`blacklist:${token}`, '1', timeToExpiry);
        }
        
        logger.info(`Token blacklisted for user ${decoded.uid}`);
    } catch (error) {
        logger.error('Error blacklisting token:', error);
        throw error;
    }
};

/**
 * Check if a token is blacklisted
 */
const isTokenBlacklisted = async (token) => {
    try {
        return !!(await cache.get(`blacklist:${token}`));
    } catch (error) {
        logger.error('Error checking token blacklist:', error);
        return true; // Fail secure
    }
};

/**
 * Verify a refresh token
 */
const verifyRefreshToken = async (token) => {
    try {
        // First check if token is blacklisted
        if (await isTokenBlacklisted(token)) {
            throw new Error('Token has been revoked');
        }

        return jwt.verify(token, config.get('jwt.refreshSecret'), {
            algorithms: ['HS256'],
            audience: config.get('app.domain'),
            issuer: config.get('app.name')
        });
    } catch (error) {
        logger.error('Error verifying refresh token:', error);
        throw error;
    }
};

/**
 * Generate a cryptographically secure verification code
 */
const generateRandomCode = () => {
    try {
        // Generate a secure random number between 100000 and 999999
        const min = 100000;
        const max = 999999;
        const range = max - min + 1;
        
        const randomBytes = crypto.randomBytes(4);
        const randomNumber = (randomBytes.readUInt32BE(0) % range) + min;
        
        return randomNumber.toString().padStart(VERIFICATION_CODE_LENGTH, '0');
    } catch (error) {
        logger.error('Error generating verification code:', error);
        throw new Error('Verification code generation failed');
    }
};

/**
 * Generate a unique token family identifier
 */
const generateTokenFamily = () => {
    return uuidv4();
};

/**
 * Generate a device token for user sessions
 */
const generateDeviceToken = () => {
    return generateSecureToken(32);
};

/**
 * Validate password complexity
 */
const validatePassword = (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const isLongEnough = password.length >= MIN_PASSWORD_LENGTH;

    return {
        isValid: hasUpperCase && hasLowerCase && hasNumbers && isLongEnough,
        errors: {
            upperCase: !hasUpperCase,
            lowerCase: !hasLowerCase,
            numbers: !hasNumbers,
            length: !isLongEnough
        }
    };
};

module.exports = {
    hashPassword,
    comparePassword,
    generateJWT,
    generateRefreshToken,
    verifyRefreshToken,
    generateRandomCode,
    generateDeviceToken,
    generateTokenFamily,
    validatePassword,
    blacklistToken,
    isTokenBlacklisted,
    TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY,
    MIN_PASSWORD_LENGTH
};
