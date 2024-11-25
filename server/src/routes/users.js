const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

router.get('/get_user_info/:id', (req, res) => {
  // Implementation for getting user info
});

router.put('/set_user_info', (req, res) => {
  // Implementation for updating user info
});

router.post('/change_password',authenticateToken, authController.changePassword);

router.post('/set_devtoken', (req, res) => {
  // Implementation for setting device token
});

module.exports = router;