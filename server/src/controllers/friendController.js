const { validateGetRequestedFriends } = require('../validators/friendValidator');
const friendService = require('../services/friendService');
const { sendResponse, handleError } = require('../utils/responseHandler');
const logger = require('../utils/logger');

const getRequestedFriends = async (req, res, next) => {
    try {
        const { error } = validateGetRequestedFriends(req.query);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { index, count } = req.query;
        const userId = req.user.uid;

        const result = await friendService.getRequestedFriends(userId, parseInt(index), parseInt(count));

        if (result.requests.length === 0) {
            return sendResponse(res, '9994');
        }

        sendResponse(res, '1000', {
            request: result.requests,
            total: result.total
        });
    } catch (error) {
        logger.error('Error in getRequestedFriends controller:', error);
        handleError(error, req, res, next);
    }
};

module.exports = {
    getRequestedFriends
};