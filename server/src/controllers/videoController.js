const videoValidator = require('../validators/videoValidator');
const videoService = require('../services/videoService');
const { sendResponse } = require('../utils/responseHandler');
const { createError } = require('../utils/customError');

class VideoController {
    async getListVideos(req, res, next) {
        try {
            const { error, value } = videoValidator.validateGetListVideos(req.body);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const {
                userId,
                in_campaign,
                campaignId,
                latitude,
                longitude,
                lastId,
                index,
                count,
            } = value;

            const result = await videoService.getListVideos({
                userId: userId || req.user.uid,
                inCampaign: in_campaign,
                campaignId: campaignId,
                latitude: latitude ? parseFloat(latitude) : undefined,
                longitude: longitude ? parseFloat(longitude) : undefined,
                lastId: lastId,
                index: parseInt(index || '0'),
                count: parseInt(count || '20'),
            });

            sendResponse(res, '1000', {
                posts: result.posts,
                new_items: result.newItems.toString(),
                lastId: result.lastId,
                in_campaign: in_campaign || '0',
                campaignId: campaignId || '',
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new VideoController();
