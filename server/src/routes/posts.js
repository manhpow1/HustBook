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
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 4 // Maximum 4 files
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
 *     description: Create a new post with optional images
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 description: Post content text
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 4
 *                 description: Image files (JPG, PNG, GIF only, max 5MB each)
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
 *                       example: "post_123abc"
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File size too large
 */
router.post('/', authenticateToken, upload.array('images', 4), postController.createPost);

/**
 * @swagger
 * /posts/get_list_posts:
 *   get:
 *     summary: Get list of posts
 *     description: Retrieve a paginated list of posts with optional filters
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter posts by user ID
 *       - in: query
 *         name: lastVisible
 *         schema:
 *           type: string
 *         description: Last post ID for pagination (Base64 encoded)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of posts to return
 *     responses:
 *       200:
 *         description: List of posts retrieved successfully
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           postId:
 *                             type: string
 *                           content:
 *                             type: string
 *                           images:
 *                             type: array
 *                             items:
 *                               type: string
 *                           created:
 *                             type: string
 *                             format: date-time
 *                           likes:
 *                             type: integer
 *                           comments:
 *                             type: integer
 *                           isLiked:
 *                             type: string
 *                             enum: ["0", "1"]
 *                           author:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                               userName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                     lastVisible:
 *                       type: string
 *                       description: Base64 encoded ID for next page
 *       401:
 *         description: Unauthorized
 */
router.get('/get_list_posts', authenticateToken, postController.getListPosts);


/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: Get a specific post
 *     description: Retrieve detailed information about a specific post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
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
 *                   $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 */
router.get('/:postId', authenticateToken, postController.getPost);

/**
 * @swagger
 * /posts/{postId}:
 *   patch:
 *     summary: Update a post
 *     description: Update post content and/or images
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               existingImages:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized to update this post
 *       404:
 *         description: Post not found
 */
router.patch('/:postId', authenticateToken, upload.array('images', 4), postController.updatePost);

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: Delete a post
 *     description: Delete a post and all associated data
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
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
 *     description: Create a new comment on a specific post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Comment added successfully
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
 *                     commentId:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         userName:
 *                           type: string
 *                         avatar:
 *                           type: string
 *       400:
 *         description: Invalid comment content
 *       404:
 *         description: Post not found
 */
router.post('/:postId/comment', authenticateToken, postController.addComment);

/**
 * @swagger
 * /posts/user/{userId}:
 *   get:
 *     summary: Get posts by user
 *     description: Retrieve paginated list of posts created by a specific user
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user whose posts to retrieve
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of posts to return
 *       - in: query
 *         name: lastVisible
 *         schema:
 *           type: string
 *         description: Base64 encoded last post ID for pagination
 *     responses:
 *       200:
 *         description: User's posts retrieved successfully
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
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           postId:
 *                             type: string
 *                           content:
 *                             type: string
 *                           images:
 *                             type: array
 *                             items:
 *                               type: string
 *                           created:
 *                             type: string
 *                             format: date-time
 *                           likes:
 *                             type: integer
 *                           comments:
 *                             type: integer
 *                           isLiked:
 *                             type: string
 *                             enum: ["0", "1"]
 *                     lastVisible:
 *                       type: string
 *                       description: Base64 encoded ID for next page
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/user/:userId', authenticateToken, postController.getUserPosts);

/**
 * @swagger
 * /posts/{postId}/report:
 *   post:
 *     summary: Report a post
 *     description: Submit a report for inappropriate content
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [spam, inappropriateContent, harassment, hateSpeech, violence, other]
 *               details:
 *                 type: string
 *                 maxLength: 500
 *                 description: Required when reason is 'other'
 *     responses:
 *       200:
 *         description: Report submitted successfully
 *       400:
 *         description: Invalid report data
 *       429:
 *         description: Too many reports submitted
 */
router.post('/:postId/report', authenticateToken, reportLimiter, postController.reportPost);

/**
 * @swagger
 * /posts/{postId}/like:
 *   post:
 *     summary: Toggle like on a post
 *     description: Like or unlike a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like status updated successfully
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
 *                     liked:
 *                       type: boolean
 *                     likeCount:
 *                       type: integer
 *       404:
 *         description: Post not found
 */
router.post('/:postId/like', authenticateToken, postController.toggleLike);

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: Get post comments
 *     description: Retrieve paginated list of comments for a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of comments to return
 *       - in: query
 *         name: lastVisible
 *         schema:
 *           type: string
 *         description: Last comment ID for pagination
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
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
 *                     comments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           commentId:
 *                             type: string
 *                           content:
 *                             type: string
 *                           created:
 *                             type: string
 *                             format: date-time
 *                           user:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                               userName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                     lastVisible:
 *                       type: string
 *                     totalComments:
 *                       type: integer
 */
router.get('/:postId/comments', authenticateToken, postController.getComments);

export default router;
