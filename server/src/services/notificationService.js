const PushSettings = require('../models/pushSettings');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');
const { db } = require('../config/firebase');

class notificationService {
    async checkNewItems(lastId, categoryId) {
        try {
            const querySnapshot = await db.collection('posts')
                .where('id', '>', lastId)
                .where('categoryId', '==', categoryId)
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

    async getNotifications(userId, index, count) {
        try {
            // Query notifications
            const notificationsRef = db.collection(collections.notifications)
                .where('userId', '==', userId)
                .orderBy('created', 'desc')
                .offset(index)
                .limit(count);

            const snapshot = await notificationsRef.get();

            const notifications = snapshot.docs.map(doc => {
                const data = doc.data();
                const createdDate = data.created instanceof Date
                    ? data.created
                    : data.created.toDate();

                return {
                    type: data.type || '',
                    objectId: data.objectId || '',
                    title: data.title || '',
                    notificationId: doc.id,
                    created: createdDate.toISOString(),
                    avatar: data.avatar || '',
                    group: data.group ? data.group.toString() : '0',
                    read: data.read === true ? '1' : '0'
                };
            });

            // Count unread notifications
            const unreadSnapshot = await db.collection(collections.notifications)
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();

            const badge = unreadSnapshot.size.toString();
            const last_update = new Date().toISOString();

            return { notifications, badge, last_update };
        } catch (error) {
            logger.error('Error in getNotifications service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getUnreadNotificationsCount(userId) {
        const snapshot = await db.collection(collections.notifications)
            .where('userId', '==', userId)
            .where('read', '==', false)
            .get();
        return snapshot.size;
    }

    async setReadNotification(userId, notificationId) {
        try {
            const notifRef = db.collection(collections.notifications).doc(notificationId);
            const notifDoc = await notifRef.get();

            if (!notifDoc.exists) {
                throw createError('9992', 'Notification not found.');
            }

            const notifData = notifDoc.data();

            if (notifData.userId !== userId) {
                throw createError('1009', 'Not access');
            }

            // Update the read field
            await notifRef.update({ read: true });

            // Count unread notifications
            const unreadSnapshot = await db.collection(collections.notifications)
                .where('userId', '==', userId)
                .where('read', '==', false)
                .get();

            const badge = unreadSnapshot.size.toString();
            const last_update = new Date().toISOString();

            return { badge, last_update };
        } catch (error) {
            logger.error('Error in setReadNotification:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }
}

module.exports = new notificationService();