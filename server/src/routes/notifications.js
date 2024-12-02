const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController.js');
const { authenticateToken } = require('../middleware/auth');

router.get('/get_push_settings', authenticateToken, notificationController.getPushSettings);
router.put('/set_push_settings', authenticateToken, notificationController.updatePushSettings);
router.post('/check_new_item', authenticateToken, notificationController.checkNewItem);
router.get('/get_notification', authenticateToken, notificationController.getNotifications);
router.post('/set_read_notification', authenticateToken, notificationController.markAllAsRead);

module.exports = router;