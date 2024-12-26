import crypto from 'crypto';
import userService from '../services/userService.js';
import userValidator from '../validators/userValidator.js';
import { comparePassword, generateJWT, generateRefreshToken, generateRandomCode, verifyRefreshToken, generateDeviceToken, generateTokenFamily } from '../utils/authHelper.js';
import { handleAvatarUpload, handleCoverPhotoUpload } from '../utils/helpers.js';
import { sendResponse } from '../utils/responseHandler.js';
import { createError } from '../utils/customError.js';
import { db } from '../config/firebase.js';
import logger from '../utils/logger.js';

class UserController {
    constructor() {
        this.sessionDuration = 15 * 60; // 15 minutes in seconds
        this.refreshTokenDuration = 7 * 24 * 60 * 60; // 7 days in seconds
        this.verifyCodeDuration = 5 * 60; // 5 minutes in seconds
        this.refreshToken = this.refreshToken.bind(this);
        this.signup = this.signup.bind(this);
        this.login = this.login.bind(this);
    }

    async checkAuth(req, res, next) {
        try {
            const userId = req.user.uid;
            const user = await userService.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            sendResponse(res, '1000', {
                isAuthenticated: true,
                user: {
                    id: user.uid,
                    userName: user.userName,
                    phoneNumber: user.phoneNumber,
                    avatar_url: user.avatar_url
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
            const userId = req.user.uid;

            await userService.updatePassword(req, userId, password, new_password);

            const currentDeviceId = req.get('X-Device-ID');

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

    async refreshToken(req, res, next) {
        try {
            const { error, value } = userValidator.validateRefreshToken(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { refreshToken } = value;
            const decoded = await verifyRefreshToken(refreshToken);
            if (!decoded) {
                throw createError('1006', 'Invalid refresh token');
            }

            const userId = decoded.uid;
            const user = await userService.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (decoded.tokenFamily !== user.tokenFamily) {
                throw createError('1006', 'Invalid token family');
            }

            const tokenPayload = {
                uid: user.uid,
                phone: user.phoneNumber,
                tokenVersion: user.tokenVersion,
                tokenFamily: user.tokenFamily,
                deviceId: decoded.deviceId
            };

            const [newToken, newRefreshToken] = await Promise.all([
                generateJWT(tokenPayload),
                generateRefreshToken({ ...user, deviceId: decoded.deviceId })
            ]);

            if (process.env.NODE_ENV === 'production') {
                res.cookie('auth_token', newToken, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: this.sessionDuration * 1000
                });

                res.cookie('refresh_token', newRefreshToken, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: this.refreshTokenDuration * 1000
                });
            }

            sendResponse(res, '1000', {
                token: newToken,
                refreshToken: newRefreshToken,
                expiresIn: this.sessionDuration
            });
        } catch (error) {
            logger.error('Refresh Token Error:', error);
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
                code: verificationCode,
                attempts: 0,
                expiresAt: new Date(expirationTime),
                createdAt: new Date()
            });

            logger.info(`Verification code generated for phone number: ${phoneNumber}`);

            // In production, code won't be returned
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
                        await userService.deleteUser(existingUser.uid);
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
                uid: userId,
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
                id: userId,
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

            const isPasswordCorrect = await comparePassword(password, user.password);
            if (!isPasswordCorrect) {
                throw createError('1004', 'Incorrect password.');
            }

            const deviceToken = generateDeviceToken();

            const isTrustedDevice = user.deviceIds.includes(deviceId);
            if (!isTrustedDevice && user.deviceIds.length >= 5) {
                throw createError('1003', 'Maximum number of devices reached. Please remove a device first.');
            }

            await userService.updateUserDeviceInfo(user.uid, deviceToken, deviceId);

            const tokenPayload = {
                uid: user.uid,
                phone: user.phoneNumber,
                tokenVersion: user.tokenVersion,
                tokenFamily: user.tokenFamily,
                deviceId
            };

            const [token, refreshToken] = await Promise.all([
                generateJWT(tokenPayload),
                generateRefreshToken({ ...user, deviceId })
            ]);

            await Promise.all([
                userService.updateUserRefreshToken(user.uid, refreshToken, deviceId),
                req.app.locals.auditLog.logAction(user.uid, null, 'login', {
                    deviceId,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                })
            ]);

            if (process.env.NODE_ENV === 'production') {
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: this.sessionDuration * 1000
                });

                res.cookie('refresh_token', refreshToken, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'strict',
                    maxAge: this.refreshTokenDuration * 1000
                });
            }

            sendResponse(res, '1000', {
                id: user.uid,
                userName: user.userName,
                phoneNumber: user.phoneNumber,
                token,
                refreshToken,
                deviceToken,
                expiresIn: this.sessionDuration
            });
        } catch (error) {
            logger.error('Login Error:', error);
            next(error);
        }
    }

    async changeInfoAfterSignup(req, res, next) {
        try {
            const { error, value } = userValidator.validateChangeInfoAfterSignup(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { userName } = value;
            const userId = req.user.uid;

            const currentUser = await userService.getUserById(userId);
            if (!currentUser) {
                throw createError('9995', 'User not found');
            }

            let avatarUrl = null;
            if (req.file) {
                avatarUrl = await handleAvatarUpload(req.file, currentUser.avatar_url);
            }

            await userService.changeInfoAfterSignup(userId, userName, avatarUrl);

            await req.app.locals.auditLog.logAction(userId, null, 'profile_update', {
                deviceId: req.get('Device-ID'),
                ip: req.ip,
                timestamp: new Date().toISOString()
            });

            const updatedUser = await userService.getUserById(userId);

            sendResponse(res, '1000', {
                message: 'Profile updated successfully',
                id: updatedUser.uid,
                userName: updatedUser.userName,
                avatar_url: updatedUser.avatar_url,
                phoneNumber: updatedUser.phoneNumber,
                created: updatedUser.createdAt,
                isBlocked: updatedUser.isBlocked,
                online: updatedUser.online
            });
        } catch (error) {
            logger.error('Change Info Error:', error);
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const userId = req.user.uid;
            const deviceId = req.get('X-Device-ID');

            await Promise.all([
                userService.clearUserDeviceToken(userId, deviceId),
                req.app.locals.auditLog.logAction(userId, null, 'logout', {
                    deviceId,
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                })
            ]);

            if (process.env.NODE_ENV === 'production') {
                res.clearCookie('auth_token');
                res.clearCookie('refresh_token');
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
            if (verificationData.code !== code) {
                await verificationRef.update({
                    attempts: verificationData.attempts + 1
                });
                throw createError('9993', 'Invalid verification code');
            }

            // Delete verification code after success
            await verificationRef.delete();

            // Check if the user exists
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
            await userService.updateVerificationStatus(user.uid, true);

            const deviceToken = generateDeviceToken();
            const tokenFamily = generateTokenFamily();

            const token = generateJWT({
                uid: user.uid,
                phone: phoneNumber,
                tokenVersion: user.tokenVersion || 0,
                tokenFamily,
                deviceId: req.get('Device-ID') || crypto.randomUUID()
            });

            sendResponse(res, '1000', {
                verified: true,
                exists: true,
                id: user.uid,
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
            const userId = req.user.uid;

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

    async setUserInfo(req, res, next) {
        try {
            const { error, value } = userValidator.validateSetUserInfo(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const userId = req.user.uid;

            let updateData = { ...value };
            if (req.files) {
                if (req.files.avatar) {
                    updateData.avatar = await handleAvatarUpload(req.files.avatar[0]);
                }
                if (req.files.coverPhoto) {
                    updateData.coverPhoto = await handleCoverPhotoUpload(req.files.coverPhoto[0]);
                }
            }

            const updatedUser = await userService.setUserInfo(userId, updateData);

            sendResponse(res, '1000', {
                message: 'Profile updated successfully',
                user: {
                    uid: updatedUser.uid,
                    userName: updatedUser.userName,
                    fullName: updatedUser.fullName,
                    avatar_url: updatedUser.avatar_url,
                    coverPhoto: updatedUser.coverPhoto,
                    bio: updatedUser.bio,
                    location: updatedUser.location
                }
            });
        } catch (error) {
            logger.error('Set User Info Error:', error);
            next(error);
        }
    }

    async getUserInfo(req, res, next) {
        try {
            const { error, value } = userValidator.validateGetUserInfo({ id: req.params.id });
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const targetUserId = value.id || req.user.uid;

            const userInfo = await userService.getUserInfo(targetUserId);

            sendResponse(res, '1000', { user: userInfo });
        } catch (error) {
            logger.error('Get User Info Error:', error);
            next(error);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            const { error, value } = userValidator.validateForgotPassword(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, code, newPassword } = value;

            const user = await userService.getUserByphoneNumber(phoneNumber);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (!code || !newPassword) {
                const verificationCode = generateRandomCode();

                sendResponse(res, '1000', {
                    message: 'Verification code generated. Please check your SMS or console.',
                    ...(process.env.NODE_ENV !== 'production' && { verificationCode })
                });
                return;
            }

            await userService.resetPassword(req, phoneNumber, code, newPassword);

            sendResponse(res, '1000', { message: 'Password has been reset successfully.' });
        } catch (error) {
            logger.error('Forgot Password Error:', error);
            next(error);
        }
    }
}

export default new UserController();
