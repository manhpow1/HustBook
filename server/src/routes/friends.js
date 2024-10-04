const express = require('express');
const router = express.Router();

router.get('/get_user_friends', (req, res) => {
  // Implementation for getting user's friends
});

router.post('/set_request_friend', (req, res) => {
  // Implementation for sending friend request
});

router.get('/get_requested_friends', (req, res) => {
  // Implementation for getting friend requests
});

router.post('/set_accept_friend', (req, res) => {
  // Implementation for accepting friend request
});

router.get('/get_list_suggested_friends', (req, res) => {
  // Implementation for getting suggested friends
});

module.exports = router;