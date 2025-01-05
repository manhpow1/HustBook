import Joi from 'joi';

const getListVideosSchema = Joi.object({
    userId: Joi.string().optional(),
    lastId: Joi.string().optional(),
    index: Joi.number().integer().min(0).optional(),
    count: Joi.number().integer().min(1).max(100).optional()
});

const validateGetListVideos = (data) => {
    return getListVideosSchema.validate(data, { convert: true });
};

export default {
    validateGetListVideos,
};