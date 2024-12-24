require('dotenv').config();
const logger = require('./src/utils/logger');
const app = require('./src/app');
const http = require('http');
const { initSocketIO, closeSocketServer } = require('./src/socket');
const { initializeFirebase, getFirebaseServices } = require('./src/config/firebase');
const AuditLogModel = require('./src/models/auditLogModel');

async function startServer() {
    try {
        // Validate critical environment variables
        validateEnvVars();

        // Initialize Firebase before starting the server
        await initializeFirebase();
        logger.info('Firebase initialized successfully');

        // Retrieve Firebase services
        const { db, auth } = getFirebaseServices();

        // Initialize models with Firebase services
        const auditLogModel = new AuditLogModel(db);

        // Attach models to app locals for accessibility in routes/controllers
        app.locals.auditLogModel = auditLogModel;

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize Socket.IO with server and Firebase services
        await initSocketIO(server, { db, auth, auditLogModel });

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });

        // Handle graceful shutdown signals
        process.on('SIGTERM', () => gracefulShutdown(server));
        process.on('SIGINT', () => gracefulShutdown(server));
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

/**
 * Validates that critical environment variables are set
 */
function validateEnvVars() {
    const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'NODE_ENV',
        'CORS_ORIGIN',
        'REDIS_URL',
        'LOG_LEVEL',
        'FIREBASE_SERVICE_ACCOUNT', // Include necessary Firebase vars
    ];

    const missingVars = requiredVars.filter((key) => !process.env[key]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    logger.info('Environment variables validated');
}

/**
 * Handles graceful shutdown of the server
 * @param {http.Server} server 
 */
function gracefulShutdown(server) {
    logger.info('Received shutdown signal. Starting graceful shutdown...');

    // Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed');

        // Close Socket.IO connections
        closeSocketServer();

        // Allow active connections to complete within 30 seconds
        setTimeout(() => {
            logger.info('Completed pending connections. Shutting down...');
            process.exit(0);
        }, 30000); // 30-second grace period
    });

    // Force shutdown if graceful shutdown exceeds time limit
    setTimeout(() => {
        logger.error('Forcefully shutting down due to timeout');
        process.exit(1);
    }, 50000); // Additional 20 seconds before force shutdown
}

// Start the server
startServer();