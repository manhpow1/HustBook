const jwt = require('jsonwebtoken');
const config = require('config');
const { getDocument, collections } = require('../config/database');
const cache = require('../utils/redis');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

async function authenticateSocket(socket, next) {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(createError('9998', 'Missing or invalid authorization token'));
        }

        const decoded = jwt.verify(token, config.get('jwt.secret'));
        const { uid, tokenVersion } = decoded;

        let user = await cache.get(`user:${uid}`);
        if (!user) {
            user = await getDocument(collections.users, uid);
            if (!user) {
                return next(createError('9995', 'User not found'));
            }
            await cache.set(`user:${uid}`, user, 3600);
        }

        if (user.tokenVersion !== tokenVersion) {
            return next(createError('9998', 'Token is invalid or expired'));
        }

        socket.userId = uid;
        next();
    } catch (error) {
        logger.error('Socket auth error:', error);
        next(createError('9998', 'Invalid or expired token'));
    }
}

module.exports = { authenticateSocket };
