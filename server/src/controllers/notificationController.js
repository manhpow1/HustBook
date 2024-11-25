const { sendResponse, handleError } = require('../utils/responseHandler');
const { createResponse } = require('../utils/responseHelper');
const { validateToken } = require('../validators/userValidator');
const notificationValidator = require('../validators/notificationValidator');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

class NotificationController {

    async checkNewItem(req, res, next) {
        try {
            const { error, value } = notificationValidator.validateCheckNewItem(req.body);
            if (error) {
                return sendResponse(res, '1002', { message: error.details[0].message });
            }

            const { last_id, category_id } = value;

            const newItemsCount = await notificationService.checkNewItems(last_id, category_id);

            sendResponse(res, '1000', {
                data: {
                    new_items: newItemsCount.toString()
                }
            });
        } catch (error) {
            logger.error('Error in checkNewItem controller:', error);
            handleError(error, req, res, next);
        }
    };

    async getPushSettings(req, res) {
        try {
            // Validate token from request
            const { token } = req.body;
            const validationResult = validateToken({ token });

            if (validationResult.error) {
                return res.status(400).json(
                    createResponse('1004', 'Invalid token format', null)
                );
            }

            // Get user settings from service
            const settings = await notificationService.getPushSettings(token);

            if (!settings) {
                return res.status(404).json(
                    createResponse('9995', 'User not found or invalid token', null)
                );
            }

            // Return success response with settings
            return res.status(200).json(
                createResponse('1000', 'OK', settings)
            );

        } catch (error) {
            logger.error('Error in getPushSettings:', error);
            return res.status(500).json(
                createResponse('9999', 'Internal server error', null)
            );
        }
    }
}

module.exports = new NotificationController();