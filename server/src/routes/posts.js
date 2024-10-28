const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 },
});
const reportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Max 3 reports per 15 minutes per user
});

router.post('/', authenticateToken, upload.array('images', 4), postController.createPost);
router.get('/:id', authenticateToken, postController.getPost);
router.put('/:id', authenticateToken, upload.array('images', 4), postController.updatePost);
router.delete('/:id', authenticateToken, postController.deletePost);
router.post('/:id/comment', authenticateToken, postController.addComment);
router.get('/user/:userId', authenticateToken, postController.getUserPosts);
router.post('/:id/report-post', authenticateToken, reportLimiter, postController.reportPost);
router.post('/:id/like', authenticateToken, postController.toggleLike);
router.get('/:id/comments', authenticateToken, postController.getComments);
router.get('/get_list_posts', authenticateToken, postController.getListPosts);

module.exports = router;