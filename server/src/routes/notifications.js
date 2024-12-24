/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Endpoints for managing notification settings and retrieving notifications
 */
import { Router } from 'express';
import notificationController from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';
import { pushSettingsLimiter } from '../middleware/rateLimiter';
const router = Router();
/**
 * @swagger
 * /notification/get_push_settings:
 *   get:
 *     summary: Get push notification settings for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push settings retrieved successfully
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
 *                     like_comment:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     from_friends:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     requested_friend:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     suggested_friend:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     birthday:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     video:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     report:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     notification_on:
 *                       type: string
 *                       enum: ["0", "1"]
 */
router.get('/get_push_settings', authenticateToken, notificationController.getPushSettings);

/**
 * @swagger
 * /notification/set_push_settings:
 *   put:
 *     summary: Update push notification settings for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: One or more push settings to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               like_comment:
 *                 type: string
 *                 enum: ["0", "1"]
 *               from_friends:
 *                 type: string
 *                 enum: ["0", "1"]
 *               requested_friend:
 *                 type: string
 *                 enum: ["0", "1"]
 *               suggested_friend:
 *                 type: string
 *                 enum: ["0", "1"]
 *               birthday:
 *                 type: string
 *                 enum: ["0", "1"]
 *               video:
 *                 type: string
 *                 enum: ["0", "1"]
 *               report:
 *                 type: string
 *                 enum: ["0", "1"]
 *               notification_on:
 *                 type: string
 *                 enum: ["0", "1"]
 *     responses:
 *       200:
 *         description: Push settings updated successfully
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
 *                     like_comment:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     from_friends:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     requested_friend:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     suggested_friend:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     birthday:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     video:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     report:
 *                       type: string
 *                       enum: ["0", "1"]
 *                     notification_on:
 *                       type: string
 *                       enum: ["0", "1"]
 *       400:
 *         description: Validation error
 */
router.put('/set_push_settings', authenticateToken, pushSettingsLimiter, notificationController.setPushSettings);

/**
 * @swagger
 * /notification/check_new_item:
 *   post:
 *     summary: Check for new items (e.g., new posts) in a given category after a given ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Parameters to check for new items
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lastId]
 *             properties:
 *               lastId:
 *                 type: string
 *                 example: "post_12345"
 *               categoryId:
 *                 type: string
 *                 enum: ["0", "1", "2", "3"]
 *                 default: "0"
 *     responses:
 *       200:
 *         description: New item count retrieved successfully
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
 *                     new_items:
 *                       type: string
 *                       example: "5"
 *       400:
 *         description: Validation error
 */
router.post('/check_new_item', authenticateToken, notificationController.checkNewItem);

/**
 * @swagger
 * /notification/get_notification:
 *   get:
 *     summary: Get a list of notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: index
 *         description: Starting index for pagination
 *         required: true
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: count
 *         description: Number of notifications to retrieve
 *         required: true
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           objectId:
 *                             type: string
 *                           title:
 *                             type: string
 *                           notificationId:
 *                             type: string
 *                           created:
 *                             type: string
 *                             format: date-time
 *                           avatar:
 *                             type: string
 *                           group:
 *                             type: string
 *                             example: "0"
 *                           read:
 *                             type: string
 *                             enum: ["0", "1"]
 *                     badge:
 *                       type: string
 *                       example: "2"
 *                     last_update:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       404:
 *         description: No data or end of list data
 */
router.get('/get_notification', authenticateToken, notificationController.getNotifications);

/**
 * @swagger
 * /notification/{notificationId}/read:
 *   patch:
 *     summary: Mark a specific notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         description: The ID of the notification to mark as read
 *         required: true
 *         schema:
 *           type: string
 *           example: "notif_12345"
 *     requestBody:
 *       description: Request body for setting a notification to read
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notificationId]
 *             properties:
 *               notificationId:
 *                 type: string
 *                 example: "notif_12345"
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
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
 *                     Version:
 *                       type: object
 *                       properties:
 *                         badge:
 *                           type: string
 *                           example: "1"
 *                         last_update:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error
 *       404:
 *         description: Notification not found
 */
router.patch('/:notificationId/read', authenticateToken, notificationController.setReadNotification);

export default router;