const express = require('express');
const router = express.Router();
import { authenticateToken } from '../middleware/auth';
import friendController from '../controllers/friendController';

router.post('/get_user_friends', authenticateToken, friendController.getUserFriends);
router.post('/set_request_friend', (req, res) => {
  // Implementation for sending friend request
});
router.get('/get_requested_friends', authenticateToken, friendController.getRequestedFriends);
router.post('/set_accept_friend', authenticateToken, friendController.setAcceptFriend);
router.get('/get_list_suggested_friends', authenticateToken, friendController.getListSuggestedFriends);

module.exports = router;