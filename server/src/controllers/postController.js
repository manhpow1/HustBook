const postService = require('../services/postService');
const { validateCreatePost, validateUpdatePost, validateComment, validateLike, validateGetPost, validateGetPostComments, validateGetUserPosts, validateReportPost, } = require('../validators/postValidator');
const { runTransaction } = require('../config/database');
const { sendResponse, handleError } = require('../utils/responseHandler');
const logger = require('../utils/logger');
const cache = require('../utils/redis');

const createPost = async (req, res, next) => {
    try {
        const { error } = validateCreatePost(req.body);
        if (error) return sendResponse(res, '1002');

        const { content } = req.body;
        const userId = req.user.uid;
        const images = req.files ? req.files.map(file => file.path) : [];

        const postId = await postService.createPost(userId, content, images);
        sendResponse(res, '1000', { postId });
    } catch (error) {
        logger.error('Create post error:', error);
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

        if (!post) return sendResponse(res, '9992');
        if (post.userId !== userId) return sendResponse(res, '1009');
        if (post.status === 'reported') return sendResponse(res, '1012');

        await postService.deletePost(id);
        const cacheKey = `post:${id}`;
        await cache.del(cacheKey);
        sendResponse(res, '1000');
    } catch (error) {
        logger.error("Delete post error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const addComment = async (req, res, next) => {
    try {
        const { error } = validateComment(req.body);  // Validate input
        if (error) return sendResponse(res, '1002');  // Parameter validation failed

        const { id } = req.params;  // Post ID
        const { content } = req.body;
        const userId = req.user.uid;  // User ID from authenticated token

        // Add comment and update the post's comment count
        await postService.addComment(id, userId, content);

        // Clear the cache to refresh the comments
        const cacheKey = `post:${id}`;
        await cache.del(cacheKey);

        // Fetch the latest comments with pagination
        const { index = 0, count = 10 } = req.query;
        const comments = await postService.getComments(id, parseInt(index), parseInt(count));

        if (!comments.length) return sendResponse(res, '9994');  // No data or end of list

        // Format the comments for the response
        const formattedComments = comments.map(comment => ({
            id: comment.id,
            comment: comment.content,
            created: comment.createdAt,
            poster: {
                id: comment.user.id,
                name: comment.user.name,
                avatar: comment.user.avatar,
            },
            is_blocked: comment.isBlocked || false,
        }));

        // Send the success response with the latest comments
        sendResponse(res, '1000', formattedComments);
    } catch (error) {
        logger.error("Add comment error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const getComments = async (req, res, next) => {
    try {
        const { error } = validateGetPostComments(req.query);  // Validate query parameters
        if (error) {
            return sendResponse(res, '1002', { message: 'Invalid parameters.', errors: error.details });
        }

        const { id } = req.params;  // Extract post ID from route params
        const { index = 0, count = 10 } = req.query;

        const comments = await postService.getComments(id, parseInt(index), parseInt(count));
        if (!comments || comments.length === 0) {
            return sendResponse(res, '9994');  // No data or end of list
        }

        const formattedComments = comments.map(comment => ({
            id: comment.id,
            comment: comment.content,
            created: comment.createdAt,
            poster: {
                id: comment.user.id,
                name: comment.user.name,
                avatar: comment.user.avatar,
            },
            is_blocked: comment.isBlocked || false,
        }));

        sendResponse(res, '1000', formattedComments);  // Success response
    } catch (error) {
        handleError(error, req, res, next);  // Handle errors gracefully
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

const reportPost = async (req, res, next) => {
    try {
        const { error } = validateReportPost(req.body);
        if (error) {
            return sendResponse(res, '1002'); // Parameter is not enough
        }

        const { id } = req.params;
        const { reason, details } = req.body;
        const userId = req.user.uid;

        const post = await postService.getPost(id);

        if (!post) {
            return sendResponse(res, '9992'); // Post is not existed
        }

        // Proceed to report the post
        await postService.reportPost(id, userId, reason, details);

        sendResponse(res, '1000', { message: 'Report submitted successfully. The post is under review.' });
    } catch (error) {
        logger.error('Report post error:', { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const toggleLike = async (req, res, next) => {
    try {
        const { error } = validateLike(req.params);
        if (error) return sendResponse(res, '1002');

        const userId = req.user.uid;
        const { id: postId } = req.params;

        await runTransaction(async (transaction) => {
            const isLiked = await postService.checkUserLike(postId, userId);
            if (isLiked) {
                await postService.unlikePost(postId, userId, transaction);
            } else {
                await postService.likePost(postId, userId, transaction);
            }
        });

        sendResponse(res, '1000', { message: 'Like status updated successfully' });
    } catch (error) {
        handleError(error, req, res, next);
    }
};

module.exports = {
    createPost,
    getPost,
    updatePost,
    deletePost,
    addComment,
    getComments,
    getUserPosts,
    reportPost,
    toggleLike,
};