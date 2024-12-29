import { db } from '../config/firebase.js';
import logger from '../utils/logger.js';

class AuditLogModel {
    constructor() {
        if (!db) {
            throw new Error('Firestore is not initialized. Ensure Firebase is initialized before using AuditLogModel.');
        }
        this.auditLogsRef = db.collection('auditLogs');
    }

    async logAction(userId, targetUserId, action) {
        try {
            await this.auditLogsRef.add({
                userId,
                targetUserId,
                action,
                timestamp: new Date().toISOString(),
            });
            logger.info(`Audit action logged: ${action} by user ${userId} on target ${targetUserId}`);
        } catch (error) {
            logger.error('Failed to log audit action:', error);
            throw new Error('Failed to log audit action.');
        }
    }
}

export default AuditLogModel;