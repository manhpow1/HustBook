const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const searchRoutes = require('./routes/search');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }); // Auth routes
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }); // General routes

const { handleError } = require('./utils/responseHandler');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(helmet());
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

// Error handling middleware
app.use(handleError);

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;