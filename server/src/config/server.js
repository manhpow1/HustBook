import env from './env.js';
import crypto from 'crypto';

export default {
    port: env.server.port,
    env: env.nodeEnv,
    jwtSecret: env.jwt.secret,
    refreshSecret: env.jwt.refreshSecret,
    jwtExpiration: env.jwt.expiration,
    refreshTokenExpiration: env.jwt.refreshExpiration,
    
    // CORS configuration
    cors: {
        origin: env.server.corsOrigin,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: [
            'Content-Type', 
            'Authorization',
            'X-Requested-With',
            'Accept',
            'X-CSRF-Token'
        ],
        exposedHeaders: ['X-CSRF-Token'],
        credentials: true,
        maxAge: 86400 // 24 hours
    },

    // Security configurations
    security: {
        rateLimiting: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        },
        passwordPolicy: {
            minLength: 8,
            requireNumbers: true,
            requireUppercase: true,
            requireLowercase: true,
            requireSpecialChars: true
        },
        session: {
            name: 'sessionId',
            secret: env.session?.secret || crypto.randomBytes(32).toString('hex'),
            cookie: {
                httpOnly: true,
                secure: env.nodeEnv === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }
    }
};
