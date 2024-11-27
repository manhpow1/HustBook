const { sendResponse } = require('../utils/responseHandler');
const notificationValidator = require('../validators/notificationValidator');
const notificationService = require('../services/notificationService');
const { createError } = require('../utils/customError');

class NotificationController {
    async checkNewItem(req, res, next) {
        try {
            const { error, value } = notificationValidator.validateCheckNewItem(req.body);
            if (error) {
                throw createError('1002', error.details[0].message);
            }

            const { last_id, category_id } = value;

            const newItemsCount = await notificationService.checkNewItems(last_id, category_id);

            sendResponse(res, '1000', {
                data: {
                    new_items: newItemsCount.toString(),
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getPushSettings(req, res, next) {
        try {
            const userId = req.user.uid;

            const settings = await notificationService.getPushSettings(userId);

            sendResponse(res, '1000', settings);
        } catch (error) {
            next(error);
        }
    }

    async updatePushSettings(req, res, next) {
        try {
            const { error, value } = notificationValidator.validateUpdatePushSettings(req.body);
            if (error) {
                throw createError('1002', error.details[0].message);
            }

            const userId = req.user.uid;

            const updatedSettings = await notificationService.updatePushSettings(userId, value);

            sendResponse(res, '1000', updatedSettings);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new NotificationController();