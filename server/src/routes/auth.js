const express = require("express");
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/logout", authenticateToken, authController.logout);
router.post("/get_verify_code", authController.getVerifyCode);
router.post("/check_verify_code", authController.checkVerifyCode);
router.get("/check", authenticateToken, authController.checkAuth);
router.post("/change_info_after_signup", authenticateToken, upload.single('avatar'), authController.changeInfoAfterSignup);

module.exports = router;