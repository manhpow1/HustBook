const Joi = require('joi');

const getListVideosSchema = Joi.object({
    user_id: Joi.string().optional(),
    in_campaign: Joi.string().valid('0', '1').optional(),
    campaign_id: Joi.string().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    last_id: Joi.string().optional(),
    index: Joi.number().integer().min(0).optional(),
    count: Joi.number().integer().min(1).max(100).optional()
}).and('latitude', 'longitude');

exports.validateGetListVideos = (data) => {
    return getListVideosSchema.validate(data, { convert: true });
};