const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.delete('/conversations/:conversation_id/messages/:message_id', authenticateToken, chatController.deleteMessage);
router.get('/conversations', authenticateToken, chatController.getListConversation);
router.get('/conversations/:conversation_id/messages', authenticateToken, chatController.getConversation);
router.patch('/conversations/:conversation_id/messages/read', authenticateToken, chatController.setReadMessage);
router.delete('/conversations/:conversation_id', authenticateToken, chatController.deleteConversation);

module.exports = router;