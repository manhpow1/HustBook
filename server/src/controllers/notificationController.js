const { sendResponse, handleError } = require('../utils/responseHandler');
const notificationValidator = require('../validators/notificationValidator');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const checkNewItem = async (req, res, next) => {
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

module.exports = { 
    checkNewItem 
};