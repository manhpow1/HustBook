const postService = require('../services/postService');
const { validateCreatePost, validateUpdatePost, validateComment, validateLike, validateGetPost, validateGetPostComments, validateGetUserPosts } = require('../validators/postValidator');
const { runTransaction } = require('../config/database');
const { sendResponse, handleError } = require('../utils/responseHandler');
const logger = require('../utils/logger');
const cache = require('../utils/redis');

const createPost = async (req, res, next) => {
    try {
        const { error } = validateCreatePost(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { content } = req.body;
        const userId = req.user.uid;
        const images = req.files ? req.files.map(file => file.path) : [];

        const postId = await postService.createPost(userId, content, images);

        sendResponse(res, '1000', { postId });
    } catch (error) {
        logger.error("Create post error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const getPost = async (req, res, next) => {
    try {
        const { error } = validateGetPost(req.params);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { id } = req.params;

        const cacheKey = `post:${id}`;
        const cachedPost = await cache.get(cacheKey);

        if (cachedPost) {
            return sendResponse(res, '1000', cachedPost);
        }

        const post = await postService.getPost(id);

        if (!post) {
            return sendResponse(res, '9992');
        }

        await cache.set(cacheKey, post);
        sendResponse(res, '1000', post);
    } catch (error) {
        logger.error("Get post error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const updatePost = async (req, res, next) => {
    try {
        const { error } = validateUpdatePost(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.uid;
        const images = req.files ? req.files.map(file => file.path) : [];

        const updatedPost = await postService.updatePost(id, userId, content, images);

        if (!updatedPost) {
            return sendResponse(res, '9992');
        }

        const cacheKey = `post:${id}`;
        await cache.del(cacheKey);

        sendResponse(res, '1000', updatedPost);
    } catch (error) {
        logger.error("Update post error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const deletePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        const post = await postService.getPost(id);
        if (!post) {
            return sendResponse(res, '9992');
        }

        if (post.userId !== userId) {
            return sendResponse(res, '1009');
        }

        await postService.deletePost(id);

        const cacheKey = `post:${id}`;
        await cache.del(cacheKey);

        sendResponse(res, '1000');
    } catch (error) {
        logger.error("Delete post error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const likePost = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        await runTransaction(async (transaction) => {
            await postService.likePost(id, userId, transaction);
        });

        const cacheKey = `post:${id}`;
        await cache.del(cacheKey);

        sendResponse(res, '1000');
    } catch (error) {
        logger.error("Like post error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const unlikePost = async (req, res, next) => {
    try {
        const { error } = validateLike(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { id } = req.params;
        const userId = req.user.uid;

        await postService.unlikePost(id, userId);

        const cacheKey = `post:${id}`;
        await cache.del(cacheKey);

        sendResponse(res, '1000');
    } catch (error) {
        logger.error("Unlike post error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const addComment = async (req, res, next) => {
    try {
        const { error } = validateComment(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.uid;

        const commentId = await postService.addComment(id, userId, content);

        const cacheKey = `post:${id}`;
        await cache.del(cacheKey);

        sendResponse(res, '1000', { commentId });
    } catch (error) {
        logger.error("Add comment error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const getPostComments = async (req, res, next) => {
    try {
        const { error } = validateGetPostComments(req.query);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { id } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const comments = await postService.getPostComments(id, page, limit);

        sendResponse(res, '1000', comments);
    } catch (error) {
        logger.error("Get post comments error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const getUserPosts = async (req, res, next) => {
    try {
        const { error } = validateGetUserPosts(req.params, req.query);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const posts = await postService.getUserPosts(userId, page, limit);

        sendResponse(res, '1000', posts);
    } catch (error) {
        logger.error("Get user posts error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

module.exports = {
    createPost,
    getPost,
    updatePost,
    deletePost,
    likePost,
    unlikePost,
    addComment,
    getPostComments,
    getUserPosts
};