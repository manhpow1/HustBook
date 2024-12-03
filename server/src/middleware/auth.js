const jwt = require('jsonwebtoken');
const { getDocument, collections } = require('../config/database');
const { createError } = require('../utils/customError');
const cache = require('../utils/redis');
const config = require('config');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw createError('9998', 'Missing or invalid authorization header');
        }

        const token = authHeader.slice(7);

        // Verify JWT token
        const decoded = jwt.verify(token, config.get('jwt.secret'));
        const { uid, tokenVersion } = decoded;

        // Fetch user data from cache or database
        let user = await cache.get(`user:${uid}`);

        if (!user) {
            user = await getDocument(collections.users, uid);
            if (!user) {
                throw createError('9995', 'User not found');
            }
            await cache.set(`user:${uid}`, user, 3600); // Cache for 1 hour
        }

        // Check if tokenVersion matches
        if (user.tokenVersion !== tokenVersion) {
            throw createError('9998', 'Token is invalid or expired');
        }

        req.user = { ...user, uid };

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { authenticateToken };