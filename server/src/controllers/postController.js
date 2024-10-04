const postService = require('../services/postService');

const createPost = async (req, res) => {
    try {
        const { userId, content } = req.body;
        const images = req.files ? req.files.map(file => file.path) : [];

        if (!userId || !content) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

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
        const { id } = req.params;
        const { content } = req.body;
        const images = req.files ? req.files.map(file => file.path) : [];

        if (!content) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

        const updatedPost = await postService.updatePost(id, content, images);

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
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

        await postService.likePost(id, userId);

        res.status(200).json({
            code: "1000",
            message: "OK"
        });
    } catch (error) {
        console.error("Like post error:", error);
        res.status(500).json({ code: "1001", message: "Cannot connect to DB" });
    }
};

const unlikePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

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
        const { id } = req.params;
        const { userId, content } = req.body;

        if (!userId || !content) {
            return res.status(400).json({ code: "1002", message: "Parameter is not enough" });
        }

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