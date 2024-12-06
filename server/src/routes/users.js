const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const userController = require('../controllers/userController');
const userStatusController = require('../controllers/userStatusController');
const { setBlockLimiter } = require('../middleware/rateLimiter');

router.get('/get_user_info/:id?', authenticateToken, userController.getUserInfo);
router.put('/set_user_info', (req, res) => {
  // Implementation for updating user info
});
router.post('/change_password',authenticateToken, userController.changePassword);
router.put('/set_block', authenticateToken, setBlockLimiter, userController.setBlock);
router.post('/status', authenticateToken, userStatusController.checkUserStatus);
router.post('/set_devtoken', (req, res) => {
  // Implementation for setting device token
});

module.exports = router;