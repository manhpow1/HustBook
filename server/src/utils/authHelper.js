const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('config');

const SALT_ROUNDS = config.get('auth.saltRounds');
const JWT_SECRET = config.get('jwt.secret');
const JWT_EXPIRATION = config.get('jwt.expiration');
const REFRESH_TOKEN_SECRET = config.get('jwt.refreshSecret');
const REFRESH_TOKEN_EXPIRATION = config.get('jwt.refreshExpiration');

const generateRandomCode = (length = 6) => {
    return Math.floor(100000 + Math.random() * 900000).toString().slice(0, length);
};

const generateDeviceToken = () => uuidv4();

const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, SALT_ROUNDS);
    } catch (error) {
        throw new Error('Error hashing password.');
    }
};

const comparePassword = async (password, hashedPassword) => {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        throw new Error('Error comparing passwords.');
    }
};

const generateJWT = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

const verifyJWT = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid token.');
    }
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            userId: user.uid,
            tokenVersion: user.tokenVersion, // Used for token invalidation
        },
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRATION }
    );
};

module.exports = {
    generateRandomCode,
    generateDeviceToken,
    hashPassword,
    comparePassword,
    generateJWT,
    verifyJWT,
    generateRefreshToken,
};
