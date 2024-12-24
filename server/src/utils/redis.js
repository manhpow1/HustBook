import redis from 'redis';
import logger from './logger.js';

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

// Constants
const LOCKOUT_DURATION = 15 * 60; // 15 minutes in seconds
const MAX_LOGIN_ATTEMPTS = 5;
const IP_BLACKLIST_DURATION = 24 * 60 * 60; // 24 hours in seconds

// Login attempt helpers
const loginAttemptHelpers = {
    getLockoutDuration: () => LOCKOUT_DURATION,
    getMaxLoginAttempts: () => MAX_LOGIN_ATTEMPTS,
    setLoginAttempts: async (userId, attempts, expiryInSeconds = 3600) => {
        try {
            const key = `login_attempts:${userId}`;
            await client.set(key, attempts.toString(), {
                EX: expiryInSeconds
            });
        } catch (err) {
            logger.error('Redis setLoginAttempts error:', err);
        }
    },

    getLoginAttempts: async (userId) => {
        try {
            const key = `login_attempts:${userId}`;
            const attempts = await client.get(key);
            return attempts ? parseInt(attempts) : 0;
        } catch (err) {
            logger.error('Redis getLoginAttempts error:', err);
            return 0;
        }
    },

    incrementLoginAttempts: async (userId) => {
        try {
            const key = `login_attempts:${userId}`;
            const attempts = await client.incr(key);
            // Set expiry for attempts counter (1 hour)
            await client.expire(key, 3600);
            return attempts;
        } catch (err) {
            logger.error('Redis incrementLoginAttempts error:', err);
            return 0;
        }
    },

    clearLoginAttempts: async (userId) => {
        try {
            const key = `login_attempts:${userId}`;
            await client.del(key);
        } catch (err) {
            logger.error('Redis clearLoginAttempts error:', err);
        }
    },

    setUserLockout: async (userId, duration) => {
        try {
            const key = `lockout:${userId}`;
            await client.set(key, 'locked', {
                EX: Math.floor(duration / 1000)
            });
        } catch (err) {
            logger.error('Redis setUserLockout error:', err);
        }
    },

    getUserLockout: async (userId) => {
        try {
            const key = `lockout:${userId}`;
            const ttl = await client.ttl(key);
            return ttl > 0 ? Date.now() + (ttl * 1000) : null;
        } catch (err) {
            logger.error('Redis getUserLockout error:', err);
            return null;
        }
    },
    // IP blacklist management
    isIPBlacklisted: async (ip) => {
        try {
            const key = `ip_blacklist:${ip}`;
            return await client.exists(key);
        } catch (err) {
            logger.error('Redis isIPBlacklisted error:', err);
            return false;
        }
    },

    blacklistIP: async (ip) => {
        try {
            const key = `ip_blacklist:${ip}`;
            await client.set(key, Date.now(), {
                EX: IP_BLACKLIST_DURATION
            });
        } catch (err) {
            logger.error('Redis blacklistIP error:', err);
        }
    },

    removeIPFromBlacklist: async (ip) => {
        try {
            const key = `ip_blacklist:${ip}`;
            await client.del(key);
        } catch (err) {
            logger.error('Redis removeIPFromBlacklist error:', err);
        }
    },

    getIPBlacklistExpiry: async (ip) => {
        try {
            const key = `ip_blacklist:${ip}`;
            const ttl = await client.ttl(key);
            return ttl > 0 ? Date.now() + (ttl * 1000) : null;
        } catch (err) {
            logger.error('Redis getIPBlacklistExpiry error:', err);
            return null;
        }
    }
};

const deviceHelpers = {
    getUserDevices: async (userId) => {
        try {
            return await cache.get(`user:${userId}:devices`);
        } catch (err) {
            logger.error('Redis getUserDevices error:', err);
            return null;
        }
    },

    setUserDevices: async (userId, devices) => {
        try {
            await cache.set(`user:${userId}:devices`, devices);
        } catch (err) {
            logger.error('Redis setUserDevices error:', err);
        }
    },

    addUserDevice: async (userId, deviceId) => {
        try {
            const devices = await cache.get(`user:${userId}:devices`) || [];
            if (!devices.includes(deviceId)) {
                devices.push(deviceId);
                await cache.set(`user:${userId}:devices`, devices);
            }
        } catch (err) {
            logger.error('Redis addUserDevice error:', err);
        }
    },

    removeUserDevice: async (userId, deviceId) => {
        try {
            const devices = await cache.get(`user:${userId}:devices`) || [];
            const updatedDevices = devices.filter(d => d !== deviceId);
            await cache.set(`user:${userId}:devices`, updatedDevices);
        } catch (err) {
            logger.error('Redis removeUserDevice error:', err);
        }
    }
};

export {
    LOCKOUT_DURATION,
    MAX_LOGIN_ATTEMPTS,
    IP_BLACKLIST_DURATION,
    client,
    cache,
    verificationCodeHelpers,
    loginAttemptHelpers,
    deviceHelpers
};
