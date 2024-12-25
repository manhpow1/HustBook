import Joi from 'joi';

const getListVideosSchema = Joi.object({
    userId: Joi.string().optional(),
    in_campaign: Joi.string().valid('0', '1').optional(),
    campaignId: Joi.string().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    lastId: Joi.string().optional(),
    index: Joi.number().integer().min(0).optional(),
    count: Joi.number().integer().min(1).max(100).optional()
}).and('latitude', 'longitude');

const validateGetListVideos = (data) => {
    return getListVideosSchema.validate(data, { convert: true });
};

export default {
    validateGetListVideos,
};