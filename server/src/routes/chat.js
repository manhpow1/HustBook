/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat and conversation-related endpoints
 */
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import chatController from '../controllers/chatController.js';
const router = express.Router();

/**
 * @swagger
 * /chat/conversations/{conversationId}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message from a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         description: The ID of the conversation
 *         required: true
 *         schema:
 *           type: string
 *           example: "conv_abc123"
 *       - in: path
 *         name: messageId
 *         description: The ID of the message to delete
 *         required: true
 *         schema:
 *           type: string
 *           example: "msg_xyz789"
 *       - in: query
 *         name: partnerId
 *         description: The partner's user ID (alternative to conversationId)
 *         schema:
 *           type: string
 *         required: false
 *     responses:
 *       200:
 *         description: Message deleted successfully
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
 *                           deleted:
 *                             type: boolean
 *                             example: true
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized to delete this message
 *       404:
 *         description: Message or conversation not found
 */
router.delete('/conversations/:conversationId/messages/:messageId', authenticateToken, chatController.deleteMessage);

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: Get a list of conversations for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: index
 *         description: Starting index for pagination
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: count
 *         description: Number of conversations to retrieve
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
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
 *                           id:
 *                             type: string
 *                           Partner:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               userName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           LastMessage:
 *                             type: object
 *                             properties:
 *                               message:
 *                                 type: string
 *                               created:
 *                                 type: string
 *                               unread:
 *                                 type: string
 *                                 enum: ["0", "1"]
 *                     numNewMessage:
 *                       type: string
 *                       example: "2"
 *       400:
 *         description: Validation error
 *       404:
 *         description: No conversations found
 */
router.get('/conversations', authenticateToken, chatController.getListConversation);

/**
 * @swagger
 * /chat/conversations:
 *   post:
 *     summary: Create a new conversation or get existing one
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - partnerId
 *             properties:
 *               partnerId:
 *                 type: string
 *                 description: The ID of the user to start conversation with
 *     responses:
 *       200:
 *         description: Conversation created or existing one returned
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
 *                     conversationId:
 *                       type: string
 */
router.post('/conversations', authenticateToken, chatController.createConversation);

/**
 * @swagger
 * /chat/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages from a specific conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         description: Conversation ID
 *         required: true
 *         schema:
 *           type: string
 *           example: "conv_abc123"
 *       - in: query
 *         name: partnerId
 *         description: The partner's user ID (alternative if no conversationId provided)
 *         schema:
 *           type: string
 *       - in: query
 *         name: index
 *         description: Starting index for messages
 *         required: true
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: count
 *         description: Number of messages to retrieve
 *         required: true
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
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
 *                           message:
 *                             type: string
 *                           messageId:
 *                             type: string
 *                           unread:
 *                             type: string
 *                             enum: ["0", "1"]
 *                           created:
 *                             type: string
 *                             format: date-time
 *                           sender:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               userName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           isBlocked:
 *                             type: string
 *                             enum: ["0", "1"]
 *       400:
 *         description: Validation error
 *       404:
 *         description: Conversation or messages not found
 */
router.get('/conversations/:conversationId/messages', authenticateToken, chatController.getConversationMessages);

/**
 * @swagger
 * /chat/conversations/{conversationId}/messages/read:
 *   patch:
 *     summary: Mark messages in a conversation as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         description: Conversation ID
 *         required: true
 *         schema:
 *           type: string
 *           example: "conv_abc123"
 *       - in: query
 *         name: partnerId
 *         description: Partner user ID (alternative if no conversationId)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
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
 *                           updated_count:
 *                             type: integer
 *                             example: 5
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized to modify conversation
 *       404:
 *         description: Conversation not found
 */
router.patch('/conversations/:conversationId/messages/read', authenticateToken, chatController.setReadMessage);

/**
 * @swagger
 * /chat/conversations/{conversationId}:
 *   delete:
 *     summary: Delete a conversation for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         description: The conversation ID
 *         required: true
 *         schema:
 *           type: string
 *           example: "conv_abc123"
 *       - in: query
 *         name: partnerId
 *         description: The partner's user ID (alternative if no conversationId)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
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
 *                           deleted:
 *                             type: boolean
 *                             example: true
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Conversation not found
 */
router.delete('/conversations/:conversationId', authenticateToken, chatController.deleteConversation);

export default router;
