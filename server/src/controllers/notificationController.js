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

            const { last_id, category_id } = value;

            const newItemsCount = await notificationService.checkNewItems(last_id, category_id);

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
}

module.exports = new NotificationController();