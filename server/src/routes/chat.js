const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.delete('/conversations/:conversationId/messages/:messageId', authenticateToken, chatController.deleteMessage);
router.get('/conversations', authenticateToken, chatController.getListConversation);
router.get('/conversations/:conversationId/messages', authenticateToken, chatController.getConversation);
router.patch('/conversations/:conversationId/messages/read', authenticateToken, chatController.setReadMessage);
router.delete('/conversations/:conversationId', authenticateToken, chatController.deleteConversation);

module.exports = router;