const jwt = require('jsonwebtoken');
const { getDocument, collections } = require('../config/database');
const { createError } = require('../utils/customError');
const cache = require('../utils/redis');
const config = require('config');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Ensure the authorization header is present and properly formatted
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw createError('9998', 'Missing or invalid authorization header');
        }

        const token = authHeader.slice(7); // Remove 'Bearer ' prefix

        // Verify JWT token
        const decoded = jwt.verify(token, config.get('jwt.secret'));

        // Check Redis cache for user data
        const cacheKey = `user:${decoded.uid}`;
        let user = await cache.get(cacheKey);

        if (!user) {
            // Retrieve user from database if not in cache
            user = await getDocument(collections.users, decoded.uid);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // Cache the user data
            await cache.set(cacheKey, user, 3600);
        }

        // Attach user to request object
        req.user = { ...user, uid: decoded.uid };

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        next(error);
    }
};

module.exports = { authenticateToken };