import { sendResponse } from '../utils/responseHandler.js';
import { createError } from '../utils/customError.js';
import validateCheckUserStatus from '../validators/userStatusValidator.js';
import userStatusService from '../services/userStatusService.js';

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

export default new UserStatusController();