const { db } = require('../config/firebase');
const { collections } = require('../config/database');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

class AuditLogModel {
    constructor() {
        this.auditLogsRef = db.collection(collections.auditLogs);
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
            logger.error('Error in AuditLogModel.logAction:', error);
            throw createError('9999', 'Failed to log audit action.');
        }
    }
}

module.exports = new AuditLogModel();