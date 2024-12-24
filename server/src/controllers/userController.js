const crypto = require('crypto');
const userService = require('../services/userService');
const userValidator = require('../validators/userValidator');
const {
    comparePassword,
    generateJWT,
    generateRefreshToken,
    generateRandomCode,
    verifyRefreshToken,
    generateDeviceToken,
    generateTokenFamily
} = require('../utils/authHelper');
const redis = require('../utils/redis');
const rateLimit = require('../middleware/rateLimiter');
const { formatPhoneNumber, sanitizeDeviceInfo } = require('../utils/helpers');
const { sendResponse } = require('../utils/responseHandler');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');
const cache = require('../utils/redis');
const AuditLogModel = require('../models/auditLogModel');

class UserController {
    constructor() {
        this.sessionDuration = 15 * 60; // 15 minutes in seconds
        this.refreshTokenDuration = 7 * 24 * 60 * 60; // 7 days in seconds
        this.verifyCodeDuration = 5 * 60; // 5 minutes in seconds
    }

    async checkAuth(req, res, next) {
        try {
            // Since this endpoint uses authenticateToken middleware,
            // if we reach here, the token is valid
            const user = await userService.getUserById(req.user.uid);
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
            // Validate request body
            const { error, value } = userValidator.validateChangePassword(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { password, new_password } = value;
            const userId = req.user.uid;

            // Update password
            await userService.updatePassword(userId, password, new_password);

            // Clear user sessions except current one
            const currentDeviceId = req.get('X-Device-ID');
            await redis.clearUserSessionsExcept(userId, currentDeviceId);

            // Log action
            await AuditLogModel.logAction(userId, null, 'password_change', {
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
            // Validate request body
            const { error, value } = userValidator.validateRefreshToken(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { refreshToken } = value;

            // Verify refresh token
            const decoded = await verifyRefreshToken(refreshToken);
            if (!decoded) {
                throw createError('1006', 'Invalid refresh token');
            }

            // Check if token is blacklisted
            const isBlacklisted = await redis.isTokenBlacklisted(refreshToken);
            if (isBlacklisted) {
                throw createError('1006', 'Token has been revoked');
            }

            // Get user
            const user = await userService.getUserById(decoded.uid);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // Verify token family to prevent refresh token rotation attacks
            if (decoded.tokenFamily !== user.tokenFamily) {
                // Potential reuse! Revoke all tokens
                await Promise.all([
                    redis.blacklistUserTokens(user.uid),
                    userService.updateTokenVersion(user.uid)
                ]);
                throw createError('1006', 'Invalid token family');
            }

            // Generate new token pair
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

            // Blacklist old refresh token
            await redis.blacklistToken(refreshToken);

            // Update user session
            await redis.updateUserSession(user.uid, decoded.deviceId, {
                lastActivity: Date.now()
            });

            // Set secure cookies in production
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
            // Check rate limits
            const rateLimitResult = await rateLimit.checkVerifyCodeLimit(req.ip);
            if (rateLimitResult.limited) {
                throw createError(
                    '1003',
                    `Too many verification code requests. Please try again in ${rateLimitResult.timeLeft} seconds.`
                );
            }

            // Validate request body
            const { error, value } = userValidator.validateGetVerifyCode(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phonenumber } = value;
            const formattedPhoneNumber = formatPhoneNumber(phonenumber);

            // Generate new verification code
            const verificationCode = generateRandomCode();

            // Store verification code in Redis with expiration
            await redis.setVerificationCode(formattedPhoneNumber, verificationCode, this.verifyCodeDuration);

            // Increment verify code attempts
            await rateLimit.incrementVerifyCodeAttempts(req.ip);

            // In production, would integrate with SMS service here
            // For development, return the code in response
            sendResponse(res, '1000', {
                message: 'Verification code sent successfully',
                ...(process.env.NODE_ENV !== 'production' && { verifyCode: verificationCode })
            });

        } catch (error) {
            logger.error('Get Verify Code Error:', error);
            next(error);
        }
    }

    async signup(req, res, next) {
        try {
            // Check rate limits
            const rateLimitResult = await rateLimit.checkSignupLimit(req.ip);
            if (rateLimitResult.limited) {
                throw createError(
                    '1003',
                    `Too many signup attempts. Please try again in ${rateLimitResult.timeLeft} seconds.`
                );
            }

            // Validate request body
            const { error, value } = userValidator.validateSignup(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, password, uuid } = value;
            const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

            // Check existing user
            const existingUser = await userService.getUserByphoneNumber(formattedPhoneNumber);
            if (existingUser) {
                if (existingUser.isVerified) {
                    throw createError('9996', 'Phone number already registered');
                } else {
                    // Delete unverified account older than 24 hours
                    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    if (new Date(existingUser.createdAt) < twentyFourHoursAgo) {
                        await userService.deleteUser(existingUser.uid);
                    } else {
                        throw createError('9996', 'Please verify your existing registration');
                    }
                }
            }

            // Generate verification code and device info
            const verificationCode = generateRandomCode();
            const deviceId = req.body.deviceId || crypto.randomUUID();

            // Get device info from request headers
            const deviceInfo = {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                platform: req.get('sec-ch-ua-platform'),
                isMobile: req.get('sec-ch-ua-mobile') === '?1',
                lastLocation: null // Could be added if collecting location data
            };

            // Create user
            const { userId, deviceToken, tokenFamily } = await userService.createUser(
                formattedPhoneNumber,
                password,
                uuid,
                verificationCode,
                deviceId,
                sanitizeDeviceInfo(deviceInfo)
            );

            // Generate JWT
            const token = generateJWT({
                uid: userId,
                phone: formattedPhoneNumber,
                tokenVersion: 0,
                tokenFamily,
                deviceId
            });

            // Increment signup attempts and log action
            await Promise.all([
                rateLimit.incrementSignupAttempts(req.ip),
                AuditLogModel.logAction(userId, null, 'signup', {
                    deviceId,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                })
            ]);

            // Set secure cookie in production
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
            // Check rate limits and IP blacklist
            const [rateLimitResult, isBlacklisted] = await Promise.all([
                rateLimit.checkLoginLimit(req.ip),
                redis.isIPBlacklisted(req.ip)
            ]);

            if (rateLimitResult.limited) {
                throw createError('1003', `Too many login attempts. Please try again in ${rateLimitResult.timeLeft} seconds.`);
            }

            if (isBlacklisted) {
                throw createError('1003', 'Access denied. Please contact support.');
            }

            // Validate request body
            const { error, value } = userValidator.validateLogin(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, password, deviceId, biometricAuth } = value;
            const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

            // Get user and check status
            const user = await userService.getUserByphoneNumber(formattedPhoneNumber);
            if (!user) {
                throw createError('9995', 'User not found.');
            }

            if (!user.isVerified) {
                throw createError('9995', 'Account not verified.');
            }

            if (user.isBlocked) {
                throw createError('9995', 'Account is blocked. Please contact support.');
            }

            // Check account lockout
            const failedAttempts = await redis.getLoginAttempts(user.uid);
            if (failedAttempts >= 5) {
                // Check if lockout period has expired
                const lockoutUntil = await redis.getLockoutTime(user.uid);
                if (lockoutUntil && Date.now() < lockoutUntil) {
                    const remainingTime = Math.ceil((lockoutUntil - Date.now()) / 1000);
                    throw createError('1003', `Account is locked. Please try again in ${remainingTime} seconds.`);
                } else {
                    // Reset attempts if lockout period expired
                    await redis.setLoginAttempts(user.uid, 0);
                }
            }

            // Verify password
            const isPasswordCorrect = await comparePassword(password, user.password);
            if (!isPasswordCorrect) {
                await Promise.all([
                    redis.incrementLoginAttempts(user.uid),
                    rateLimit.incrementLoginAttempts(req.ip),
                    AuditLogModel.logAction(user.uid, null, 'failed_login', {
                        reason: 'incorrect_password',
                        ip: req.ip,
                        deviceId,
                        attempts: failedAttempts + 1,
                        timestamp: new Date().toISOString()
                    })
                ]);

                // Set lockout if max attempts reached
                if (failedAttempts + 1 >= 5) {
                    const lockoutDuration = 5 * 60 * 1000; // 5 minutes
                    await redis.setLockoutTime(user.uid, Date.now() + lockoutDuration);
                    throw createError('1003', 'Account locked for 5 minutes due to too many failed attempts.');
                }

                throw createError('1004', 'Incorrect password.');
            }

            // Handle device management
            const deviceToken = generateDeviceToken();
            const deviceInfo = {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                platform: req.get('sec-ch-ua-platform'),
                isMobile: req.get('sec-ch-ua-mobile') === '?1',
                lastUsed: new Date().toISOString(),
                biometricEnabled: biometricAuth || false
            };

            // Check device limit
            const isTrustedDevice = user.deviceIds.includes(deviceId);
            if (!isTrustedDevice && user.deviceIds.length >= 5) {
                throw createError('1003', 'Maximum number of devices reached. Please remove a device first.');
            }

            // Update device info and generate tokens
            await userService.updateUserDeviceInfo(user.uid, deviceToken, deviceId, sanitizeDeviceInfo(deviceInfo));

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

            // Update user session info
            await Promise.all([
                userService.updateUserRefreshToken(user.uid, refreshToken, deviceId),
                redis.setUserSession(user.uid, {
                    deviceId,
                    deviceToken,
                    lastActivity: Date.now()
                }),
                redis.setLoginAttempts(user.uid, 0),
                AuditLogModel.logAction(user.uid, null, 'login', {
                    deviceId,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                })
            ]);

            // Set secure cookies in production
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
            // Validate request body
            const { error, value } = userValidator.validateChangeInfoAfterSignup(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { userName } = value;
            const userId = req.user.uid;

            // Get current user to check existing avatar
            const currentUser = await userService.getUserById(userId);
            if (!currentUser) {
                throw createError('9995', 'User not found');
            }

            // Handle avatar upload if present
            let avatarUrl = null;
            if (req.file) {
                avatarUrl = await handleAvatarUpload(req.file, currentUser.avatar_url);
            }

            // Update user info with optimistic locking
            await userService.changeInfoAfterSignup(userId, userName, avatarUrl);

            // Invalidate Redis cache
            await Promise.all([
                redis.deleteKey(`user:${userId}`),
                redis.deleteKey(`user:${userId}:profile`),
                AuditLogModel.logAction(userId, null, 'profile_update', {
                    deviceId: req.get('Device-ID'),
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                })
            ]);

            // Get updated user data
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

            // Clear tokens and update user state
            await Promise.all([
                userService.clearUserDeviceToken(userId, deviceId),
                redis.deleteUserSession(userId, deviceId),
                AuditLogModel.logAction(userId, null, 'logout', {
                    deviceId,
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                })
            ]);

            // Clear cookies in production
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
            // Validate request body
            const { error, value } = userValidator.validateCheckVerifyCode(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phonenumber, code } = value;
            const formattedPhoneNumber = formatPhoneNumber(phonenumber);

            // Get saved verification code
            const savedCode = await redis.getVerificationCode(formattedPhoneNumber);
            if (!savedCode) {
                throw createError('1004', 'Verification code has expired or does not exist');
            }

            // Check if code matches
            if (code !== savedCode) {
                // Increment failed attempts
                const attempts = await redis.incrementVerifyAttempts(formattedPhoneNumber);

                // If too many failed attempts, clear the code
                if (attempts >= 3) {
                    await Promise.all([
                        redis.del(`verify:${formattedPhoneNumber}`),
                        redis.clearVerifyAttempts(formattedPhoneNumber)
                    ]);
                    throw createError('1003', 'Too many failed attempts. Please request a new code.');
                }

                throw createError('1004', 'Invalid verification code');
            }

            // Clear verification code and attempts after successful verification
            await Promise.all([
                redis.del(`verify:${formattedPhoneNumber}`),
                redis.clearVerifyAttempts(formattedPhoneNumber)
            ]);

            // Get user from database if exists
            const user = await userService.getUserByphoneNumber(formattedPhoneNumber);
            if (!user) {
                // For new users, return success but indicate user needs to sign up
                sendResponse(res, '1000', {
                    verified: true,
                    exists: false,
                    message: 'Phone number verified. Please proceed with signup.'
                });
                return;
            }

            // For existing users, update verification status and return user info
            await userService.updateVerificationStatus(user.uid, true);

            // Generate device token
            const deviceToken = generateDeviceToken();
            const tokenFamily = generateTokenFamily();

            // Generate tokens
            const token = generateJWT({
                uid: user.uid,
                phone: formattedPhoneNumber,
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
            // Validate request body
            const { error, value } = userValidator.validateSetBlock(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { userId: targetUserId, type } = value;
            const userId = req.user.uid;

            // Can't block yourself
            if (userId === targetUserId) {
                throw createError('1002', 'Cannot block yourself');
            }

            await userService.setBlock(userId, targetUserId, type);

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
            // Validate request body
            const { error, value } = userValidator.validateSetUserInfo(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const userId = req.user.uid;

            // Handle file uploads if present
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
            // Validate params
            const { error, value } = userValidator.validateGetUserInfo({ id: req.params.id });
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const targetUserId = value.id || req.user.uid; // If no ID provided, get current user's info

            const userInfo = await userService.getUserInfo(targetUserId);

            sendResponse(res, '1000', { user: userInfo });
        } catch (error) {
            logger.error('Get User Info Error:', error);
            next(error);
        }
    }

    async forgotPassword(req, res, next) {
        try {
            // 1) Validate request body
            const { error, value } = userValidator.validateForgotPassword(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, code, newPassword } = value;

            // 2) Check if user exists
            const user = await userService.getUserByphoneNumber(phoneNumber);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // 3) If no code/newPassword => generate code
            if (!code || !newPassword) {
                // Generate verification code
                const verificationCode = generateRandomCode();

                // Store verification code in your preferred storage
                // e.g., Firestore in user doc, or Redis with an expiration, etc.
                // await userService.storeVerificationCode(user.uid, verificationCode);

                // Return the code in dev or send via SMS in production
                sendResponse(res, '1000', {
                    message: 'Verification code generated. Please check your SMS or console.',
                    ...(process.env.NODE_ENV !== 'production' && { verificationCode })
                });
                return;
            }

            // 4) If code + newPassword => finalize password reset
            await userService.resetPassword(phoneNumber, code, newPassword);

            // 5) Send success response
            sendResponse(res, '1000', { message: 'Password has been reset successfully.' });
        } catch (error) {
            logger.error('Forgot Password Error:', error);
            next(error);
        }
    }
}

module.exports = new UserController();
