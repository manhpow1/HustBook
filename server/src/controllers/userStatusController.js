const { sendResponse } = require('../utils/responseHandler');
const { createError } = require('../utils/customError');
const { validateCheckUserStatus } = require('../validators/userStatusValidator');
const userStatusService = require('../services/userStatusService');

class UserStatusController {
    async checkUserStatus(req, res, next) {
        try {
            const { error } = validateCheckUserStatus(req.body);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            // req.user is set by authenticateToken middleware
            const userId = req.user.uid;

            const data = await userStatusService.getUserStatus(userId);

            sendResponse(res, '1000', data);
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new UserStatusController();