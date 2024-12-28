import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../utils/redis.js';
import logger from '../utils/logger.js';

// Helper to create a RateLimiter with given "points" and "duration"
const createLimiter = (points, duration, prefix) => {
    return new RateLimiterRedis({
        storeClient: redisClient.client,
        points,
        duration,
        keyPrefix: prefix,
    });
};

// Rate-limiters for various endpoints/actions
const authRateLimiter = createLimiter(5, 60, 'rl:auth');
const verifyCodeRateLimiter = createLimiter(10, 60, 'rl:verify');
const pushSettingsRateLimiter = createLimiter(100, 60, 'rl:push');
const setBlockRateLimiter = createLimiter(10, 60, 'rl:block');
const checkVerifyCodeRateLimiter = createLimiter(10, 60, 'rl:code');

// Convert a RateLimiter to an Express middleware
function createRateLimitMiddleware(limiter, errorMessage) {
    return async (req, res, next) => {
        try {
            const key = req.user ? req.user.uid : req.ip;
            await limiter.consume(key);
            next();
        } catch (error) {
            if (error.remainingPoints !== undefined) {
                return res.status(429).json({
                    code: '9999',
                    message: errorMessage || 'Too many requests, please try again later.',
                });
            }
            logger.error('Rate limiter error:', error);
            next(error);
        }
    };
}

// Middleware-based limiters (used in routes)
const authLimiter = createRateLimitMiddleware(
    authRateLimiter,
    'Too many login attempts, please try again later.'
);

const verifyCodeLimiterMiddleware = createRateLimitMiddleware(
    verifyCodeRateLimiter,
    'Too many verification code requests, please try again later.'
);

const pushSettingsLimiter = createRateLimitMiddleware(
    pushSettingsRateLimiter
);

const setBlockLimiter = createRateLimitMiddleware(
    setBlockRateLimiter,
    'Too many requests. Please try again later.'
);

const checkVerifyCodeLimiterMiddleware = createRateLimitMiddleware(
    checkVerifyCodeRateLimiter,
    'Too many verification attempts, please try again later.'
);

export {
    authLimiter,
    verifyCodeLimiterMiddleware,
    pushSettingsLimiter,
    setBlockLimiter,
    checkVerifyCodeLimiterMiddleware,
};