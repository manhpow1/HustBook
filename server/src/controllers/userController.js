import crypto from 'crypto';
import userService from '../services/userService.js';
import userValidator from '../validators/userValidator.js';
import { comparePassword, generateJWT, generateRandomCode, generateDeviceToken, generateTokenFamily } from '../utils/authHelper.js';
import { handleAvatarUpload, handleCoverPhotoUpload } from '../utils/helpers.js';
import { sendResponse } from '../utils/responseHandler.js';
import { createError } from '../utils/customError.js';
import { db } from '../config/firebase.js';
import logger from '../utils/logger.js';
import friendService from '../services/friendService.js';
import postService from '../services/postService.js';

class UserController {
    constructor() {
        this.sessionDuration = 15 * 60; // 15 minutes in seconds
        this.verifyCodeDuration = 5 * 60; // 5 minutes in seconds
        this.signup = this.signup.bind(this);
        this.login = this.login.bind(this);
        this.forgotPassword = this.forgotPassword.bind(this);
        this.VERIFICATION_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
    }

    async checkAuth(req, res, next) {
        try {
            const userId = req.user.userId;
            const user = await userService.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            sendResponse(res, '1000', {
                isAuthenticated: true,
                user: {
                    userId: user.userId,
                    userName: user.userName,
                    phoneNumber: user.phoneNumber,
                    avatar: user.avatar
                }
            });
        } catch (error) {
            logger.error('Check Auth Error:', error);
            next(error);
        }
    }

    async changePassword(req, res, next) {
        try {
            const { error, value } = userValidator.validateChangePassword(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { password, new_password } = value;
            const userId = req.user.userId;

            await userService.updatePassword(req, userId, password, new_password);

            const currentDeviceId = req.get('Device-ID');

            await req.app.locals.auditLog.logAction(userId, null, 'password_change', {
                deviceId: currentDeviceId,
                ip: req.ip,
                timestamp: new Date().toISOString()
            });

            sendResponse(res, '1000', {
                message: 'Password changed successfully.'
            });
        } catch (error) {
            logger.error('Change Password Error:', error);
            next(error);
        }
    }

    async getVerifyCode(req, res, next) {
        try {
            const { error, value } = userValidator.validateGetVerifyCode(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber } = value;
            const verificationCode = generateRandomCode();
            const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes expiration

            // Store verification code in temporary collection
            const verificationRef = db.collection('verificationCodes').doc(phoneNumber);
            await verificationRef.set({
                verifyCode: verificationCode,
                attempts: 0,
                expiresAt: new Date(expirationTime),
                createdAt: new Date()
            });

            logger.info(`Verification code generated for phone number: ${phoneNumber}`);

            sendResponse(res, '1000', {
                message: 'Verification code sent successfully',
                verifyCode: verificationCode,
            });

        } catch (error) {
            logger.error('Get Verify Code Error:', error);
            next(error);
        }
    }

    async signup(req, res, next) {
        try {
            const { error, value } = userValidator.validateSignup(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, password, uuid } = value;
            const existingUser = await userService.getUserByphoneNumber(phoneNumber);
            if (existingUser) {
                if (existingUser.isVerified) {
                    throw createError('9996', 'Phone number already registered');
                } else {
                    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    if (new Date(existingUser.createdAt) < twentyFourHoursAgo) {
                        await userService.deleteUser(existingUser.userId);
                    } else {
                        throw createError('9996', 'Please verify your existing registration');
                    }
                }
            }

            const verificationCode = generateRandomCode();
            const deviceId = req.body.deviceId || crypto.randomUUID();

            const { userId, deviceToken, tokenFamily } = await userService.createUser(
                phoneNumber,
                password,
                uuid,
                verificationCode,
                deviceId,
            );

            const token = generateJWT({
                userId: userId,
                phone: phoneNumber,
                tokenVersion: 0,
                tokenFamily,
                deviceId
            });

            // Sử dụng auditLog từ req.app.locals
            await req.app.locals.auditLog.logAction(userId, null, 'signup', {
                deviceId,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });

            if (process.env.NODE_ENV === 'production') {
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: this.sessionDuration * 1000
                });
            }

            sendResponse(res, '1000', {
                userId: userId,
                token: token,
                deviceToken: deviceToken,
                ...(process.env.NODE_ENV !== 'production' && { verifyCode: verificationCode }),
            });
        } catch (error) {
            logger.error('Signup Error:', error);
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { error, value } = userValidator.validateLogin(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, password, deviceId } = value;

            const user = await userService.getUserByphoneNumber(phoneNumber);
            if (!user) {
                throw createError('9995', 'User not found.');
            }

            if (!user.isVerified) {
                throw createError('9995', 'Account not verified.');
            }

            if (user.isBlocked) {
                throw createError('9995', 'Account is blocked. Please contact support.');
            }

            if (!password || !user.password) {
                throw createError('1002', 'Password is required');
            }

            const isPasswordCorrect = await comparePassword(password, user.password);
            if (!isPasswordCorrect) {
                throw createError('1004', 'Incorrect password.');
            }

            const deviceToken = generateDeviceToken();

            const isTrustedDevice = user.deviceIds.includes(deviceId);
            if (!isTrustedDevice && user.deviceIds.length >= 5) {
                throw createError('1003', 'Maximum number of devices reached. Please remove a device first.');
            }

            await userService.updateUserDeviceInfo(user.userId, deviceToken, deviceId);

            const tokenPayload = {
                userId: user.userId,
                phone: user.phoneNumber,
                tokenVersion: user.tokenVersion,
                tokenFamily: user.tokenFamily,
                deviceId
            };

            const [token] = await Promise.all([
                generateJWT(tokenPayload),
            ]);

            if (process.env.NODE_ENV === 'production') {
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: this.sessionDuration * 1000
                });
            }

            sendResponse(res, '1000', {
                userId: user.userId,
                userName: user.userName,
                phoneNumber: user.phoneNumber,
                token,
                deviceToken,
                expiresIn: this.sessionDuration
            });
        } catch (error) {
            logger.error('Login Error:', error);
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const userId = req.user.userId;
            const deviceId = req.get('Device-ID');
            
            if (!deviceId) {
                throw createError('1004', 'Device ID is required');
            }

            await Promise.all([
                userService.clearUserDeviceToken(userId, deviceId.toString()),
                req.app.locals.auditLog.logAction(userId, null, 'logout', {
                    deviceId,
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                })
            ]);

            if (process.env.NODE_ENV === 'production') {
                res.clearCookie('auth_token');
            }

            sendResponse(res, '1000', { message: 'Logout successful.' });
        } catch (error) {
            logger.error('Logout Error:', error);
            next(error);
        }
    }

    async checkVerifyCode(req, res, next) {
        try {
            const { error, value } = userValidator.validateCheckVerifyCode(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, code } = value;

            // Fetch verification code from database
            const verificationRef = db.collection('verificationCodes').doc(phoneNumber);
            const verificationDoc = await verificationRef.get();

            if (!verificationDoc.exists) {
                throw createError('9993', 'Verification code has expired or does not exist');
            }

            const verificationData = verificationDoc.data();
            const currentTime = Date.now();
            const expirationTime = verificationData.expiresAt.toDate().getTime();

            if (currentTime > expirationTime) {
                await verificationRef.delete();
                throw createError('9993', 'Verification code has expired');
            }

            // Check remaining attempts
            if (verificationData.attempts >= 5) {
                throw createError('9993', 'Maximum verification attempts exceeded');
            }

            // Check verification code
            if (verificationData.verifyCode !== code) {
                await verificationRef.update({
                    attempts: verificationData.attempts + 1
                });
                throw createError('9993', 'Invalid verification code');
            }

            // Delete verification code only after user update
            await verificationRef.delete();

            // Check if the user exists first
            const user = await userService.getUserByphoneNumber(phoneNumber);
            if (!user) {
                sendResponse(res, '1000', {
                    verified: true,
                    exists: false,
                    message: 'Phone number verified. Please proceed with signup.'
                });
                return;
            }

            // Update user verification status if user exists
            await userService.updateVerificationStatus(user.userId, true);

            const deviceToken = generateDeviceToken();
            const tokenFamily = generateTokenFamily();

            const token = generateJWT({
                userId: user.userId,
                phone: phoneNumber,
                tokenVersion: user.tokenVersion || 0,
                tokenFamily,
                deviceId: req.get('Device-ID') || crypto.randomUUID()
            });

            sendResponse(res, '1000', {
                verified: true,
                exists: true,
                userId: user.userId,
                token,
                deviceToken,
                active: user.active ? "1" : "0"
            });
        } catch (error) {
            logger.error('Check Verify Code Error:', error);
            next(error);
        }
    }

    async setBlock(req, res, next) {
        try {
            const { error, value } = userValidator.validateSetBlock(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { userId: targetUserId, type } = value;
            const userId = req.user.userId;

            if (userId === targetUserId) {
                throw createError('1002', 'Cannot block yourself');
            }

            await userService.setBlock(req, userId, targetUserId, type);

            sendResponse(res, '1000', {
                message: type === 0 ? 'User blocked successfully' : 'User unblocked successfully'
            });
        } catch (error) {
            logger.error('Set Block Error:', error);
            next(error);
        }
    }

    async getUserInfo(req, res, next) {
        try {
            const { error, value } = userValidator.validateGetUserInfo({ userId: req.params.userId });
            if (error) {
                throw createError('1002', error.details[0].message);
            }

            const targetUserId = value.userId || req.user.userId;
            const userInfo = await userService.getUserInfo(targetUserId);

            // Add additional profile data
            const [friendsCount, postsCount] = await Promise.all([
                friendService.getFriendsCount(targetUserId),
                postService.getUserPostsCount(targetUserId)
            ]);

            sendResponse(res, '1000', {
                user: {
                    ...userInfo,
                    friendsCount,
                    postsCount
                }
            });
        } catch (error) {
            logger.error('Get User Info Error:', error);
            next(error);
        }
    }

    async setUserInfo(req, res, next) {
        try {
            const userId = req.user.userId;
            logger.debug('Starting setUserInfo request:', {
                userId,
                requestBody: req.body,
                hasFiles: !!req.files
            });

            const updateData = {};

            // Validate all data
            const { error, value } = userValidator.validateSetUserInfo({
                ...req.body,
                files: req.files
            });

            if (error) {
                throw createError('1002', error.details[0].message);
            }

            // Process text fields
            const textFields = ['userName', 'bio', 'address', 'city', 'country'];
            textFields.forEach(field => {
                if (value[field]) {
                    updateData[field] = value[field].normalize('NFC');
                }
            });

            // Process files
            if (req.files?.avatar && req.files.avatar[0]) {
                updateData.avatar = await handleAvatarUpload(req.files.avatar[0], userId);
            }

            if (req.files?.coverPhoto && req.files.coverPhoto[0]) {
                updateData.coverPhoto = await handleCoverPhotoUpload(req.files.coverPhoto[0], userId);
            }

            // Handle file deletions
            if (value.existingAvatar === '') {
                updateData.existingAvatar = '';
            }

            if (value.existingCoverPhoto === '') {
                updateData.existingCoverPhoto = '';
            }

            updateData.version = value.version || 0;

            logger.debug('Final update data:', { updateData });

            const updatedUser = await userService.setUserInfo(userId, updateData);

            await req.app.locals.auditLog.logAction(userId, null, 'update_profile', {
                timestamp: new Date().toISOString(),
                updatedFields: Object.keys(updateData),
                version: updatedUser.version
            });

            sendResponse(res, '1000', {
                message: 'Profile updated successfully',
                user: updatedUser
            });
        } catch (error) {
            next(error);
        }
    }

    async changeInfoAfterSignup(req, res, next) {
        try {
            const { error, value } = userValidator.validateChangeInfoAfterSignup({
                userName: req.body.userName,
                avatar: req.file || null
            });

            if (error) {
                throw createError('1002', error.details[0].message);
            }

            const userId = req.user.userId;
            const { userName } = value;
            let avatarUrl = null;

            // Handle avatar upload if file exists
            if (req.file) {
                try {
                    logger.info('Processing avatar upload', {
                        userId,
                        fileName: req.file.originalname
                    });

                    avatarUrl = await handleAvatarUpload(req.file, userId);

                    logger.info('Avatar uploaded successfully', {
                        userId,
                        url: avatarUrl
                    });
                } catch (uploadError) {
                    logger.error('Avatar upload failed:', uploadError, { userId });
                    throw createError('9999', 'Failed to process avatar image');
                }
            }

            // Generate userNameLowerCase array
            const userNameLowerCase = userName.toLowerCase().split(' ').filter(Boolean);

            const updatedUser = await userService.changeInfoAfterSignup(
                userId,
                userName,
                avatarUrl,
                userNameLowerCase
            );

            sendResponse(res, '1000', {
                userId: updatedUser.userId,
                userName: updatedUser.userName,
                avatar: updatedUser.avatar
            });

        } catch (error) {
            logger.error('Change Info After Signup Error:', error);
            next(error);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            const { phoneNumber, verifyCode, newPassword } = req.body;

            logger.info('Processing forgot password request', {
                step: verifyCode && newPassword ? 2 : 1,
                phoneNumber,
                hasVerifyCode: !!verifyCode,
                hasNewPassword: !!newPassword
            });

            // Handle verification code request (Step 1)
            if (!verifyCode && !newPassword) {
                const user = await userService.getUserByphoneNumber(phoneNumber);
                if (!user) {
                    logger.warn('User not found during password reset', { phoneNumber });
                    throw createError('9995', 'User not found');
                }

                // Check for existing verification code
                const verificationRef = db.collection('verificationCodes').doc(phoneNumber);
                const existingVerification = await verificationRef.get();

                if (existingVerification.exists) {
                    const data = existingVerification.data();
                    const currentTime = Date.now();

                    // If existing code is still valid, return it
                    if (currentTime < data.expiresAt.toDate().getTime()) {
                        logger.info('Using existing verification code', {
                            phoneNumber,
                            expires: data.expiresAt.toDate()
                        });

                        return res.status(200).json({
                            code: '1000',
                            message: 'Existing verification code is still valid',
                            data: { verifyCode: data.verifyCode }
                        });
                    }
                }

                const generatedCode = generateRandomCode();
                await verificationRef.set({
                    verifyCode: generatedCode,
                    attempts: 0,
                    expiresAt: new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY),
                    createdAt: new Date(),
                    type: 'password_reset'
                });

                logger.info('New verification code generated for password reset', {
                    phoneNumber,
                    expires: new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY)
                });

                return res.status(200).json({
                    code: '1000',
                    message: 'Verification code sent successfully',
                    data: { verifyCode: generatedCode }
                });
            }

            // Handle password reset (Step 2)
            if (verifyCode && newPassword) {
                logger.info('Proceeding with password reset verification', { phoneNumber });

                const resetResult = await userService.resetPassword(req, phoneNumber, verifyCode, newPassword);
                if (resetResult.success) {
                    logger.info('Password reset completed successfully', { phoneNumber });
                    return res.status(200).json({
                        code: '1000',
                        message: 'Password has been reset successfully'
                    });
                }
            }
            throw createError('1002', 'Invalid request parameters');
        } catch (error) {
            logger.error('Forgot password error:', error);
            next(error);
        }
    }
}

export default new UserController();
