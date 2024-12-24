const { RateLimiterRedis } = require('rate-limiter-flexible');
const { client: redisClient } = require('../utils/redis');
const logger = require('../utils/logger');

// Helper to create a standard RateLimiter with given points & duration
const createLimiter = (points, duration, prefix) => {
    return new RateLimiterRedis({
        storeClient: redisClient,
        points,
        duration,
        keyPrefix: prefix,
    });
};

// Example limiters
const authRateLimiter = createLimiter(5, 15 * 60, 'rl:auth');
const verifyCodeRateLimiter = createLimiter(3, 60 * 60, 'rl:verify');
const pushSettingsRateLimiter = createLimiter(100, 15 * 60, 'rl:push');
const setBlockRateLimiter = createLimiter(10, 60, 'rl:block');
const checkVerifyCodeRateLimiter = createLimiter(5, 15 * 60, 'rl:code');

// NEW: Limit signup attempts, e.g. 3 tries per hour
const signupRateLimiter = createLimiter(3, 60 * 60, 'rl:signup');

// Turn any RateLimiter into an Express middleware:
function createRateLimitMiddleware(limiter, errorMessage) {
    return async (req, res, next) => {
        try {
            const key = req.user ? req.user.uid : req.ip;
            await limiter.consume(key);
            next();
        } catch (error) {
            // If it's a standard RateLimiter error, respond with 429
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

async function checkSignupLimit(ip) {
    try {
        const rateRes = await signupRateLimiter.consume(ip);
        // If consume() succeeds, not limited
        return {
            limited: false,
            timeLeft: 0,
        };
    } catch (error) {
        // If consume() fails because of too many requests:
        if (error.msBeforeNext) {
            return {
                limited: true,
                timeLeft: Math.ceil(error.msBeforeNext / 1000),
            };
        }
        throw error;
    }
}

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

const authLimiter = createRateLimitMiddleware(
    authRateLimiter,
    'Too many login attempts, please try again later.'
);
const verifyCodeLimiterMiddleware = createRateLimitMiddleware(
    verifyCodeRateLimiter,
    'Too many verification code requests, please try again later.'
);
const pushSettingsLimiter = createRateLimitMiddleware(pushSettingsRateLimiter);
const setBlockLimiter = createRateLimitMiddleware(
    setBlockRateLimiter,
    'Too many requests. Please try again later.'
);
const checkVerifyCodeLimiterMiddleware = createRateLimitMiddleware(
    checkVerifyCodeRateLimiter,
    'Too many verification attempts, please try again later.'
);

module.exports = {
    // Existing middlewares for direct usage in routes:
    pushSettingsLimiter,
    setBlockLimiter,
    authLimiter,
    verifyCodeLimiterMiddleware,
    checkVerifyCodeLimiterMiddleware,
    checkSignupLimit, 
    checkVerifyCodeLimit,
};