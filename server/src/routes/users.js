const express = require('express');
const router = express.Router();

router.get('/get_user_info/:id', (req, res) => {
  // Implementation for getting user info
});

router.put('/set_user_info', (req, res) => {
  // Implementation for updating user info
});

router.put('/change_password', (req, res) => {
  // Implementation for changing password
});

router.post('/set_devtoken', (req, res) => {
  // Implementation for setting device token
});

module.exports = router;