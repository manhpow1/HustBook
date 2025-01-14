import jwt from 'jsonwebtoken';
import { getDocument, collections } from '../config/database.js';
import { createError } from '../utils/customError.js';
import redis from '../utils/redis.js';
import config from 'config';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const { cache } = redis;

// Common security headers
//const securityHeaders = {
//    'X-Content-Type-Options': 'nosniff',
//    'X-Frame-Options': 'DENY',
//    'X-XSS-Protection': '1; mode=block',
//    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
//    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
//    'Referrer-Policy': 'strict-origin-when-cross-origin',
//   'X-CSRF-Token': null
//};

// Generate CSRF token
//const generateCsrfToken = () => {
//    return crypto.randomBytes(32).toString('hex');
//};

// Store CSRF tokens with short expiry
//const csrfTokens = new Map();

const authenticateToken = async (req, res, next) => {
    try {
        // Add security headers
//        Object.entries(securityHeaders).forEach(([header, value]) => {
//            if (value !== null && header !== 'X-CSRF-Token') {
//                res.setHeader(header, value);
//            }
//        });

//        // Special handling for CSRF token endpoint
//        if (req.path === '/api/auth/csrf-token' && req.method === 'GET') {
//            const newToken = generateCsrfToken();
//            csrfTokens.set(newToken, Date.now() + 300000); // 5 minutes expiry
//            res.json({ csrfToken: newToken });
//            return;
//        }

//        // For sensitive operations, verify CSRF token
//        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
//            const requestToken = req.headers['x-csrf-token'];
//            const tokenExpiry = csrfTokens.get(requestToken);
//            
//            if (!requestToken || !tokenExpiry || Date.now() > tokenExpiry) {
//                csrfTokens.delete(requestToken); // Clean up expired token
//                throw createError('9998', 'Invalid or expired CSRF token');
//            }
//            
           // Token is valid, clean it up as it's single-use
//            csrfTokens.delete(requestToken);
//        }

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

            const { userId, tokenVersion, exp, tokenFamily } = decoded;
            
            // Check if token is approaching expiration
            const currentTime = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = exp - currentTime;
            const REFRESH_THRESHOLD = 300; // 5 minutes
            
            // If token is close to expiring but not yet expired, generate a new one
            if (timeUntilExpiry > 0 && timeUntilExpiry < REFRESH_THRESHOLD) {
                const newToken = jwt.sign(
                    { userId, tokenVersion, tokenFamily },
                    config.get('jwt.secret'),
                    { expiresIn: '1h' }
                );
                res.set('X-New-Token', newToken);
            }

            // Rate limiting check from Redis
            const requestCount = await cache.incr(`auth:${userId}:requests`);
            await cache.expire(`auth:${userId}:requests`, 90); // Expire after 60 seconds

            if (requestCount > 10000) { // 100 requests per minute limit
                throw createError('1009', 'Too many requests');
            }

            // Fetch user data from cache or database with timeout
            let user = await Promise.race([
                cache.get(`user:${userId}`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Cache timeout')), 5000))
            ]).catch(async () => {
                // Fallback to database if cache fails or times out
                return await getDocument(collections.users, userId);
            });

            if (!user) {
                user = await getDocument(collections.users, userId);
                if (!user) {
                    throw createError('9995', 'User not found');
                }
                // Update cache with shorter TTL if we had to fall back to DB
                await cache.set(`user:${userId}`, user, 1800); // Cache for 30 minutes
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
                userId,
                // Only include necessary fields
                isAdmin: user.isAdmin || false,
                tokenVersion: user.tokenVersion
            };

            // Log successful authentication
            logger.info(`User ${userId} authenticated successfully`);

            next();
        } catch (jwtError) {
            // Handle specific JWT errors
            if (jwtError.name === 'TokenExpiredError') {
                const decoded = jwt.decode(token);
                if (decoded) {
                    const expiredAt = new Date(decoded.exp * 1000);
                    const now = new Date();
                    const GRACE_PERIOD = 60 * 1000; // 1 minute grace period
                    
                    if (now.getTime() - expiredAt.getTime() < GRACE_PERIOD) {
                        // Token expired very recently, allow one final request
                        req.tokenNeedsRefresh = true;
                        return next();
                    }
                }
                throw createError('9998', 'Token has expired. Please log in again.');
            } else if (jwtError.name === 'JsonWebTokenError') {
                throw createError('9998', 'Invalid token format');
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

export { authenticateToken, requireAdmin };
