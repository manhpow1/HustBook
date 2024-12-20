/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Endpoints related to user posts
 */
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 },
});
const reportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
});

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Content and images for the post
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "My new post content"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 4
 *     responses:
 *       200:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     postId:
 *                       type: string
 *                       example: "abc123"
 *       400:
 *         description: Validation error
 */
router.post('/', authenticateToken, upload.array('images', 4), postController.createPost);

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the post to retrieve
 *         required: true
 *         schema:
 *           type: string
 *           example: "post123"
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                     userId:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *       404:
 *         description: Post not found
 */
router.get('/:id', authenticateToken, postController.getPost);

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the post to update
 *         required: true
 *         schema:
 *           type: string
 *           example: "post123"
 *     requestBody:
 *       description: Updated content and/or images
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Updated post content"
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 4
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       403:
 *         description: Not authorized to update this post
 *       404:
 *         description: Post not found
 */
router.put('/:id', authenticateToken, upload.array('images', 4), postController.updatePost);

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the post to delete
 *         required: true
 *         schema:
 *           type: string
 *           example: "post123"
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       403:
 *         description: Not authorized to delete this post
 *       404:
 *         description: Post not found
 */
router.delete('/:id', authenticateToken, postController.deletePost);

/**
 * @swagger
 * /posts/{id}/comment:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the post to comment on
 *         required: true
 *         schema:
 *           type: string
 *           example: "post123"
 *     requestBody:
 *       description: Comment content
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Nice post!"
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       404:
 *         description: Post not found
 */
router.post('/:id/comment', authenticateToken, postController.addComment);

/**
 * @swagger
 * /posts/user/{userId}:
 *   get:
 *     summary: Get posts created by a specific user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         description: ID of the user whose posts to retrieve
 *         required: true
 *         schema:
 *           type: string
 *           example: "user123"
 *       - in: query
 *         name: limit
 *         description: Number of posts to return
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: lastVisible
 *         description: Base64 encoded lastVisible id for pagination
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User's posts retrieved successfully
 */
router.get('/user/:userId', authenticateToken, postController.getUserPosts);

/**
 * @swagger
 * /posts/{id}/report-post:
 *   post:
 *     summary: Report a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the post to report
 *         required: true
 *         schema:
 *           type: string
 *           example: "post123"
 *     requestBody:
 *       description: Reason for reporting and additional details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [spam, inappropriateContent, harassment, hateSpeech, violence, other]
 *                 example: "spam"
 *               details:
 *                 type: string
 *                 example: "This post is spamming links."
 *     responses:
 *       200:
 *         description: Report submitted successfully
 *       404:
 *         description: Post not found
 */
router.post('/:id/report-post', authenticateToken, reportLimiter, postController.reportPost);

/**
 * @swagger
 * /posts/{id}/like:
 *   post:
 *     summary: Toggle like status on a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: ID of the post to like/unlike
 *         required: true
 *         schema:
 *           type: string
 *           example: "post123"
 *     responses:
 *       200:
 *         description: Like status updated successfully
 *       404:
 *         description: Post not found
 */
router.post('/:id/like', authenticateToken, postController.toggleLike);

/**
 * @swagger
 * /posts/{id}/comments:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         description: Post ID to fetch comments for
 *         required: true
 *         schema:
 *           type: string
 *           example: "post123"
 *       - in: query
 *         name: limit
 *         description: Number of comments to return
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: lastVisible
 *         description: Base64 encoded lastVisible id for pagination
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *       404:
 *         description: No comments found
 */
router.get('/:id/comments', authenticateToken, postController.getComments);

/**
 * @swagger
 * /posts/get_list_posts:
 *   get:
 *     summary: Get a list of posts with optional filters
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         description: Filter posts by userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: in_campaign
 *         description: Filter by campaign posts (0 or 1)
 *         schema:
 *           type: string
 *           enum: [0, 1]
 *       - in: query
 *         name: campaignId
 *         description: Campaign ID if in_campaign=1
 *         schema:
 *           type: string
 *       - in: query
 *         name: latitude
 *         description: Latitude for location-based filtering
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         description: Longitude for location-based filtering
 *         schema:
 *           type: number
 *       - in: query
 *         name: lastVisible
 *         description: Base64 encoded lastVisible id for pagination
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         description: Number of posts to return
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *       404:
 *         description: No posts found
 */
router.get('/get_list_posts', authenticateToken, postController.getListPosts);

module.exports = router;