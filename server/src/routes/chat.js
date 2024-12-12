const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.delete('/conversations/messages/:message_id', authenticateToken, chatController.deleteMessage);
router.get('/get_list_conversation', authenticateToken, chatController.getListConversation);
router.get('/conversations/messages', authenticateToken, chatController.getConversation);
router.patch('/conversations/messages/read', authenticateToken, chatController.setReadMessage);
router.delete('/conversations', authenticateToken, chatController.deleteConversation);

module.exports = router;