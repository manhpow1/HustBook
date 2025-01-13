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
 * /users/profile/{userId}:
 *   get:
 *     summary: Get user profile
 *     description: Retrieve detailed profile information for a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: false
 *         description: User ID (if not provided, returns current user's profile)
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         userName:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         coverPhoto:
 *                           type: string
 *                         bio:
 *                           type: string
 *                         address:
 *                           type: string
 *                         city:
 *                           type: string
 *                         country:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         friendsCount:
 *                           type: integer
 *                         postsCount:
 *                           type: integer
 *                         isVerified:
 *                           type: boolean
 *                         lastSeen:
 *                           type: string
 *                           format: date-time
 *                         online:
 *                           type: boolean
 *                         version:
 *                           type: integer
 *       401:
 *         description: Unauthorized - Invalid token
 *       404:
 *         description: User not found
 */
router.get('/profile/:userId?', authenticateToken, userController.getUserInfo);

/**
 * @swagger
 * /users/profile/{userId}:
 *   put:
 *     summary: Update user profile
 *     description: Update user profile information including avatar and cover photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: ^[a-zA-ZÀ-ỹ0-9\s,.-]*$
 *               bio:
 *                 type: string
 *                 maxLength: 200
 *               address:
 *                 type: string
 *                 maxLength: 100
 *               city:
 *                 type: string
 *                 maxLength: 50
 *               country:
 *                 type: string
 *                 maxLength: 50
 *               avatar:
 *                 type: string
 *                 format: binary
 *               coverPhoto:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
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
 *                       example: "Profile updated successfully"
 *                     user:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                         userName:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         version:
 *                           type: integer
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File size too large
 */
router.put('/profile/:userId', authenticateToken, upload.fields([ { name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), userController.setUserInfo );

/**
 * @swagger
 * /users/change_password:
 *   put:
 *     summary: Change user password
 *     description: Change the authenticated user's password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - new_password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password
 *               new_password:
 *                 type: string
 *                 description: New password (must meet strength requirements)
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
 *                       example: "Password changed successfully"
 *       400:
 *         description: Invalid password format or same as old password
 *       401:
 *         description: Current password incorrect
 */
router.put('/change_password', authenticateToken, userController.changePassword);

/**
 * @swagger
 * /users/set_block:
 *   put:
 *     summary: Block or unblock a user
 *     description: Toggle block status for another user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the user to block/unblock
 *               type:
 *                 type: number
 *                 enum: [0, 1]
 *                 description: 0 to block, 1 to unblock
 *     responses:
 *       200:
 *         description: Block status updated successfully
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
 *                       example: "User blocked successfully"
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Cannot block yourself
 *       429:
 *         description: Too many block requests
 */
router.put('/set_block', authenticateToken, setBlockLimiter, userController.setBlock);

/**
 * @swagger
 * /users/status:
 *   get:
 *     summary: Get user status
 *     description: Get current user's status including notifications and messages
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
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
 *                       description: Number of unread notifications
 *                     unread_message:
 *                       type: string
 *                       description: Number of unread messages
 *                     now:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/status', authenticateToken, userStatusController.checkUserStatus);

export default router;
