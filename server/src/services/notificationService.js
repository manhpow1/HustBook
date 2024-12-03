const PushSettings = require('../models/pushSettings');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');
const { db } = require('../config/firebase');

class NotificationService {
    async checkNewItems(lastId, categoryId) {
        try {
            const querySnapshot = await db.collection('posts')
                .where('id', '>', lastId)
                .where('category_id', '==', categoryId)
                .orderBy('id', 'asc')
                .get();

            return querySnapshot.size;
        } catch (error) {
            logger.error('Error in checkNewItems service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getPushSettings(userId) {
        try {
            const pushSettings = new PushSettings(userId);
            const settings = await pushSettings.getSettings();
            return settings;
        } catch (error) {
            logger.error(`Error in getPushSettings service for user ${userId}:`, error);
            throw createError('9999', 'Exception error');
        }
    }

    async updatePushSettings(userId, settings) {
        try {
            const pushSettings = new PushSettings(userId);
            const updatedSettings = await pushSettings.updateSettings(settings);
            return updatedSettings;
        } catch (error) {
            logger.error(`Error in updatePushSettings service for user ${userId}:`, error);
            throw createError('9999', 'Failed to update push settings.');
        }
    }
}

module.exports = new NotificationService();