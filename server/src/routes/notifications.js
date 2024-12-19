const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');
const { pushSettingsLimiter } = require('../middleware/rateLimiter');

router.get('/get_push_settings', authenticateToken, notificationController.getPushSettings);
router.put('/set_push_settings', authenticateToken, pushSettingsLimiter, notificationController.setPushSettings);
router.post('/check_new_item', authenticateToken, notificationController.checkNewItem);
router.get('/get_notification', authenticateToken, notificationController.getNotifications);
router.patch('/:notificationId/read', authenticateToken, notificationController.setReadNotification);

module.exports = router;