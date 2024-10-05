const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const env = require('./config/env');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const searchRoutes = require('./routes/search');
const chatRoutes = require('./routes/chat');
const notificationRoutes = require('./routes/notifications');

const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({ origin: env.server.corsOrigin }));
app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));
app.use(errorHandler);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;