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
 *     summary: Authenticate user and get access token
 *     tags: [Auth]
 *     requestBody:
 *       description: User credentials for authentication
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, password, deviceId]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^0[1-9][0-9]{8}$'
 *                 example: "0123456789"
 *                 description: Must be a valid 10-digit phone number starting with 0
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: "Password123!"
 *                 description: Must meet password complexity requirements
 *               deviceId:
 *                 type: string
 *                 example: "device-12345"
 *                 description: Unique identifier for the device
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
 *                   enum: ['1000']
 *                   example: "1000"
 *                   description: Success code
 *                 message:
 *                   type: string
 *                   example: "OK"
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                       description: Unique identifier for the user
 *                     userName:
 *                       type: string
 *                       description: User's display name
 *                     phoneNumber:
 *                       type: string
 *                       description: User's phone number
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     deviceToken:
 *                       type: string
 *                       description: Token for device authentication
 *                     expiresIn:
 *                       type: integer
 *                       description: Token expiration time in seconds
 *       '400':
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['1002', '1004']
 *                   description: Error code
 *                 message:
 *                   type: string
 *       '401':
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['9995', '9993']
 *                   description: Error code
 *                 message:
 *                   type: string
 *       '429':
 *         description: Too many login attempts
 */
router.post('/login', userController.login);

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     description: Creates a new user account with phone number verification. The user will need to verify their phone number after signup.
 *     requestBody:
 *       description: User registration details
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber, password, uuid, deviceId]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^0[1-9][0-9]{8}$'
 *                 example: "0123456789"
 *                 description: Must be a valid 10-digit phone number starting with 0
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 30
 *                 example: "StrongP@ss123"
 *                 description: |
 *                   Must meet the following requirements:
 *                   - 8-30 characters long
 *                   - At least one uppercase letter
 *                   - At least one lowercase letter
 *                   - At least one number
 *                   - Cannot match phone number
 *                   - Cannot be a common password
 *               uuid:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: Unique device identifier in UUID format
 *               deviceId:
 *                 type: string
 *                 example: "device_123abc"
 *                 description: Unique identifier for the user's device
 *     responses:
 *       '200':
 *         description: Signup successful, verification required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['1000']
 *                   example: "1000"
 *                   description: Success code
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       format: uuid
 *                       description: Unique identifier for the new user
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *                     deviceToken:
 *                       type: string
 *                       description: Token for device authentication
 *                     verifyCode:
 *                       type: string
 *                       description: Verification code (only in non-production)
 *       '400':
 *         description: Validation error or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['1002', '9997']
 *                   description: Error code
 *                 message:
 *                   type: string
 *                   example: "Password does not meet security requirements"
 *       '409':
 *         description: Phone number already registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['9996']
 *                   description: Error code
 *                 message:
 *                   type: string
 *                   example: "Phone number already registered"
 *       '429':
 *         description: Too many signup attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['1009']
 *                   description: Error code
 *                 message:
 *                   type: string
 *                   example: "Too many signup attempts. Please try again later"
 */
router.post('/signup', userController.signup);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Two-step process to reset forgotten password
 *     description: |
 *       This endpoint handles both steps of the password reset process:
 *       
 *       Step 1 - Request verification code:
 *       - Send only phoneNumber to get a verification code
 *       - Code will be sent to the user's phone
 *       - In development, code is returned in response
 *       
 *       Step 2 - Reset password:
 *       - Send phoneNumber, verification code, and new password
 *       - Password must meet complexity requirements
 *       - Previous passwords cannot be reused
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^0[1-9][0-9]{8}$'
 *                 example: "0123456789"
 *                 description: Valid 10-digit phone number starting with 0
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 example: "123456"
 *                 description: 6-digit verification code (required for step 2)
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 maxLength: 30
 *                 example: "NewPass123!"
 *                 description: |
 *                   New password (required for step 2) must:
 *                   - Be 8-30 characters long
 *                   - Include uppercase and lowercase letters
 *                   - Include at least one number
 *                   - Not match previous passwords
 *                   - Not be similar to phone number
 *     responses:
 *       '200':
 *         description: Success response for both steps
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['1000']
 *                   example: "1000"
 *                 message:
 *                   type: string
 *                   example: "Verification code sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     verifyCode:
 *                       type: string
 *                       description: Only returned in development environment
 *                       example: "123456"
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['1002', '9997']
 *                   example: "1002"
 *                 message:
 *                   type: string
 *                   example: "Invalid phone number format"
 *       '404':
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['9995']
 *                   example: "9995"
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       '429':
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['1009']
 *                   example: "1009"
 *                 message:
 *                   type: string
 *                   example: "Too many attempts. Please try again later"
 *       '403':
 *         description: Invalid or expired verification code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   enum: ['9993']
 *                   example: "9993"
 *                 message:
 *                   type: string
 *                   example: "Invalid verification code"
 */
router.post('/forgot-password', userController.forgotPassword);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout the current user and delete the device token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: Device-ID
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the device to logout
 *     responses:
 *       200:
 *         description: Logout successful
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
 *                       example: "Logout successful."
 *       401:
 *         description: Unauthorized or invalid token
 *       500:
 *         description: Server error
 */
router.post('/logout', authenticateToken, userController.logout);

/**
 * @swagger
 * /auth/get_verify_code:
 *   post:
 *     summary: Get verification code
 *     description: Request a verification code to be sent to the provided phone number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^0[1-9][0-9]{8}$'
 *                 example: "0123456789"
 *                 description: Phone number to receive the verification code (10 digits, starting with 0)
 *     responses:
 *       200:
 *         description: Verification code sent successfully
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
 *                       example: "Verification code sent successfully"
 *                     verifyCode:
 *                       type: string
 *                       description: Only returned in development environment
 *                       example: "123456"
 *       400:
 *         description: Invalid phone number
 *       429:
 *         description: Too many requests, please try again later
 *       500:
 *         description: Server error
 */
router.post('/get_verify_code', verifyCodeLimiterMiddleware, userController.getVerifyCode);

/**
 * @swagger
 * /auth/check_verify_code:
 *   post:
 *     summary: Verify phone verification code
 *     description: Verify the code sent to phone number
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *               - code
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 pattern: '^0[1-9][0-9]{8}$'
 *                 example: "0123456789"
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *                 example: "123456"
 *     responses:
 *       200:
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
 *                     verified:
 *                       type: boolean
 *                       example: true
 *                     exists:
 *                       type: boolean
 *                       example: true
 *                     userId:
 *                       type: string
 *                       description: Only returned if account already exists
 *                     token:
 *                       type: string
 *                       description: JWT token if verification successful
 *                     deviceToken:
 *                       type: string
 *                       description: Device token if verification successful
 *                     active:
 *                       type: string
 *                       enum: ["0", "1"]
 *                       description: Status of account
 *       400:
 *         description: Invalid verification code or expired
 *       429:
 *         description: Too many attempts, please request a new code
 *       500:
 *         description: Server error
 */
router.post('/check_verify_code', checkVerifyCodeLimiterMiddleware, userController.checkVerifyCode);

/**
 * @swagger
 * /auth/check:
 *   get:
 *     summary: Check authentication status
 *     description: Verify if the current token is valid and return user information
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         userId:
 *                           type: string
 *                           example: "abc-123-def-456"
 *                         userName:
 *                           type: string
 *                           example: "johndoe"
 *                         phoneNumber:
 *                           type: string
 *                           example: "0123456789"
 *                         avatar:
 *                           type: string
 *                           example: "https://example.com/avatar.jpg"
 *       401:
 *         description: Token is invalid or expired
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/check', authenticateToken, userController.checkAuth);

/**
 * @swagger
 * /auth/change_info_after_signup:
 *   post:
 *     summary: Update user information after signup
 *     description: Allows users to update their username and avatar after signing up
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - userName
 *             properties:
 *               userName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 pattern: '^[a-zA-Z0-9_]+'
 */
router.post('/change_info_after_signup', authenticateToken, profileUpdateLimiter, upload.single('avatar'), userController.changeInfoAfterSignup);

export default router;
