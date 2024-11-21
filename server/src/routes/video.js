const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const videoController = require('../controllers/videoController');

router.post('/get_list_videos', authenticateToken, videoController.getListVideos);

module.exports = router;

