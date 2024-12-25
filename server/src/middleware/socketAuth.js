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

const CONNECTION_LIMIT_BY_IP = 10; // Maximum connections per IP

async function authenticateSocket(socket, next) {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;

    try {
        // Rate limit by IP
        const ipKey = `socket_ip:${clientIp}`;
        const currentConnections = await cache.get(ipKey) || 0;

        if (currentConnections >= CONNECTION_LIMIT_BY_IP) {
            return next(createError('1012', 'Too many connections from this IP'));
        }

        // Increment connection count for this IP
        await cache.set(ipKey, currentConnections + 1, 3600);

        // Rate limit overall connections
        await rateLimiter.consume(clientIp);

        // Get token from either auth object or Authorization header
        const token = socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
            logger.warn(`Socket connection attempt without token from IP: ${clientIp}`);
            return next(createError('9998', 'Missing or invalid authorization token'));
        }

        let decoded;
        try {
            decoded = jwt.verify(token, config.get('jwt.secret'));
        } catch (error) {
            logger.warn(`Invalid token from IP: ${clientIp}, Error: ${error.message}`);
            return next(createError('9998', 'Invalid or expired token'));
        }

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
        socket.clientIp = clientIp; // Store IP for monitoring

        // Add disconnect handler to clean up
        socket.on('disconnect', async () => {
            try {
                const currentConnections = await cache.get(`socket_ip:${clientIp}`);
                if (currentConnections > 0) {
                    await cache.set(`socket_ip:${clientIp}`, currentConnections - 1, 3600);
                }
            } catch (error) {
                logger.error('Error cleaning up socket connection count:', error);
            }
        });

        next();
    } catch (error) {
        logger.error('Socket auth error:', { error, clientIp });
        next(createError('9998', 'Authentication failed'));
    }
}

export { authenticateSocket };
