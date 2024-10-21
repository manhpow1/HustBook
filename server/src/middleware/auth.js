const jwt = require('jsonwebtoken');
const { getDocument, collections } = require('../config/database');
const { createError } = require('../utils/customError');
const { handleError } = require('../utils/responseHandler');
const cache = require('../utils/redis');
const config = require('config');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const deviceToken = req.headers['x-device-token'];

        // Ensure both authorization and device token are present
        if (!authHeader || !deviceToken) {
            return handleError(createError('9998', 'Missing authorization or device token'), req, res, next);
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT token
        const decoded = jwt.verify(token, config.get('jwt.secret'));

        // Check Redis cache for user data to avoid frequent database calls
        const cacheKey = `user:${decoded.uid}`;
        let user = await cache.get(cacheKey);

        if (!user) {
            // Retrieve user from Firestore if not in cache
            user = await getDocument(collections.users, decoded.uid);
            if (!user) {
                return handleError(createError('9995', 'User not found'), req, res, next);
            }

            // Cache the user data for 1 hour
            await cache.set(cacheKey, user, 3600);
        }

        // Validate the device token
        if (user.deviceToken !== deviceToken) {
            // Invalidate cache and return an error if device token mismatches
            await cache.del(cacheKey);
            return handleError(createError('9998', 'Invalid device token'), req, res, next);
        }

        // Attach user to request object for downstream usage
        req.user = { ...user, uid: decoded.uid };

        // Optional: Implement token rotation to improve security
        if (tokenShouldBeRotated(decoded)) {
            const newToken = jwt.sign({ uid: decoded.uid }, config.get('jwt.secret'), { expiresIn: '1h' });
            res.setHeader('x-new-token', newToken); // Send new token in response header
        }

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return handleError(createError('9996', 'Token expired'), req, res, next);
        } else if (error instanceof jwt.JsonWebTokenError) {
            return handleError(createError('9998', 'Invalid token'), req, res, next);
        } else {
            return handleError(error, req, res, next);
        }
    }
};

const tokenShouldBeRotated = (decoded) => {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const timeLeft = decoded.exp - now; // Token expiration time left
    return timeLeft < 300; // Rotate if less than 5 minutes remain
};

module.exports = { authenticateToken };