const jwt = require('jsonwebtoken');
const { getDocument, collections } = require('../config/database');
const { createError } = require('../utils/customError');
const cache = require('../utils/redis');
const config = require('config');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Common security headers
const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-CSRF-Token': null
};

// Generate CSRF token
const generateCsrfToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const authenticateToken = async (req, res, next) => {
    try {
        // Generate and set CSRF token
        const csrfToken = generateCsrfToken();
        securityHeaders['X-CSRF-Token'] = csrfToken;

        // Add security headers
        Object.entries(securityHeaders).forEach(([header, value]) => {
            if (value !== null) {
                res.setHeader(header, value);
            }
        });

        // For sensitive operations, verify CSRF token
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            const requestToken = req.headers['x-csrf-token'];
            if (!requestToken || requestToken !== csrfToken) {
                throw createError('9998', 'Invalid CSRF token');
            }
        }

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw createError('9998', 'Missing or invalid authorization header');
        }

        const token = authHeader.slice(7);

        try {
            // Verify JWT token with stricter options
            const decoded = jwt.verify(token, config.get('jwt.secret'), {
                algorithms: ['HS256'], // Only allow HMAC SHA256
                clockTolerance: 30, // Allow 30 seconds clock skew
                ignoreExpiration: false // Ensure token expiration is checked
            });

            const { uid, tokenVersion, exp } = decoded;

            // Additional expiration check
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (exp && currentTimestamp > exp) {
                throw createError('9998', 'Token has expired');
            }

            // Rate limiting check from Redis
            const requestCount = await cache.incr(`auth:${uid}:requests`);
            await cache.expire(`auth:${uid}:requests`, 60); // Expire after 60 seconds

            if (requestCount > 100) { // 100 requests per minute limit
                throw createError('1009', 'Too many requests');
            }

            // Fetch user data from cache or database with timeout
            let user = await Promise.race([
                cache.get(`user:${uid}`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 5000))
            ]).catch(async () => {
                // Fallback to database if cache fails or times out
                return await getDocument(collections.users, uid);
            });

            if (!user) {
                user = await getDocument(collections.users, uid);
                if (!user) {
                    throw createError('9995', 'User not found');
                }
                // Update cache with shorter TTL if we had to fall back to DB
                await cache.set(`user:${uid}`, user, 1800); // Cache for 30 minutes
            }

            // Security checks
            if (user.isBlocked) {
                throw createError('9995', 'Account is blocked');
            }

            if (user.tokenVersion !== tokenVersion) {
                throw createError('9998', 'Token is invalid or expired');
            }

            // Attach user data to request
            req.user = { 
                ...user,
                uid,
                // Only include necessary fields
                isAdmin: user.isAdmin || false,
                tokenVersion: user.tokenVersion
            };

            // Log successful authentication
            logger.info(`User ${uid} authenticated successfully`);

            next();
        } catch (jwtError) {
            // Handle specific JWT errors
            if (jwtError.name === 'TokenExpiredError') {
                throw createError('9998', 'Token has expired');
            } else if (jwtError.name === 'JsonWebTokenError') {
                throw createError('9998', 'Invalid token');
            } else {
                throw jwtError;
            }
        }
    } catch (error) {
        logger.error('Authentication error:', error);
        next(error);
    }
};

// Middleware to check for admin permissions
const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        throw createError('9998', 'Admin access required');
    }
    next();
};

module.exports = { authenticateToken, requireAdmin };
