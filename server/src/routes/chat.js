const express = require('express');
const router = express.Router();

router.get('/get_conversation/:id', (req, res) => {
  // Implementation for getting a conversation
});

router.delete('/delete_message/:id', (req, res) => {
  // Implementation for deleting a message
});

router.get('/get_list_conversation', (req, res) => {
  // Implementation for getting list of conversations
});

router.delete('/delete_conversation/:id', (req, res) => {
  // Implementation for deleting a conversation
});

router.post('/set_read_message', (req, res) => {
  // Implementation for marking a message as read
});

module.exports = router;