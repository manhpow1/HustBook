const { sendResponse } = require('../utils/responseHandler');
const notificationValidator = require('../validators/notificationValidator');
const notificationService = require('../services/notificationService');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

class NotificationController {
    async checkNewItem(req, res, next) {
        try {
            const { error, value } = notificationValidator.validateCheckNewItem(req.body);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { lastId, categoryId } = value;

            const newItemsCount = await notificationService.checkNewItems(lastId, categoryId);

            sendResponse(res, '1000', {
                new_items: newItemsCount.toString(),
            });
        } catch (error) {
            logger.error('Error in checkNewItem controller:', error);
            next(error);
        }
    }

    async getPushSettings(req, res, next) {
        try {
            const userId = req.user.uid;

            const settings = await notificationService.getPushSettings(userId);

            sendResponse(res, '1000', settings);
        } catch (error) {
            logger.error('Error in getPushSettings controller:', error);
            next(error);
        }
    }

    async setPushSettings(req, res, next) {
        try {
            const { error, value } = notificationValidator.validateSetPushSettings(req.body);
            if (error) {
                // Aggregate all validation error messages
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1003', messages);
            }
            const userId = req.user.uid;
            const settings = value;

            const updatedSettings = await notificationService.updatePushSettings(userId, settings);
            return sendResponse(res, '1000', updatedSettings);
        } catch (err) {
            logger.error(`Error in setPushSettings controller for user ${req.user.uid}:`, err);
            next(err);
        }
    }

    async getNotifications(req, res, next) {
        try {
            const { error, value } = notificationValidator.validateGetNotifications(req.query);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }
            const { index, count } = value;
            const userId = req.user.uid; // set by authenticateToken middleware
            const { notifications, badge, last_update } = await notificationService.getNotifications(userId, index, count);
            if (notifications.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }
            const responseData = {
                data: notifications,
                badge,
                last_update
            };
            sendResponse(res, '1000', responseData);
        } catch (err) {
            logger.error('Error in getNotifications controller:', err);
            next(err);
        }
    }

    async setReadNotification(req, res, next) {
        try {
            const { error, value } = notificationValidator.validateSetReadNotification(req.body);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { notificationId } = value;
            const userId = req.user.uid; // From authenticateToken

            const { badge, last_update } = await notificationService.setReadNotification(userId, notificationId);

            sendResponse(res, '1000', { Version: { badge, last_update } });
        } catch (err) {
            logger.error('Error in setReadNotification controller:', err);
            next(err);
        }
    }
}

module.exports = new NotificationController();