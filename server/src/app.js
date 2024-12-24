const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger.js');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const searchRoutes = require('./routes/search');
const chatRoutes = require('./routes/chat');
const videoRoutes = require('./routes/video');
const notificationRoutes = require('./routes/notifications');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }); // Auth routes
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }); // General routes

const { handleError } = require('./utils/responseHandler');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(helmet());
app.set('trust proxy', 1);
app.use(morgan('dev'));
app.use(apiLimiter);

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/video', videoRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Error handling middleware
app.use(handleError);

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', {
        promise,
        reason: reason instanceof Error ? reason.stack : reason
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Starting graceful shutdown...');
    // Give time for existing requests to complete
    setTimeout(() => {
        process.exit(0);
    }, 30000); // 30 second grace period
});

module.exports = app;
