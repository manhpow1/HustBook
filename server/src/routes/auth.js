/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user account management
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { verifyCodeLimiter, checkVerifyCodeLimiter } = require('../middleware/rateLimiter');
const rateLimit = require('express-rate-limit');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/avatars/');
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = file.originalname.split('.').pop();
        cb(null, `avatar-${uniqueSuffix}.${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
    }

    // List of allowed extensions
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];
    const ext = file.originalname.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(ext)) {
        return cb(new Error('Invalid file type. Only jpg, jpeg, png, and gif are allowed'), false);
    }

    cb(null, true);
};

const profileUpdateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 updates per window
    message: 'Too many profile updates, please try again later',
    keyGenerator: (req) => `${req.user.uid}:profile_update`
});

const upload = multer({
    storage,
    limits: {
        fileSize: 4 * 1024 * 1024 // 4MB limit
    },
    fileFilter
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       description: User credentials
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, password, deviceId]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "0123456789"
 *               password:
 *                 type: string
 *                 example: "Password1"
 *               deviceId:
 *                 type: string
 *                 example: "device-12345"
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 message:
 *                   type: string
 *                   example: "OK"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     deviceToken:
 *                       type: string
 *       '400':
 *         description: Invalid parameters or login failed
 */
router.post('/login', userController.login);

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: User signup
 *     tags: [Auth]
 *     requestBody:
 *       description: User phone number and password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, password, uuid]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "0123456789"
 *               password:
 *                 type: string
 *                 example: "Password1"
 *               uuid:
 *                 type: string
 *                 example: "unique-device-identifier"
 *     responses:
 *       '200':
 *         description: Signup successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     token:
 *                       type: string
 *                     deviceToken:
 *                       type: string
 *       '400':
 *         description: Bad request or user already exists
 */
router.post('/signup', userController.signup);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 message:
 *                   type: string
 *                   example: "Logout successful."
 */
router.post('/logout', authenticateToken, userController.logout);

/**
 * @swagger
 * /auth/get_verify_code:
 *   post:
 *     summary: Get a verification code for a given phone number
 *     tags: [Auth]
 *     requestBody:
 *       description: Phone number to get a verification code for
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phonenumber]
 *             properties:
 *               phonenumber:
 *                 type: string
 *                 example: "0123456789"
 *     responses:
 *       '200':
 *         description: Verification code sent/generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *       '400':
 *         description: Invalid phone number or request
 */
router.post('/get_verify_code', verifyCodeLimiter, userController.getVerifyCode);

/**
 * @swagger
 * /auth/check_verify_code:
 *   post:
 *     summary: Check a verification code for a given phone number
 *     tags: [Auth]
 *     requestBody:
 *       description: Phone number and verification code
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phonenumber, code]
 *             properties:
 *               phonenumber:
 *                 type: string
 *                 example: "0123456789"
 *               code:
 *                 type: string
 *                 length: 6
 *                 example: "123456"
 *     responses:
 *       '200':
 *         description: Verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     token:
 *                       type: string
 *                     deviceToken:
 *                       type: string
 *                     active:
 *                       type: string
 *                       example: "1"
 *       '400':
 *         description: Invalid verification code
 */
router.post('/check_verify_code', checkVerifyCodeLimiter, userController.checkVerifyCode);

/**
 * @swagger
 * /auth/check:
 *   get:
 *     summary: Check authentication status
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: User is authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isAuthenticated:
 *                       type: boolean
 *                       example: true
 */
router.get('/check', authenticateToken, userController.checkAuth);

/**
 * @swagger
 * /auth/change_info_after_signup:
 *   post:
 *     summary: Change user info right after signup (e.g., set username, avatar)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: New user info
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 example: "new_user_name"
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: User info updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     created:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     isBlocked:
 *                       type: string
 *                     online:
 *                       type: string
 */
router.post('/change_info_after_signup', authenticateToken, profileUpdateLimiter, upload.single('avatar'), userController.changeInfoAfterSignup);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       description: Refresh token
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOi..."
 *     responses:
 *       '200':
 *         description: New access token and refresh token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       '400':
 *         description: Invalid refresh token
 */
router.post('/refresh-token', userController.refreshToken);

/**
 * @swagger
 * /auth/change_password:
 *   post:
 *     summary: Change current user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Current and new password
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, new_password]
 *             properties:
 *               password:
 *                 type: string
 *                 example: "CurrentPass1"
 *               new_password:
 *                 type: string
 *                 example: "NewPass1"
 *     responses:
 *       '200':
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   example: "1000"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Password changed successfully."
 *       '400':
 *         description: Password not changed due to validation or mismatch
 */
router.post('/change_password', authenticateToken, userController.changePassword);

module.exports = router;
