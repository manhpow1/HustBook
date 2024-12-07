const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const userController = require('../controllers/userController');
const userStatusController = require('../controllers/userStatusController');
const { setBlockLimiter } = require('../middleware/rateLimiter');

router.get('/get_user_info/:id?', authenticateToken, userController.getUserInfo);
router.put('/set_user_info', authenticateToken, userController.setUserInfo);
router.put('/change_password',authenticateToken, userController.changePassword);
router.put('/set_block', authenticateToken, setBlockLimiter, userController.setBlock);
router.get('/status', authenticateToken, userStatusController.checkUserStatus);

module.exports = router;