import dotenv from 'dotenv';
import logger from './src/utils/logger';
import app from './src/app';
import http from 'http';
import { initSocketIO } from './src/socket';
import { initializeFirebase } from './src/config/firebase';

dotenv.config();

async function startServer() {
    try {
        const { db } = await initializeFirebase();
        const { default: AuditLogModel } = await import('./src/models/auditLogModel');
        const auditLog = new AuditLogModel(db);
        app.locals.auditLog = auditLog;

        const server = http.createServer(app);
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

// Start the server
startServer();