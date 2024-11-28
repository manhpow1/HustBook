const redis = require('redis');
const { promisify } = require('util');

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:5173',
});
client.connect().catch(console.error);

const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);

const cache = {
    get: async (key) => {
        const value = await getAsync(key);
        return value ? JSON.parse(value) : null;
    },
    set: async (key, value, expiryInSeconds = 3600) => {
        await setAsync(key, JSON.stringify(value), 'EX', expiryInSeconds);
    },
    del: async (key) => {
        await delAsync(key);
    }
};

module.exports = cache;