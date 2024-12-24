require('dotenv').config();
const logger = require('./src/utils/logger');
const app = require('./src/app');
const http = require('http');
const { initSocketIO, closeSocketServer } = require('./src/socket');
const { initializeFirebase } = require('./src/config/firebase');

async function startServer() {
    try {
        // Khởi tạo Firebase trước
        await initializeFirebase();
        logger.info('Firebase initialized successfully');

        // Tạo HTTP server
        const server = http.createServer(app);

        // Khởi tạo Socket.IO
        await initSocketIO(server);

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });

        process.on('SIGTERM', () => gracefulShutdown(server));
        process.on('SIGINT', () => gracefulShutdown(server));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

function gracefulShutdown(server) {
    logger.info('Received shutdown signal');

    // Close HTTP server first (stop accepting new connections)
    server.close(() => {
        logger.info('HTTP server closed');

        // Close Socket.IO connections
        closeSocketServer();

        // Give existing connections time to complete
        setTimeout(() => {
            logger.info('Shutting down process');
            process.exit(0);
        }, 30000); // 30 second grace period
    });

    // Force shutdown if graceful shutdown fails
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 50000); // Additional 20 seconds before force shutdown
}

startServer().catch(err => {
    logger.error('Failed to start server:', err);
    process.exit(1);
});
