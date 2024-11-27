const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController.js');
const { authenticateToken } = require('../middleware/auth');

router.get('/push-settings', authenticateToken, notificationController.getPushSettings);
router.put('/set_push_settings', authenticateToken, notificationController.updatePushSettings);
router.post('/check_new_item', authenticateToken, notificationController.checkNewItem);
router.get('/get_notification', (req, res) => {
  // Implementation for getting notifications
});
router.post('/set_read_notification', (req, res) => {
  // Implementation for marking a notification as read
});

module.exports = router;