import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpecs from './config/swagger.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import friendRoutes from './routes/friends.js';
import searchRoutes from './routes/search.js';
import chatRoutes from './routes/chat.js';
import videoRoutes from './routes/video.js';
import notificationRoutes from './routes/notifications.js';
import { handleError } from './utils/responseHandler.js';

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });

function createApp() {
    const app = express();

    // Basic middlewares
    app.use(cors({ origin: process.env.CORS_ORIGIN }));
    app.use(express.json());
    app.use(helmet());
    app.set('trust proxy', 1);
    app.use(morgan('dev'));

    // Apply API-wide rate limiter
    app.use(apiLimiter);

    // Routes
    app.use('/api/auth', authRoutes);
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

    return app;
}

export default createApp;
