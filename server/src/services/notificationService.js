const { collections, queryDocuments } = require('../config/database');
const { getUserFromToken } = require('../utils/authHelper');
const PushSettings = require('../models/pushSettings');
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
            throw error;
        }
    }

    async getPushSettings(token) {
        try {
            // Get user from token
            const userId = await getUserFromToken(token);
            if (!userId) {
                return null;
            }

            // Get user's push settings from database
            const settings = await PushSettings.findOne({ userId });

            // If no settings exist, return default settings
            if (!settings) {
                return {
                    like_comment: "1",
                    from_friends: "1",
                    requested_friend: "1",
                    suggested_friend: "1",
                    birthday: "1",
                    video: "1",
                    report: "1",
                    sound_on: "1",
                    notification_on: "1",
                    vibrant_on: "1",
                    led_on: "1"
                };
            }

            // Return user's settings
            return {
                like_comment: settings.like_comment,
                from_friends: settings.from_friends,
                requested_friend: settings.requested_friend,
                suggested_friend: settings.suggested_friend,
                birthday: settings.birthday,
                video: settings.video,
                report: settings.report,
                sound_on: settings.sound_on,
                notification_on: settings.notification_on,
                vibrant_on: settings.vibrant_on,
                led_on: settings.led_on
            };

        } catch (error) {
            logger.error('Error in getPushSettings service:', error);
            throw error;
        }
    }
}

module.exports = new NotificationService();