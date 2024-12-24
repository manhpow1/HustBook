const { RateLimiterRedis } = require('rate-limiter-flexible');
const { client: redisClient } = require('../utils/redis');
const logger = require('../utils/logger');

// Helper to create a RateLimiter with given "points" and "duration"
const createLimiter = (points, duration, prefix) => {
    return new RateLimiterRedis({
        storeClient: redisClient,
        points,
        duration,
        keyPrefix: prefix,
    });
};

// Rate-limiters for various endpoints/actions
const authRateLimiter = createLimiter(5, 120, 'rl:auth'); // Reduced to 2 minutes
const verifyCodeRateLimiter = createLimiter(3, 120, 'rl:verify'); // Reduced to 2 minutes
const pushSettingsRateLimiter = createLimiter(100, 120, 'rl:push'); // Reduced to 2 minutes
const setBlockRateLimiter = createLimiter(10, 60, 'rl:block'); // Remains at 1 minute
const checkVerifyCodeRateLimiter = createLimiter(5, 120, 'rl:code'); // Reduced to 2 minutes
const signupRateLimiter = createLimiter(3, 120, 'rl:signup'); // Reduced to 2 minutes

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

// Function-based approach for checking signup attempts
async function checkSignupLimit(ip) {
    try {
        await signupRateLimiter.consume(ip);
        return { limited: false, timeLeft: 0 };
    } catch (error) {
        if (error.msBeforeNext) {
            return {
                limited: true,
                timeLeft: Math.ceil(error.msBeforeNext / 1000),
            };
        }
        throw error;
    }
}

// Function-based approach for checking verify-code attempts
async function checkVerifyCodeLimit(ip) {
    try {
        await verifyCodeRateLimiter.consume(ip);
        return { limited: false, timeLeft: 0 };
    } catch (error) {
        if (error.msBeforeNext) {
            return {
                limited: true,
                timeLeft: Math.ceil(error.msBeforeNext / 1000),
            };
        }
        throw error;
    }
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

module.exports = {
    // Direct Express middlewares (for routes)
    authLimiter,
    verifyCodeLimiterMiddleware,
    pushSettingsLimiter,
    setBlockLimiter,
    checkVerifyCodeLimiterMiddleware,
    // Functions (for controllers or other logic)
    checkSignupLimit,
    checkVerifyCodeLimit,
};