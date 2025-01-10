/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User account and profile management endpoints
 */
import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import userController from '../controllers/userController.js';
import userStatusController from '../controllers/userStatusController.js';
import { setBlockLimiter } from '../middleware/rateLimiter.js';
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

const router = Router();
/**
 * @swagger
 * /users/get_user_info/{userId}:
 *   get:
 *     summary: Get user information by ID
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         description: The user ID (optional). If not provided, the current user's info is returned.
 *         required: false
 *         schema:
 *           type: string
 *           example: "some-user-id"
 *     responses:
 *       200:
 *         description: User information retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     created:
 *                       type: string
 *                       format: date-time
 *                     description:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     cover_image:
 *                       type: string
 *                     link:
 *                       type: string
 *                     address:
 *                       type: string
 *                     city:
 *                       type: string
 *                     country:
 *                       type: string
 *                     listing:
 *                       type: string
 *                       description: Number of friends
 *                     isFriend:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     online:
 *                       type: string
 *                       enum: ["0", "1"]
 *       400:
 *         description: Validation error or missing parameters
 *       404:
 *         description: User not found
 */
/**
 * @swagger
 * /users/profile/{userId}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         description: The user ID (optional). If not provided, returns current user's profile
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/profile/:userId?', authenticateToken, userController.getUserInfo);

// Legacy endpoint maintained for backward compatibility
// router.get('/get_user_info/:userId?', authenticateToken, userController.getUserInfo);

/**
 * @swagger
 * /users/profile/{userId}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               bio:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string  
 *               country:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *               coverPhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/profile/:userId', authenticateToken, upload.fields([ { name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), userController.setUserInfo );

/**
 * @swagger
 * /users/change_password:
 *   put:
 *     summary: Change the authenticated user's password
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Current and new password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, new_password]
 *             properties:
 *               password:
 *                 type: string
 *                 example: "CurrentPass1"
 *               new_password:
 *                 type: string
 *                 example: "NewPass1"
 *     responses:
 *       200:
 *         description: Password changed successfully
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
 *                     message:
 *                       type: string
 *                       example: "Password changed successfully."
 *       400:
 *         description: Validation error or new password same as current
 *       404:
 *         description: User not found
 */
router.put('/change_password', authenticateToken, userController.changePassword);

/**
 * @swagger
 * /users/set_block:
 *   put:
 *     summary: Block or unblock a user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Specify which user to block/unblock
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, type]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 example: "b3d4f7e4-c111-4d54-b44b-123456789abc"
 *               type:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: 0 to block, 1 to unblock
 *                 example: 0
 *     responses:
 *       200:
 *         description: Block/unblock operation successful
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
 *                     message:
 *                       type: string
 *                       example: "User blocked successfully."
 *       400:
 *         description: Validation error
 *       403:
 *         description: Attempt to block self
 *       404:
 *         description: User not found
 */
router.put('/set_block', authenticateToken, setBlockLimiter, userController.setBlock);

/**
 * @swagger
 * /users/status:
 *   get:
 *     summary: Check the authenticated user's status
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User status retrieved successfully
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
 *                     User:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         active:
 *                           type: string
 *                           enum: ["0", "1"]
 *                     badge:
 *                       type: string
 *                       example: "0"
 *                     unread_message:
 *                       type: string
 *                       example: "0"
 *                     now:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: User not found
 */
router.get('/status', authenticateToken, userStatusController.checkUserStatus);

export default router;
