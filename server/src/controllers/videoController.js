const { validateGetListVideos } = require('../validators/videoValidator');
const videoService = require('../services/videoService');
const { sendResponse, handleError } = require('../utils/responseHandler');
const logger = require('../utils/logger');

exports.getListVideos = async (req, res, next) => {
    try {
        const { error, value } = validateGetListVideos(req.body);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const {
            user_id,
            in_campaign,
            campaign_id,
            latitude,
            longitude,
            last_id,
            index,
            count
        } = value;

        const result = await videoService.getListVideos({
            userId: user_id || req.user.uid,
            inCampaign: in_campaign,
            campaignId: campaign_id,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
            lastId: last_id,
            index: parseInt(index || '0'),
            count: parseInt(count || '20')
        });

        sendResponse(res, '1000', {
            posts: result.posts,
            new_items: result.newItems.toString(),
            last_id: result.lastId,
            in_campaign: in_campaign || '0',
            campaign_id: campaign_id || ''
        });
    } catch (error) {
        logger.error('Error in getListVideos controller:', error);
        handleError(error, req, res, next);
    }
};

