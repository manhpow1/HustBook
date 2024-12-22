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
    }

    async signup(req, res, next) {
        try {
            // Check rate limits
            const rateLimitResult = await rateLimit.checkSignupLimit(req.ip);
            if (rateLimitResult.limited) {
                throw createError('1003', `Too many signup attempts. Please try again in ${rateLimitResult.timeLeft} seconds.`);
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

    // ... Implement other methods with similar improvements
    // logout, getVerifyCode, checkVerifyCode, etc.

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
}

module.exports = new UserController();
