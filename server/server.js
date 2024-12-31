import dotenv from 'dotenv';
import http from 'http';
import logger from './src/utils/logger.js';
import createApp from './src/app.js';
import { initializeFirebase } from './src/config/firebase.js';
import { initSocketIO } from './src/socket.js';

dotenv.config();
let server;

async function startServer() {
    try {
        const { db } = await initializeFirebase();
        const { default: AuditLogModel } = await import('./src/models/auditLogModel.js');
        const auditLog = new AuditLogModel(db);
        const app = createApp();
        app.locals.auditLog = auditLog;
        server = http.createServer(app);
        await initSocketIO(server);
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

function gracefulShutdown(signalOrEvent) {
    logger.info(`${signalOrEvent} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed.');
        // Perform any additional cleanup:
        //  e.g. close DB connections, flush logs, etc.
        // await db.close(); // if needed
        process.exit(0);
    });

    // In case server.close() hangs, force shutdown after a timeout
    setTimeout(() => {
        logger.error('Forcing shutdown after 30s grace period.');
        process.exit(1);
    }, 30000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { promise, reason });
    gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

startServer();