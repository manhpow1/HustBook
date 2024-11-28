const { collections, queryDocuments } = require('../config/database');
const PushSettings = require('../models/pushSettings');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');
const { db } = require('../config/firebase');

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

    async updatePushSettings(userId, settings) {
        try {
            const pushSettings = new PushSettings(userId);
            const updatedSettings = await pushSettings.updateSettings(settings);
            return updatedSettings;
        } catch (error) {
            logger.error('Error in updatePushSettings:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async updateSettings(settings) {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(this.settingsRef);
            let existingSettings = {};

            if (doc.exists) {
                existingSettings = doc.data();
            }

            const updatedSettings = {
                ...existingSettings,
                ...settings,
            };

            transaction.set(this.settingsRef, updatedSettings, { merge: true });
        });

        // Return the updated settings
        const updatedDoc = await this.settingsRef.get();
        return updatedDoc.data();
    }
}

module.exports = new NotificationService();