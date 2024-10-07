const postService = require('../services/postService');
const {
    validateCreatePost,
    validateUpdatePost,
    validateComment,
    validateLike,
    validateGetPost,
    validateGetPostComments,
    validateGetUserPosts,
    validateDeletePost,
} = require('../validators/postValidator');
const { runTransaction } = require('../config/database');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

const createPost = async (req, res, next) => {
    try {
        const { error } = validateCreatePost(req.body);
        if (error) {
            throw createError('1002');
        }

        const { content } = req.body;
        const userId = req.user.uid;
        const images = req.files ? req.files.map(file => file.path) : [];

        const postId = await postService.createPost(userId, content, images);

        res.status(201).json({
            code: "1000",
            message: "OK",
            data: { postId }
        });
    } catch (error) {
        logger.error("Create post error:", error);
        next(error);
    }
};

const getPost = async (req, res, next) => {
    try {
        const { error } = validateGetPost(req.params);
        if (error) {
            throw createError('1002');
        }

        const { id } = req.params;

        const post = await postService.getPost(id);

        if (!post) {
            throw createError('9992');
        }

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: post
        });
    } catch (error) {
        logger.error("Get post error:", error);
        next(error);
    }
};

const updatePost = async (req, res) => {
    try {
        const { error } = validateUpdatePost(req.body);
        if (error) {
            throw createError('1002');
        }

        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.uid;
        const images = req.files ? req.files.map(file => file.path) : [];

        const updatedPost = await postService.updatePost(id, userId, content, images);

        if (!updatedPost) {
            throw createError('9992');
        }

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: updatedPost
        });
    } catch (error) {
        logger.error("Update post error:", error);
        next(error);
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        // Check if post exists
        const post = await postService.getPost(id);
        if (!post) {
            throw createError('9992');
        }

        // Check if the user has permission to delete the post
        if (post.userId !== userId) {
            throw createError('1009');
        }

        // Delete the post
        await postService.deletePost(id);

        res.status(200).json({
            code: "1000",
            message: "OK"
        });
    } catch (error) {
        logger.error("Delete post error:", error);
        next(error);
    }
};

const likePost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.uid;

        await runTransaction(async (transaction) => {
            const postRef = db.collection(collections.posts).doc(id);
            const post = await transaction.get(postRef);

            if (!post.exists) {
                throw new Error('Post not found');
            }

            transaction.update(postRef, { likes: post.data().likes + 1 });

            const likeRef = db.collection(collections.likes).doc(`${id}_${userId}`);
            transaction.set(likeRef, { userId, postId: id, createdAt: new Date() });
        });

        res.status(200).json({ code: "1000", message: "OK" });
    } catch (error) {
        logger.error("Like post error:", error);
        next(error);
    }
};

const unlikePost = async (req, res) => {
    try {
        const { error } = validateLike(req.body);
        if (error) {
            throw createError('1002');
        }

        const { id } = req.params;
        const { userId } = req.body;

        await postService.unlikePost(id, userId);

        res.status(200).json({
            code: "1000",
            message: "OK"
        });
    } catch (error) {
        logger.error("Unlike post error:", error);
        next(error);
    }
};

const addComment = async (req, res) => {
    try {
        const { error } = validateComment(req.body);
        if (error) {
            throw createError('1002');
        }

        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.uid;

        const commentId = await postService.addComment(id, userId, content);

        res.status(201).json({
            code: "1000",
            message: "OK",
            data: { commentId }
        });
    } catch (error) {
        logger.error("Add comment error:", error);
        next(error);
    }
};

const getPostComments = async (req, res) => {
    try {
        const { error } = validateGetPostComments(req.query);
        if (error) {
            throw createError('1002');
        }

        const { id } = req.params;
        const { lastCommentId, limit } = req.query;

        const comments = await postService.getPostComments(id, lastCommentId, parseInt(limit) || 20);

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: comments
        });
    } catch (error) {
        logger.error("Get post comments error:", error);
        next(error);
    }
};

const getUserPosts = async (req, res) => {
    try {
        const { error } = validateGetUserPosts(req.params, req.query);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
        }

        const { userId } = req.params;
        const { lastPostId, limit } = req.query;

        const posts = await postService.getUserPosts(userId, lastPostId, parseInt(limit) || 20);

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: posts
        });
    } catch (error) {
        logger.error("Get user posts error:", error);
        next(error);
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