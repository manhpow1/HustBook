import { initializeFirebase } from '../config/firebase.js';
import logger from '../utils/logger.js';

class AuditLogModel {
    constructor(db) {
        this.db = db;
    }

    async ensureAuditLogsRef() {
        if (!this.auditLogsRef) {
            if (!this.db) {
                logger.error('Firestore is not initialized. Reinitializing...');
                const firebase = await initializeFirebase();
                this.db = firebase.db;
            }
            this.auditLogsRef = this.db.collection('auditLogs');
        }
        return this.auditLogsRef;
    }

    async logAction(userId, targetUserId, action) {
        try {
            const auditLogsRef = await this.ensureAuditLogsRef();
            await auditLogsRef.add({
                userId,
                targetUserId,
                action,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.error('Failed to log audit action:', error);
            throw new Error('Failed to log audit action.');
        }
    }
}

export default AuditLogModel;
