/**
 * @swagger
 * tags:
 *   name: User
 *   description: User account and profile management endpoints
 */
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import userController from '../controllers/userController';
import userStatusController from '../controllers/userStatusController';
import { setBlockLimiter } from '../middleware/rateLimiter';
const router = Router();
/**
 * @swagger
 * /user/get_user_info/{id}:
 *   get:
 *     summary: Get user information by ID
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *                     id:
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
router.get('/get_user_info/:id?', authenticateToken, userController.getUserInfo);

/**
 * @swagger
 * /user/set_user_info:
 *   put:
 *     summary: Update user information
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Fields to update. If no fields provided, returns current user info.
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               cover_image:
 *                 type: string
 *               link:
 *                 type: string
 *     responses:
 *       200:
 *         description: User info updated or retrieved
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
 *                     avatar:
 *                       type: string
 *                     cover_image:
 *                       type: string
 *                     link:
 *                       type: string
 *                     city:
 *                       type: string
 *                     country:
 *                       type: string
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 */
router.put('/set_user_info', authenticateToken, userController.setUserInfo);

/**
 * @swagger
 * /user/change_password:
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
 * /user/set_block:
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
 * /user/status:
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
 *                         id:
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