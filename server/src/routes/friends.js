const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const friendController = require('../controllers/friendController');

router.post('/get_user_friends', authenticateToken, friendController.getUserFriends);
router.post('/set_request_friend', authenticateToken, friendController.setRequestFriend);
router.get('/get_requested_friends', authenticateToken, friendController.getRequestedFriends);
router.post('/set_accept_friend', authenticateToken, friendController.setAcceptFriend);
router.get('/get_list_suggested_friends', authenticateToken, friendController.getListSuggestedFriends);

module.exports = router;