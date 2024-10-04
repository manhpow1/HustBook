const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const postController = require('../controllers/postController');

router.post('/', upload.array('images', 4), postController.createPost);
router.get('/:id', postController.getPost);
router.put('/:id', upload.array('images', 4), postController.updatePost);
router.delete('/:id', postController.deletePost);
router.post('/:id/like', postController.likePost);
router.post('/:id/unlike', postController.unlikePost);
router.post('/:id/comment', postController.addComment);
router.get('/:id/comments', postController.getPostComments);
router.get('/user/:userId', postController.getUserPosts);

module.exports = router;