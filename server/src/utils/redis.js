import Redis from 'ioredis';
import logger from './logger.js';

const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

client.on('error', (err) => logger.error('Redis Client Error:', err));
client.on('connect', () => logger.info('Redis Client Connected'));

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
            await client.set(key, JSON.stringify(value), 'EX', expiryInSeconds);
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
    },
    incr: async (key) => {
        try {
            return await client.incr(key);
        } catch (err) {
            logger.error('Redis incr error:', err);
            throw err; // Re-throw the error to handle it at a higher level
        }
    }
};

export default {
    client,
    cache,
};