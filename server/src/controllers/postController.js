const postService = require('../services/postService');
const {
    validateCreatePost,
    validateUpdatePost,
    validateComment,
    validateLike,
    validateGetPost,
    validateGetPostComments,
    validateGetUserPosts
} = require('../validators/postValidator');
const { runTransaction } = require('../config/database');

const createPost = async (req, res) => {
    try {
        const { error } = validateCreatePost(req.body);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
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
        console.error("Create post error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const getPost = async (req, res) => {
    try {
        const { error } = validateGetPost(req.params);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
        }

        const { id } = req.params;

        const post = await postService.getPost(id);

        if (!post) {
            return res.status(404).json({ code: "9992", message: "Post is not existed" });
        }

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: post
        });
    } catch (error) {
        console.error("Get post error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const updatePost = async (req, res) => {
    try {
        const { error } = validateUpdatePost(req.body);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
        }

        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.uid;
        const images = req.files ? req.files.map(file => file.path) : [];

        const updatedPost = await postService.updatePost(id, userId, content, images);

        if (!updatedPost) {
            return res.status(404).json({ code: "9992", message: "Post is not existed" });
        }

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: updatedPost
        });
    } catch (error) {
        console.error("Update post error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;

        await postService.deletePost(id);

        res.status(200).json({
            code: "1000",
            message: "OK"
        });
    } catch (error) {
        console.error("Delete post error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
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
        console.error("Like post error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const unlikePost = async (req, res) => {
    try {
        const { error } = validateLike(req.body);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
        }

        const { id } = req.params;
        const { userId } = req.body;

        await postService.unlikePost(id, userId);

        res.status(200).json({
            code: "1000",
            message: "OK"
        });
    } catch (error) {
        console.error("Unlike post error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const addComment = async (req, res) => {
    try {
        const { error } = validateComment(req.body);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
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
        console.error("Add comment error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const getPostComments = async (req, res) => {
    try {
        const { error } = validateGetPostComments(req.query);
        if (error) {
            return res.status(400).json({ code: "1002", message: error.details[0].message });
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
        console.error("Get post comments error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
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
        console.error("Get user posts error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
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