const logger = require('../utils/logger');

class AuditLogModel {
    constructor(db) {
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
        } catch (error) {
            logger.error('Failed to log audit action:', error);
            throw new Error('Failed to log audit action.');
        }
    }
}

module.exports = AuditLogModel;