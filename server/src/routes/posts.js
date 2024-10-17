const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const postController = require('../controllers/postController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, upload.array('images', 4), postController.createPost);
router.get('/:id', authenticateToken, postController.getPost);
router.put('/:id', authenticateToken, upload.array('images', 4), postController.updatePost);
router.delete('/:id', authenticateToken, postController.deletePost);
router.post('/:id/like', authenticateToken, postController.likePost);
router.post('/:id/unlike', authenticateToken, postController.unlikePost);
router.post('/:id/comment', authenticateToken, postController.addComment);
router.get('/:id/comments', authenticateToken, postController.getPostComments);
router.get('/user/:userId', authenticateToken, postController.getUserPosts);
router.post('/delete-post', authenticateToken, postController.deletePost);
router.post('/:id/report', authenticateToken, postController.reportPost);

module.exports = router;