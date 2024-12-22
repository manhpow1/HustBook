const redis = require('redis');
const logger = require('./logger');

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Handle Redis connection events
client.on('error', (err) => logger.error('Redis Client Error:', err));
client.on('connect', () => logger.info('Redis Client Connected'));

// Connect to Redis
(async () => {
    try {
        await client.connect();
    } catch (err) {
        logger.error('Failed to connect to Redis:', err);
    }
})();

const cache = {
    get: async (key) => {
        try {
            const value = await client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            logger.error('Redis get error:', err);
            return null;
        }
    },
    set: async (key, value, expiryInSeconds = 3600) => {
        try {
            await client.set(key, JSON.stringify(value), {
                EX: expiryInSeconds
            });
        } catch (err) {
            logger.error('Redis set error:', err);
        }
    },
    del: async (key) => {
        try {
            await client.del(key);
        } catch (err) {
            logger.error('Redis del error:', err);
        }
    }
};

// Verification code helpers
const getVerificationCodeKey = (phoneNumber) => `verify:${phoneNumber}`;
const getVerifyAttemptsKey = (phoneNumber) => `verify_attempts:${phoneNumber}`;

const verificationCodeHelpers = {
    setVerificationCode: async (phoneNumber, code, expiryInSeconds = 300) => {
        try {
            const key = getVerificationCodeKey(phoneNumber);
            await client.set(key, code, {
                EX: expiryInSeconds
            });
        } catch (err) {
            logger.error('Redis setVerificationCode error:', err);
        }
    },

    getVerificationCode: async (phoneNumber) => {
        try {
            const key = getVerificationCodeKey(phoneNumber);
            return await client.get(key);
        } catch (err) {
            logger.error('Redis getVerificationCode error:', err);
            return null;
        }
    },

    incrementVerifyAttempts: async (phoneNumber) => {
        try {
            const key = getVerifyAttemptsKey(phoneNumber);
            const attempts = await client.incr(key);
            // Set expiry for attempts counter (24 hours)
            await client.expire(key, 24 * 60 * 60);
            return attempts;
        } catch (err) {
            logger.error('Redis incrementVerifyAttempts error:', err);
            return 0;
        }
    },

    getVerifyAttempts: async (phoneNumber) => {
        try {
            const key = getVerifyAttemptsKey(phoneNumber);
            const attempts = await client.get(key);
            return attempts ? parseInt(attempts) : 0;
        } catch (err) {
            logger.error('Redis getVerifyAttempts error:', err);
            return 0;
        }
    },

    clearVerifyAttempts: async (phoneNumber) => {
        try {
            const key = getVerifyAttemptsKey(phoneNumber);
            await client.del(key);
        } catch (err) {
            logger.error('Redis clearVerifyAttempts error:', err);
        }
    }
};

module.exports = {
    client,
    get: cache.get,
    set: cache.set,
    del: cache.del,
    setVerificationCode: verificationCodeHelpers.setVerificationCode,
    getVerificationCode: verificationCodeHelpers.getVerificationCode,
    incrementVerifyAttempts: verificationCodeHelpers.incrementVerifyAttempts,
    getVerifyAttempts: verificationCodeHelpers.getVerifyAttempts,
    clearVerifyAttempts: verificationCodeHelpers.clearVerifyAttempts
};
