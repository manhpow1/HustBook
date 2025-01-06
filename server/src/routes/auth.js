/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user account management
 */

import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import userController from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';
import { verifyCodeLimiterMiddleware, checkVerifyCodeLimiterMiddleware } from '../middleware/rateLimiter.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const MAX_RANDOM_VALUE = 1_000_000_000;

/**
 * @swagger
 * /auth/csrf-token:
 *   get:
 *     summary: Get a new CSRF token
 *     tags: [Auth]
 *     responses:
 *       '200':
 *         description: New CSRF token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 *                   example: "abc123..."
 */
// router.get('/csrf-token', (req, res) => {
//     const token = crypto.randomBytes(32).toString('hex');
//     res.json({ csrfToken: token });
// });

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Chỉ cho phép upload 1 file avatar
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|gif)$/)) {
            cb(createError('1004', 'Invalid file type. Only jpg, jpeg, png, and gif are allowed'), false);
            return;
        }
        cb(null, true);
    }
});

const profileUpdateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 updates per window
    message: 'Too many profile updates, please try again later',
    keyGenerator: (req) => `${req.user.userId}:profile_update`
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
 *                     userId:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     token:
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
 *                     userId:
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
 * /forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request or finalize a password reset
 *     description: 
 *       1. To request a password reset code, provide only the phoneNumber in the body.  
 *       2. To finalize the password reset, provide phoneNumber, code, and newPassword.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+1234567890"
 *               code:
 *                 type: string
 *                 description: "6-digit verification code sent to the user"
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 description: "New password meeting complexity requirements"
 *                 example: "Str0ngP@ssw0rd"
 *     responses:
 *       '200':
 *         description: Password reset code sent or successfully updated password
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
 *                   example: "Password has been reset successfully."
 *                 verificationCode:
 *                   type: string
 *                   description: "Returned for demonstration purposes in non-production environments"
 *                   example: "123456"
 *       '400':
 *         description: Bad request or validation error
 *       '404':
 *         description: User not found
 *       '429':
 *         description: Too many attempts, rate limited
 *       '500':
 *         description: Internal server error
 */
router.post('/forgot-password', userController.forgotPassword);

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
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber:
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
router.post('/get_verify_code', verifyCodeLimiterMiddleware, userController.getVerifyCode);

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
 *             required: [phoneNumber, code]
 *             properties:
 *               phoneNumber:
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
 *                     userId:
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
router.post('/check_verify_code', checkVerifyCodeLimiterMiddleware, userController.checkVerifyCode);

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
 *                     userId:
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

export default router;
