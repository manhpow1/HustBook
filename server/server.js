import dotenv from 'dotenv';
import http from 'http';
import logger from './src/utils/logger.js';
import createApp from './src/app.js';
import { initializeFirebase, db } from './src/config/firebase.js';
import { initSocketIO } from './src/socket.js';

dotenv.config();
let server;

async function startServer() {
    try {
        await initializeFirebase();
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

startServer();