const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    } catch (error) {
        logger.error('Error verifying token:', error);
        return null;
    }
};

const getUserFromToken = async (token) => {
    try {
        const userId = verifyToken(token);
        if (!userId) return null;

        const user = await User.findById(userId);
        return user;
    } catch (error) {
        logger.error('Error getting user from token:', error);
        return null;
    }
};

module.exports = {
    generateToken,
    verifyToken,
    getUserFromToken
};