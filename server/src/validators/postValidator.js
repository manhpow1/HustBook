const Joi = require('joi');

const acceptableReasons = [
    'spam',
    'inappropriateContent',
    'harassment',
    'hateSpeech',
    'violence',
    'other',
];

const createPostSchema = Joi.object({
    content: Joi.string().required().max(1000),
    images: Joi.array().items(Joi.string().uri()).max(4),
});

const updatePostSchema = Joi.object({
    content: Joi.string().required().max(1000),
    images: Joi.array().items(Joi.string().uri()).max(4)
});

const commentSchema = Joi.object({
    content: Joi.string().required().max(500)
});

const likeSchema = Joi.object({
    id: Joi.string().required()
});

const getPostSchema = Joi.object({
    id: Joi.string().required()
});

const getListPostsSchema = Joi.object({
    user_id: Joi.string().optional(),
    in_campaign: Joi.string().valid('0', '1').optional(),
    campaign_id: Joi.string().optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    last_id: Joi.string().optional(),
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required()
});

const getPostCommentsSchema = Joi.object({
    index: Joi.number().integer().min(0).default(0).optional(),  // Pagination index (default: 0)
    count: Joi.number().integer().min(1).max(100).default(10).optional(),  // Number of comments (default: 10)
});

const getUserPostsSchema = Joi.object({
    userId: Joi.string().required(),
    lastPostId: Joi.string(),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

const reportPostSchema = Joi.object({
    reason: Joi.string()
        .valid(...acceptableReasons)
        .required(),
    details: Joi.string()
        .max(500)
        .when('reason', {
            is: 'other',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
});

const validateCreatePost = (data) => {
    return createPostSchema.validate(data);
};

const validateUpdatePost = (data) => {
    return updatePostSchema.validate(data);
};

const validateComment = (data) => {
    return commentSchema.validate(data);
};

const validateLike = (params) => {
    return likeSchema.validate(params);
};

const validateGetPost = (data) => {
    return getPostSchema.validate(data);
};

const validateGetPostComments = (query) => {
    return getPostCommentsSchema.validate(query, { abortEarly: false });
};

const validateGetUserPosts = (data) => {
    return getUserPostsSchema.validate(data);
};

const validateReportPost = (data) => {
    return reportPostSchema.validate(data);
};

const validateGetListPosts = (data) => {
    return getListPostsSchema.validate(data, { convert: true });
};

module.exports = {
    validateCreatePost,
    validateUpdatePost,
    validateComment,
    validateLike,
    validateGetPost,
    validateGetPostComments,
    validateGetUserPosts,
    validateReportPost,
    validateGetListPosts,
};