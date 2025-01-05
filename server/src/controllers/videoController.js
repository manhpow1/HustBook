import videoValidator from '../validators/videoValidator.js';
import videoService from '../services/videoService.js';
import { sendResponse } from '../utils/responseHandler.js';
import { createError } from '../utils/customError.js';

class VideoController {
    async getListVideos(req, res, next) {
        try {
            const { error, value } = videoValidator.validateGetListVideos(req.body);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const {
                userId,
                lastId,
                index,
                count,
            } = value;

            const result = await videoService.getListVideos({
                userId: userId || req.user.userId,
                lastId: lastId,
                index: parseInt(index || '0'),
                count: parseInt(count || '20'),
            });

            sendResponse(res, '1000', {
                posts: result.posts,
                new_items: result.newItems.toString(),
                lastId: result.lastId,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new VideoController();
