const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

router.delete('/delete_message/:id', (req, res) => {
  // Implementation for deleting a message
});

router.get('/get_list_conversation', authenticateToken, chatController.getListConversation);
router.get('/get_conversation', authenticateToken, chatController.getConversation);

router.delete('/delete_conversation/:id', (req, res) => {
  // Implementation for deleting a conversation
});

router.post('/set_read_message', (req, res) => {
  // Implementation for marking a message as read
});

module.exports = router;