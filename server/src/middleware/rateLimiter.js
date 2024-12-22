const { RateLimiterRedis } = require('rate-limiter-flexible');
const { client: redisClient } = require('../utils/redis');
const logger = require('../utils/logger');

const createLimiter = (points, duration, prefix) => {
    return new RateLimiterRedis({
        storeClient: redisClient,
        points, // Number of attempts
        duration, // Time window in seconds
        keyPrefix: prefix,
    });
};

// Rate limiter for auth endpoints (5 attempts per 15 minutes)
const authRateLimiter = createLimiter(5, 15 * 60, 'rl:auth');

// Rate limiter for verify code requests (3 attempts per hour)
const verifyCodeRateLimiter = createLimiter(3, 60 * 60, 'rl:verify');

// Rate limiter for push settings (100 requests per 15 minutes)
const pushSettingsRateLimiter = createLimiter(100, 15 * 60, 'rl:push');

// Rate limiter for blocking users (10 requests per minute)
const setBlockRateLimiter = createLimiter(10, 60, 'rl:block');

// Rate limiter for verify code checks (5 attempts per 15 minutes)
const checkVerifyCodeRateLimiter = createLimiter(5, 15 * 60, 'rl:code');

// Middleware factory
const createRateLimitMiddleware = (limiter, errorMessage) => {
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
};

// Export middleware functions
const authLimiter = createRateLimitMiddleware(
    authRateLimiter,
    'Too many login attempts, please try again later.'
);

const verifyCodeLimiter = createRateLimitMiddleware(
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

const checkVerifyCodeLimiter = createRateLimitMiddleware(
    checkVerifyCodeRateLimiter,
    'Too many verification attempts, please try again later.'
);

module.exports = {
    pushSettingsLimiter,
    setBlockLimiter,
    authLimiter,
    verifyCodeLimiter,
    checkVerifyCodeLimiter
};
