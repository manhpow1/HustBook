const { v4: uuidv4 } = require('uuid');
const { collections, getDocument, queryDocuments } = require('../config/database');
const { createError } = require('../utils/customError');
const { generateDeviceToken, hashPassword, comparePassword } = require('../utils/authHelper');
const { passwordStrength } = require('../validators/userValidator');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const User = require('../models/userModel');
const AuditLogModel = require('../models/auditLogModel');

// Constants
const MAX_DEVICES_PER_USER = 5;
const VERIFICATION_CODE_EXPIRY = 5 * 60 * 1000;
const VERIFICATION_CODE_COOLDOWN = 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;
const PASSWORD_HISTORY_SIZE = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000;

class UserService {
    async createUser(phoneNumber, password, uuid, verificationCode, deviceId) {
        try {
            if (!passwordStrength(password)) {
                throw createError('9997', 'Password does not meet security requirements');
            }

            const existingUser = await this.getUserByphoneNumber(phoneNumber);
            if (existingUser && existingUser.isVerified) {
                throw createError('9996', 'Phone number already registered');
            }

            const hashedPassword = await hashPassword(password);
            const deviceToken = generateDeviceToken();
            const userId = uuidv4();
            const tokenFamily = uuidv4();

            const user = new User({
                uid: userId,
                phoneNumber,
                password: hashedPassword,
                passwordHistory: [hashedPassword],
                uuid,
                verificationCode,
                verificationCodeTimestamp: Date.now(),
                verificationCodeExpiration: Date.now() + VERIFICATION_CODE_EXPIRY,
                verificationAttempts: 0,
                isVerified: false,
                deviceToken,
                deviceTokens: [deviceToken],
                deviceIds: [deviceId],
                deviceDetails: [{
                    id: deviceId,
                    token: deviceToken,
                    lastUsed: new Date().toISOString()
                }],
                tokenVersion: 0,
                tokenFamily,
                lastTokenRefresh: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastLoginAt: null,
                lastPasswordChange: new Date().toISOString(),
                failedLoginAttempts: 0,
                lockoutUntil: null,
                online: false,
                isBlocked: false,
                isAdmin: false,
                securityLevel: 'standard',
                twoFactorEnabled: false,
                allowedIPs: [],
                lastSecurityAudit: new Date().toISOString()
            });

            await user.save();

            // Initialize Redis data
            await Promise.all([
                redis.setLoginAttempts(userId, 0),
                redis.setVerificationAttempts(userId, 0),
                redis.setUserDevices(userId, [deviceId])
            ]);

            logger.info(`User created with ID: ${userId}`);
            return { userId, deviceToken, tokenFamily };

        } catch (error) {
            logger.error('Error creating user:', error);
            throw createError('9999', 'Failed to create user.');
        }
    }

    async updateUserDeviceInfo(userId, deviceToken, deviceId, deviceInfo = {}) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (user.deviceIds.length >= MAX_DEVICES_PER_USER && !user.deviceIds.includes(deviceId)) {
                throw createError('9994', 'Maximum number of devices reached');
            }

            const updatedDevices = user.deviceDetails.filter(d => d.id !== deviceId);
            updatedDevices.push({
                id: deviceId,
                token: deviceToken,
                lastUsed: new Date().toISOString(),
                ...deviceInfo
            });

            user.deviceDetails = updatedDevices;
            user.deviceTokens = [...new Set([...user.deviceTokens, deviceToken])];
            user.deviceIds = [...new Set([...user.deviceIds, deviceId])];

            await user.save();
            await redis.setUserDevices(userId, updatedDevices);

            logger.info(`Updated device info for user ${userId}, device ${deviceId}`);
        } catch (error) {
            logger.error('Error updating device info:', error);
            throw error;
        }
    }

    async removeDevice(userId, deviceId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            const deviceToRemove = user.deviceDetails.find(d => d.id === deviceId);
            if (!deviceToRemove) {
                throw createError('9994', 'Device not found');
            }

            user.deviceDetails = user.deviceDetails.filter(d => d.id !== deviceId);
            user.deviceTokens = user.deviceTokens.filter(t => t !== deviceToRemove.token);
            user.deviceIds = user.deviceIds.filter(id => id !== deviceId);

            await Promise.all([
                user.save(),
                redis.setUserDevices(userId, user.deviceDetails),
                redis.blacklistToken(deviceToRemove.token)
            ]);

            logger.info(`Removed device ${deviceId} for user ${userId}`);
        } catch (error) {
            logger.error('Error removing device:', error);
            throw error;
        }
    }

    async updatePassword(userId, currentPassword, newPassword) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (!passwordStrength(newPassword)) {
                throw createError('9997', 'New password does not meet security requirements');
            }

            const isValidPassword = await comparePassword(currentPassword, user.password);
            if (!isValidPassword) {
                throw createError('9993', 'Current password is incorrect');
            }

            // Check password history
            const isPasswordReused = await Promise.any(
                user.passwordHistory.map(async (hashedPwd) => comparePassword(newPassword, hashedPwd))
            ).catch(() => false);

            if (isPasswordReused) {
                throw createError('9992', 'Password has been used recently');
            }

            const hashedPassword = await hashPassword(newPassword);
            user.password = hashedPassword;
            user.passwordHistory = [hashedPassword, ...user.passwordHistory].slice(0, PASSWORD_HISTORY_SIZE);
            user.lastPasswordChange = new Date().toISOString();
            user.tokenVersion += 1;

            await user.save();

            await AuditLogModel.logAction(userId, null, 'password_change', {
                timestamp: new Date().toISOString()
            });

            logger.info(`Password updated for user ${userId}`);
        } catch (error) {
            logger.error('Error updating password:', error);
            throw error;
        }
    }

    async verifyUserCode(userId, code) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (Date.now() > user.verificationCodeExpiration) {
                throw createError('9993', 'Verification code has expired');
            }

            if (user.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
                throw createError('9993', 'Maximum verification attempts exceeded');
            }

            const isValid = await comparePassword(code, user.verificationCode);
            if (!isValid) {
                user.verificationAttempts += 1;
                await user.save();
                throw createError('9993', 'Invalid verification code');
            }

            user.verificationCode = null;
            user.verificationCodeTimestamp = null;
            user.verificationCodeExpiration = null;
            user.verificationAttempts = null;
            user.isVerified = true;

            await user.save();
            logger.info(`User ${userId} verified successfully`);
            return true;
        } catch (error) {
            logger.error('Error verifying code:', error);
            throw error;
        }
    }

    async storeVerificationCode(userId, verificationCode) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            const currentTime = Date.now();
            const lastCodeTime = user.verificationCodeTimestamp || 0;

            if (currentTime - lastCodeTime < VERIFICATION_CODE_COOLDOWN) {
                throw createError('1013', 'Please wait before requesting a new code');
            }

            const hashedCode = await hashPassword(verificationCode);

            user.verificationCode = hashedCode;
            user.verificationCodeTimestamp = currentTime;
            user.verificationCodeExpiration = currentTime + VERIFICATION_CODE_EXPIRY;
            user.verificationAttempts = 0;

            await user.save();
            logger.info(`Verification code stored for user ${userId}`);
        } catch (error) {
            logger.error('Error storing verification code:', error);
            throw error;
        }
    }

    async getUserById(userId) {
        try {
            const cached = await redis.getKey(`user:${userId}`);
            if (cached) {
                return new User(JSON.parse(cached));
            }

            const userDoc = await getDocument(collections.users, userId);
            if (!userDoc) {
                throw createError('9995', 'User not found');
            }

            const user = new User(userDoc);
            await redis.setKey(`user:${userId}`, JSON.stringify(userDoc), 3600);
            return user;
        } catch (error) {
            logger.error('Error getting user by ID:', error);
            throw error;
        }
    }

    async getUserByphoneNumber(phoneNumber) {
        try {
            const users = await queryDocuments(collections.users, 'phoneNumber', '==', phoneNumber);
            if (users.length === 0) return null;
            return new User(users[0]);
        } catch (error) {
            logger.error('Error getting user by phone:', error);
            throw error;
        }
    }

    async changeInfoAfterSignup(userId, userName, avatarUrl = null) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // Rate limiting check
            const currentTime = Date.now();
            const lastModifiedAt = user.lastModifiedAt || 0;
            if (currentTime - lastModifiedAt < 1000) {
                throw createError('1003', 'Please wait a moment before updating again');
            }

            user.userName = userName;
            if (avatarUrl !== null) {
                user.avatar_url = avatarUrl;
            }

            user.lastModifiedAt = currentTime;
            user.version = (user.version || 0) + 1;

            await user.save();
            logger.info(`Updated user info after signup for user ${userId}`);

            return user.toJSON();
        } catch (error) {
            logger.error('Error updating user info after signup:', error);
            throw error;
        }
    }

    async cleanupInactiveDevices(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const activeDevices = user.deviceDetails.filter(device =>
                new Date(device.lastUsed) > thirtyDaysAgo
            );

            if (activeDevices.length !== user.deviceDetails.length) {
                user.deviceDetails = activeDevices;
                user.deviceTokens = activeDevices.map(d => d.token);
                user.deviceIds = activeDevices.map(d => d.id);

                await user.save();
                await redis.setUserDevices(userId, activeDevices);
                logger.info(`Cleaned up inactive devices for user ${userId}`);
            }
        } catch (error) {
            logger.error('Error cleaning up inactive devices:', error);
            throw error;
        }
    }

    async clearUserDeviceToken(userId, deviceId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            const deviceIndex = user.deviceDetails.findIndex(d => d.id === deviceId);
            if (deviceIndex === -1) {
                return;
            }

            user.deviceDetails[deviceIndex] = {
                ...user.deviceDetails[deviceIndex],
                token: null,
                refreshToken: null,
                lastUsed: new Date().toISOString()
            };

            user.deviceTokens = user.deviceDetails
                .map(d => d.token)
                .filter(Boolean);

            await user.save();
            logger.info(`Cleared device token for user ${userId}, device ${deviceId}`);
        } catch (error) {
            logger.error('Error clearing device token:', error);
            throw error;
        }
    }

    async setBlock(userId, targetUserId, type) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // Also verify target user exists
            const targetUser = await this.getUserById(targetUserId);
            if (!targetUser) {
                throw createError('9995', 'Target user not found');
            }

            if (type === 0) {
                await user.blockUser(targetUserId);
            } else {
                await user.unblockUser(targetUserId);
            }

            await AuditLogModel.logAction(userId, targetUserId,
                type === 0 ? 'block_user' : 'unblock_user',
                { timestamp: new Date().toISOString() }
            );

        } catch (error) {
            logger.error('Error setting block status:', error);
            throw error;
        }
    }

    async getUserInfo(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            return {
                uid: user.id,
                userName: user.userName,
                fullName: user.fullName,
                avatar_url: user.avatar_url,
                coverPhoto: user.coverPhoto,
                bio: user.bio,
                location: user.location,
                createdAt: user.createdAt,
                isVerified: user.isVerified,
                online: user.online,
                isAdmin: user.isAdmin || false
            };
        } catch (error) {
            logger.error('Error getting user info:', error);
            throw error;
        }
    }

    async setUserInfo(userId, updateData) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            const currentTime = Date.now();
            const lastModifiedAt = user.lastModifiedAt || 0;

            if (currentTime - lastModifiedAt < 1000) {
                throw createError('1003', 'Please wait a moment before updating again');
            }

            const currentVersion = user.version || 0;
            if (currentVersion !== updateData.version - 1) {
                throw createError('9999', 'Data was modified by another request');
            }

            Object.assign(user, updateData);
            user.version = currentVersion + 1;
            user.lastModifiedAt = currentTime;
            user.updatedAt = new Date().toISOString();

            await user.save();
            logger.info(`Updated user info for user ${userId}`);

            return user.toJSON();
        } catch (error) {
            logger.error('Error updating user info:', error);
            throw error;
        }
    }

    async resetPassword(phoneNumber, code, newPassword) {
        try {
            const user = await this.getUserByphoneNumber(phoneNumber);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (!passwordStrength(newPassword)) {
                throw createError('9997', 'New password does not meet security requirements');
            }

            // Verify the code
            await this.verifyUserCode(user.id, code);

            // Check password history
            const isPasswordReused = await Promise.any(
                user.passwordHistory.map(async (hashedPwd) => comparePassword(newPassword, hashedPwd))
            ).catch(() => false);

            if (isPasswordReused) {
                throw createError('9992', 'Password has been used recently');
            }

            const hashedPassword = await hashPassword(newPassword);
            user.password = hashedPassword;
            user.passwordHistory = [hashedPassword, ...user.passwordHistory].slice(0, PASSWORD_HISTORY_SIZE);
            user.lastPasswordChange = new Date().toISOString();
            user.tokenVersion += 1;
            user.verificationCode = null;
            user.verificationCodeTimestamp = null;
            user.verificationCodeExpiration = null;
            user.verificationAttempts = null;

            await user.save();

            // Log password reset
            await AuditLogModel.logAction(user.id, null, 'password_reset', {
                timestamp: new Date().toISOString()
            });

            // Invalidate all sessions
            await redis.blacklistUserTokens(user.id);

            return true;
        } catch (error) {
            logger.error('Error resetting password:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // Delete user document
            await user.delete();

            // Clear all Redis keys
            await Promise.all([
                redis.deleteKey(`user:${userId}`),
                redis.deleteKey(`user:${userId}:profile`),
                redis.deleteKey(`user:${userId}:devices`),
                redis.deleteKey(`user:${userId}:sessions`),
                redis.deleteKey(`login_attempts:${userId}`),
                redis.deleteKey(`lockout:${userId}`)
            ]);

            logger.info(`Deleted user ${userId}`);
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }

    async updateVerificationStatus(userId, isVerified) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            user.isVerified = isVerified;
            if (isVerified) {
                user.verificationCode = null;
                user.verificationCodeTimestamp = null;
                user.verificationCodeExpiration = null;
                user.verificationAttempts = null;
            }

            await user.save();
            logger.info(`Updated verification status for user ${userId} to ${isVerified}`);
        } catch (error) {
            logger.error('Error updating verification status:', error);
            throw error;
        }
    }

    async handleLoginAttempt(userId, success) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (success) {
                await redis.clearLoginAttempts(userId);
                user.failedLoginAttempts = 0;
                user.lockoutUntil = null;
                user.lastLoginAt = new Date().toISOString();
            } else {
                const attempts = await redis.incrementLoginAttempts(userId);
                user.failedLoginAttempts = attempts;

                if (attempts >= MAX_LOGIN_ATTEMPTS) {
                    user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION);
                    await redis.setUserLockout(userId, LOCKOUT_DURATION);
                }
            }

            await user.save();
        } catch (error) {
            logger.error('Error handling login attempt:', error);
            throw error;
        }
    }

    async isUserLocked(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user || !user.lockoutUntil) {
                return false;
            }

            const isLocked = new Date(user.lockoutUntil) > new Date();
            if (!isLocked) {
                user.lockoutUntil = null;
                user.failedLoginAttempts = 0;
                await user.save();
                await redis.clearLoginAttempts(userId);
            }

            return isLocked;
        } catch (error) {
            logger.error('Error checking user lock status:', error);
            return false;
        }
    }

    async updateOnlineStatus(userId, isOnline) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            user.online = isOnline;
            user.lastSeen = new Date().toISOString();
            await user.save();

            logger.info(`Updated online status for user ${userId} to ${isOnline}`);
        } catch (error) {
            logger.error('Error updating online status:', error);
            throw error;
        }
    }
}

module.exports = new UserService();