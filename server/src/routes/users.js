const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/get_user_info/:id', (req, res) => {
  // Implementation for getting user info
});

router.put('/set_user_info', (req, res) => {
  // Implementation for updating user info
});

router.post('/change_password',authenticateToken, userController.changePassword);
router.put('/set_block', authenticateToken, userController.setBlock);

router.post('/set_devtoken', (req, res) => {
  // Implementation for setting device token
});

module.exports = router;