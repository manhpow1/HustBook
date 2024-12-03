const rateLimit = require('express-rate-limit');

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

module.exports = { pushSettingsLimiter, setBlockLimiter };