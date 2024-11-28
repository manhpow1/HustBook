const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('config');

const SALT_ROUNDS = 10;
const JWT_SECRET = config.get('jwt.secret');
const JWT_EXPIRATION = '1h';
const REFRESH_TOKEN_SECRET = config.get('jwt.refreshSecret');
const REFRESH_TOKEN_EXPIRATION = '7d';

const generateRandomCode = (length = 6) => {
    return Math.floor(100000 + Math.random() * 900000).toString().slice(0, length);
};

const generateDeviceToken = () => uuidv4();

const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

const generateJWT = (user) => {
    return jwt.sign(
        {
            uid: user.uid,
            phone: user.phoneNumber,
            tokenVersion: user.tokenVersion, // Include tokenVersion
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION }
    );
};

const verifyJWT = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        {
            userId: user.uid,
            tokenVersion: user.tokenVersion, // Include tokenVersion
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