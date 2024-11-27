const { collections, queryDocuments } = require('../config/database');
const PushSettings = require('../models/pushSettings');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

class NotificationService {
    async checkNewItems(lastId, categoryId) {
        try {
            const query = queryDocuments(collections.posts, (ref) =>
                ref.where('id', '>', lastId)
                    .where('category_id', '==', categoryId)
                    .orderBy('id', 'asc')
            );

            const newItems = await query;
            return newItems.length;
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
            logger.error('Error in getPushSettings service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async updatePushSettings(userId, settingsData) {
        try {
            const pushSettings = new PushSettings(userId);

            const updatedSettings = await pushSettings.updateSettings(settingsData);

            return updatedSettings;
        } catch (error) {
            logger.error('Error in updatePushSettings service:', error);
            throw createError('9999', 'Exception error');
        }
    }
}

module.exports = new NotificationService();