const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 2 * 1024 * 1024 },
});

router.post('/login', userController.login);
router.post('/signup', userController.signup);
router.post('/logout', authenticateToken, userController.logout);
router.post('/get_verify_code', userController.getVerifyCode);
router.post('/check_verify_code', userController.checkVerifyCode);
router.get('/check', authenticateToken, userController.checkAuth);
router.post('/change_info_after_signup', authenticateToken, upload.single('avatar'), userController.changeInfoAfterSignup);
router.post('/refresh-token', userController.refreshToken);

module.exports = router;