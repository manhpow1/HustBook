require('dotenv').config();
const logger = require('./src/utils/logger');
const app = require('./src/app');
const http = require('http');
const { initSocketIO, closeSocketServer } = require('./src/socket');
const { initializeFirebase, getFirebaseServices } = require('./src/config/firebase');
const AuditLogModel = require('./src/models/auditLogModel'); // Import the model

async function startServer() {
    try {
        // Validate critical environment variables
        validateEnvVars();

        // Initialize Firebase before starting the server
        await initializeFirebase();
        logger.info('Firebase initialized successfully');

        // Retrieve Firebase services
        const { db, auth } = getFirebaseServices();

        // Initialize models with db
        const auditLogModel = new AuditLogModel(db);
        // Initialize other models similarly if needed
        // const userModel = new UserModel(db);
        // ...

        // Create HTTP server
        const server = http.createServer(app);

        // Initialize Socket.IO with server and db (if needed)
        await initSocketIO(server, { db, auth, auditLogModel }); // Pass dependencies as needed

        // Attach models to app locals for accessibility in routes/controllers
        app.locals.auditLogModel = auditLogModel;
        // app.locals.userModel = userModel;
        // ...

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });

        // Handle graceful shutdown
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
        'FIREBASE_SERVICE_ACCOUNT' // Include all necessary vars
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
    logger.info('Received shutdown signal');

    // Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed');

        // Close Socket.IO connections
        closeSocketServer();

        // Give existing connections time to complete
        setTimeout(() => {
            logger.info('Shutting down process');
            process.exit(0);
        }, 30000); // 30-second grace period
    });

    // Force shutdown if graceful shutdown fails
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 50000); // Additional 20 seconds before force shutdown
}

startServer();