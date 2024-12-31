import { sendResponse } from '../utils/responseHandler.js';
import userStatusService from '../services/userStatusService.js';

class UserStatusController {
    async checkUserStatus(req, res, next) {
        try {

            const userId = req.user.uid;

            const data = await userStatusService.getUserStatus(userId);

            sendResponse(res, '1000', data);
        } catch (err) {
            next(err);
        }
    }
}

export default new UserStatusController();