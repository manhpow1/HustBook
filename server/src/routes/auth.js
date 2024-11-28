const express = require("express");
const router = express.Router();
const multer = require('multer');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 2 * 1024 * 1024 },
});

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/logout", authenticateToken, authController.logout);
router.post("/get_verify_code", authController.getVerifyCode);
router.post("/check_verify_code", authController.checkVerifyCode);
router.get("/check", authenticateToken, authController.checkAuth);
router.post("/change_info_after_signup", authenticateToken, upload.single('avatar'), authController.changeInfoAfterSignup);
router.post("/refresh-token", authController.refreshToken);

module.exports = router;