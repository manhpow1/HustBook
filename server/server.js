require('dotenv').config();
const logger = require('./src/utils/logger');
const app = require('./src/app');
const http = require('http');
const { initSocketIO } = require('./src/socket');
const { initializeFirebase } = require('./src/config/firebase');

async function startServer() {
    try {
        const { db } = await initializeFirebase();
        const AuditLogModel = require('./src/models/auditLogModel');
        const auditLog = new AuditLogModel(db);
        app.locals.auditLog = auditLog; // Lưu instance vào app.locals

        const server = http.createServer(app);
        await initSocketIO(server);

        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();