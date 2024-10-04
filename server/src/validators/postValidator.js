const Joi = require('joi');

const createPostSchema = Joi.object({
    content: Joi.string().required().max(1000),
    images: Joi.array().items(Joi.string().uri()).max(4)
});

const updatePostSchema = Joi.object({
    content: Joi.string().required().max(1000),
    images: Joi.array().items(Joi.string().uri()).max(4)
});

const commentSchema = Joi.object({
    content: Joi.string().required().max(500)
});

const likeSchema = Joi.object({
    postId: Joi.string().required()
});

const getPostSchema = Joi.object({
    id: Joi.string().required()
});

const getPostCommentsSchema = Joi.object({
    postId: Joi.string().required(),
    lastCommentId: Joi.string(),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

const getUserPostsSchema = Joi.object({
    userId: Joi.string().required(),
    lastPostId: Joi.string(),
    limit: Joi.number().integer().min(1).max(100).default(20)
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

const validateLike = (data) => {
    return likeSchema.validate(data);
};

const validateGetPost = (data) => {
    return getPostSchema.validate(data);
};

const validateGetPostComments = (data) => {
    return getPostCommentsSchema.validate(data);
};

const validateGetUserPosts = (data) => {
    return getUserPostsSchema.validate(data);
};

module.exports = {
    validateCreatePost,
    validateUpdatePost,
    validateComment,
    validateLike,
    validateGetPost,
    validateGetPostComments,
    validateGetUserPosts
};