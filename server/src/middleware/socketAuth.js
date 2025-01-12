import jwt from 'jsonwebtoken';
import config from 'config';
import { getDocument, collections } from '../config/database.js';
import redis from '../utils/redis.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import client from '../utils/redis.js';

const { cache } = redis;
const rateLimiter = new RateLimiterRedis({
    storeClient: client,
    keyPrefix: 'socket_limit',
    points: 100, // Number of connections allowed
    duration: 60, // Per 60 seconds
});

const CONNECTION_LIMIT_BY_IP = 50; // Maximum connections per IP

async function authenticateSocket(socket, next) {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    try {
        // Rate limit by IP
        const ipKey = `socket_ip:${clientIp}`;
        const currentConnections = await cache.get(ipKey) || 0;

        if (currentConnections >= CONNECTION_LIMIT_BY_IP) {
            return next(createError('1012', 'Too many connections from this IP'));
        }

        // Xử lý token
        let token = null;

        // Kiểm tra token trong auth object
        if (socket.handshake.auth && socket.handshake.auth.token) {
            token = socket.handshake.auth.token;
        }
        // Kiểm tra token trong header
        else if (socket.handshake.headers.authorization) {
            token = socket.handshake.headers.authorization;
        }

        // Xóa prefix 'Bearer ' nếu có
        if (token && token.startsWith('Bearer ')) {
            token = token.slice(7);
        }

        if (!token) {
            logger.warn(`Socket connection attempt without token from IP: ${clientIp}`);
            return next(createError('9998', 'Missing authorization token'));
        }

        let decoded;
        try {
            decoded = jwt.verify(token, config.get('jwt.secret'), {
                algorithms: ['HS256']
            });

            const { userId, tokenVersion } = decoded;

            // Kiểm tra user trong cache trước
            let user = await cache.get(`user:${userId}`);

            // Nếu không có trong cache, tìm trong database
            if (!user) {
                user = await getDocument(collections.users, userId);
                if (!user) {
                    logger.error(`User not found: ${userId}`);
                    return next(createError('9995', 'User not found'));
                }
                // Lưu vào cache
                await cache.set(`user:${userId}`, user, 3600);
            }

            if (user.tokenVersion !== tokenVersion) {
                logger.warn(`Invalid token version for user ${userId}`);
                return next(createError('9998', 'Token is invalid or expired'));
            }

            // Gán thông tin user vào socket
            socket.userId = userId;
            socket.user = user;
            socket.clientIp = clientIp;

            // Increment connection count
            await cache.set(ipKey, currentConnections + 1, 3600);

            next();
        } catch (error) {
            logger.error('JWT verification failed:', error);
            return next(createError('9998', 'Invalid token'));
        }

    } catch (error) {
        logger.error('Socket auth error:', { error, clientIp });
        next(createError('9998', 'Authentication failed'));
    }
}

export { authenticateSocket };
