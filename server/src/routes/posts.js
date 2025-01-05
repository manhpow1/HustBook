/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Endpoints related to user posts
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import postController from '../controllers/postController.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 4
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif)$/)) {
            cb(createError('1004', 'Invalid file type'), false);
            return;
        }
        cb(null, true);
    }
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
 * /posts/{postId}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
 *                     postId:
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


/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         description: ID of the post to retrieve
 *         schema:
 *           type: string
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
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     postId:
 *                       type: string
 *                       description: Post ID
 *                     content:
 *                       type: string
 *                       description: Post content
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Array of image URLs
 *                     author:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                           description: Author's user ID
 *                         userName:
 *                           type: string
 *                           description: Author's username
 *                         avatar:
 *                           type: string
 *                           description: Author's avatar URL
 *                     created:
 *                       type: string
 *                       format: date-time
 *                       description: Post creation timestamp
 *                     likes:
 *                       type: integer
 *                       description: Number of likes
 *                     comments:
 *                       type: integer
 *                       description: Number of comments
 *                     isLiked:
 *                       type: string
 *                       enum: ["0", "1"]
 *                       description: Whether the current user has liked the post
 *       404:
 *         description: Post not found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/:postId', authenticateToken, postController.getPost);

/**
 * @swagger
 * /posts/{postId}:
 *   put:
 *     summary: Update a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
router.put('/:postId', authenticateToken, upload.array('images', 4), postController.updatePost);

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: Delete a post by ID
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
router.delete('/:postId', authenticateToken, postController.deletePost);

/**
 * @swagger
 * /posts/{postId}/comment:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
router.post('/:postId/comment', authenticateToken, postController.addComment);

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
 * /posts/{postId}/report-post:
 *   post:
 *     summary: Report a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
router.post('/:postId/report-post', authenticateToken, reportLimiter, postController.reportPost);

/**
 * @swagger
 * /posts/{postId}/like:
 *   post:
 *     summary: Toggle like status on a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
router.post('/:postId/like', authenticateToken, postController.toggleLike);

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
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
router.get('/:postId/comments', authenticateToken, postController.getComments);

export default router;
