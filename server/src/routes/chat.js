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
 *     summary: Delete a message
 *     description: Delete a specific message in a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the conversation
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the message to delete
 *       - in: query
 *         name: partnerId
 *         schema:
 *           type: string
 *         description: ID of the recipient user (replaces conversationId)
 *     responses:
 *       200:
 *         description: Successfully deleted message
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
 *         description: Invalid information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Message or conversation not found
 *       500:
 *         description: Server error
 */
router.delete('/conversations/:conversationId/messages/:messageId', authenticateToken, chatController.deleteMessage);

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: Get list of conversations
 *     description: Get list of all conversations of the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: index
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Starting index
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of conversations to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved list of conversations
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
 *                           conversationId:
 *                             type: string
 *                       example: "2"
 *       401:
 *         description: Not authenticated or invalid token
 *       500:
 *         description: Server error
 */
router.get('/conversations', authenticateToken, chatController.getListConversation);

/**
 * @swagger
 *   post:
 *     summary: Create a new conversation
 *     description: Create a new conversation with another user
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
 *                 description: ID of the user you want to start a conversation with
 *     responses:
 *       200:
 *         description: Conversation created successfully
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
 *                       example: "conv_123abc"
 *       400:
 *         description: Invalid information
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

router.post('/conversations', authenticateToken, chatController.createConversation);

/**
 * @swagger
 * /chat/conversations/{conversationId}/messages:
 *   get:
 *     summary: Get conversation messages
 *     description: Get messages of a specific conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the conversation
 *       - in: query
 *         name: index
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Starting position
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of messages to retrieve
 *       - in: query
 *         name: lastMessageId
 *         schema:
 *           type: string
 *         description: ID of the last retrieved message (for pagination)
 *     responses:
 *       200:
 *         description: Got messages successfully
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
 *                           messageId:
 *                             type: string
 *                           message:
 *                             type: string
 *                           created:
 *                             type: string
 *                             format: date-time
 *                           unread:
 *                             type: string
 *                             enum: ["0", "1"]
 *                           sender:
 *                             type: object
 *                             properties:
 *                               userId:
 *                                 type: string
 *                               userName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           isBlocked:
 *                             type: string
 *                             enum: ["0", "1"]
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         hasMore:
 *                           type: boolean
 *                         lastMessageId:
 *                           type: string
 *       400:
 *         description: Invalid information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No permission to access the conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.get('/conversations/:conversationId/messages', authenticateToken, chatController.getConversationMessages);

/**
 * @swagger
 * /chat/conversations/{conversationId}/messages/read:
 *   patch:
 *     summary: Mark messages as read
 *     description: Mark all messages in a conversation as read
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Marked messages as read successfully
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
 *                     updated_count:
 *                       type: integer
 *                       example: 5
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           updated_count:
 *                             type: integer
 *                             example: 5
 *       400:
 *         description: Invalid conversation ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No permission to access the conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.patch('/conversations/:conversationId/messages/read', authenticateToken, chatController.setReadMessage);

/**
 * @swagger
 * /chat/conversations/{conversationId}:
 *   delete:
 *     summary: Delete conversation
 *     description: Delete entire conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the conversation to delete
 *       - in: query
 *         name: partnerId
 *         schema:
 *           type: string
 *         description: ID of the message recipient (alternative to conversationId)
 *     responses:
 *       200:
 *         description: Deleted conversation successfully
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
 *         description: Invalid information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: No permission to delete the conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Server error
 */
router.delete('/conversations/:conversationId', authenticateToken, chatController.deleteConversation);

export default router;
