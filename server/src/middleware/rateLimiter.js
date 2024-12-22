const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { client: redisClient } = require('../utils/redis');
const logger = require('../utils/logger');

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:auth:',
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 failed attempts per windowMs
    message: {
        code: '9999',
        message: 'Too many login attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Only count failed attempts
});

// Rate limiter for verify code requests
const verifyCodeLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:verify:',
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per hour
    message: {
        code: '9999',
        message: 'Too many verification code requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Define rate limiter for push settings
const pushSettingsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        code: '9999',
        message: 'Too many requests, please try again later.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const setBlockLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each user to 10 requests per windowMs
    keyGenerator: (req) => req.user.uid, // Rate limit per authenticated user
    handler: (req, res) => {
        res.status(429).json({
            code: '1014',
            message: 'Too many requests. Please try again later.',
        });
    },
});

const checkVerifyCodeLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:code:',
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 attempts per 15 minutes
    message: {
        code: '9999',
        message: 'Too many verification attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { 
    pushSettingsLimiter, 
    setBlockLimiter,
    authLimiter,
    verifyCodeLimiter,
    checkVerifyCodeLimiter
};
