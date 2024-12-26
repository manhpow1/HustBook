import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import config from 'config';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger.js';
import crypto from 'crypto';

const SALT_ROUNDS = 12; // Increased from default 10
export const TOKEN_EXPIRY = '15m'; // Shorter access token lifetime
export const REFRESH_TOKEN_EXPIRY = '7d';
const VERIFICATION_CODE_LENGTH = 6;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash a password with bcrypt
 */
export const hashPassword = async (password) => {
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
export const comparePassword = async (plainPassword, hashedPassword) => {
    if (!plainPassword || !hashedPassword) {
        logger.error('Error: Missing data for password comparison');
        throw new Error('Both password and hash are required');
    }
    
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
export const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a JWT access token
 */
export const generateJWT = (payload) => {
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
                audience: config.has('app.domain') ? config.get('app.domain') : undefined,
                issuer: config.has('app.name') ? config.get('app.name') : 'HustBook'
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
export const generateRefreshToken = (user) => {
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
                audience: config.has('app.domain') ? config.get('app.domain') : undefined,
                issuer: config.has('app.name') ? config.get('app.name') : 'HustBook'
            }
        );
        logger.info(`Refresh token generated for user ${user.uid}`);
        return token;
    } catch (error) {
        logger.error('Error generating refresh token:', error);
        throw new Error('Refresh token generation failed');
    }
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = async (token) => {
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
export const generateRandomCode = () => {
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
export const generateTokenFamily = () => {
    return uuidv4();
};

/**
 * Generate a device token for user sessions
 */
export const generateDeviceToken = () => {
    return generateSecureToken(32);
};

/**
 * Validate password complexity
 */
export const validatePassword = (password) => {
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
