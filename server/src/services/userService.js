const { v4: uuidv4 } = require('uuid');
const { collections, createDocument, getDocument, updateDocument, queryDocuments, runTransaction, arrayUnion, } = require('../config/database');
const { db } = require('../config/firebase');
const { createError } = require('../utils/customError');
const { generateDeviceToken, hashPassword, comparePassword, generateSecureToken } = require('../utils/authHelper');
const { passwordStrength } = require('../validators/userValidator');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const User = require('../models/userModel');
const AuditLogModel = require('../models/auditLogModel');

// Constants
const MAX_DEVICES_PER_USER = 5;
const VERIFICATION_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const VERIFICATION_CODE_COOLDOWN = 60 * 1000; // 1 minute
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;
const PASSWORD_HISTORY_SIZE = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

class UserService {
    async createUser(phoneNumber, password, uuid, verificationCode, deviceId) {
        try {
            // Check for valid password strength
            if (!passwordStrength(password)) {
                throw createError('9997', 'Password does not meet security requirements');
            }

            // Check for existing verified account
            const existingUser = await this.getUserByphoneNumber(phoneNumber);
            if (existingUser && existingUser.isVerified) {
                throw createError('9996', 'Phone number already registered');
            }

            // Hash password and generate tokens
            const hashedPassword = await hashPassword(password);
            const deviceToken = generateDeviceToken();
            const initialTokenVersion = 0;
            const tokenFamily = uuidv4();
            const userId = uuidv4();

            // Create user document with enhanced security fields
            await createDocument(collections.users, {
                uid: userId,
                phoneNumber,
                password: hashedPassword,
                passwordHistory: [hashedPassword], // Store password history
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
                    lastUsed: new Date().toISOString(),
                    ip: null, // Will be updated by controller
                    userAgent: null // Will be updated by controller
                }],
                tokenVersion: initialTokenVersion,
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
                isAdmin: false, // Initialize new users as non-admin by default
                securityLevel: 'standard', // Can be: standard, enhanced, maximum
                twoFactorEnabled: false,
                allowedIPs: [], // For IP whitelisting
                lastSecurityAudit: new Date().toISOString()
            });

            logger.info(`User created with ID: ${userId}`);

            // Initialize rate limiting and security metrics in Redis
            await Promise.all([
                redis.setLoginAttempts(userId, 0),
                redis.setVerificationAttempts(userId, 0),
                redis.setKey(`user:${userId}:devices`, JSON.stringify([deviceId]))
            ]);

            return { userId, deviceToken, tokenFamily };
        } catch (error) {
            logger.error('Error creating user:', error);
            throw createError('9999', 'Failed to create user.');
        }
    }

    async updateUserDeviceInfo(userId, deviceToken, deviceId, deviceInfo = {}) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);
                
                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const devices = userData.deviceDetails || [];

                // Check device limit
                if (!devices.some(d => d.id === deviceId) && devices.length >= MAX_DEVICES_PER_USER) {
                    throw createError('9994', 'Maximum number of devices reached');
                }

                // Update or add device info
                const updatedDevices = devices.filter(d => d.id !== deviceId);
                updatedDevices.push({
                    id: deviceId,
                    token: deviceToken,
                    lastUsed: new Date().toISOString(),
                    ...deviceInfo
                });

                transaction.update(userRef, {
                    deviceTokens: arrayUnion(deviceToken),
                    deviceIds: arrayUnion(deviceId),
                    deviceDetails: updatedDevices,
                    updatedAt: new Date().toISOString()
                });

                // Update Redis cache
                await redis.setKey(`user:${userId}:devices`, JSON.stringify(updatedDevices));
                logger.info(`Updated device info for user ${userId}, device ${deviceId}`);
            });
        } catch (error) {
            logger.error('Error updating device info:', error);
            throw error;
        }
    }

    async removeDevice(userId, deviceId) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);
                
                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const devices = userData.deviceDetails || [];
                const deviceToRemove = devices.find(d => d.id === deviceId);

                if (!deviceToRemove) {
                    throw createError('9994', 'Device not found');
                }

                // Remove device info
                const updatedDevices = devices.filter(d => d.id !== deviceId);
                const updatedTokens = userData.deviceTokens.filter(t => t !== deviceToRemove.token);
                const updatedIds = userData.deviceIds.filter(id => id !== deviceId);

                transaction.update(userRef, {
                    deviceTokens: updatedTokens,
                    deviceIds: updatedIds,
                    deviceDetails: updatedDevices,
                    updatedAt: new Date().toISOString()
                });

                // Update Redis cache and blacklist removed token
                await Promise.all([
                    redis.setKey(`user:${userId}:devices`, JSON.stringify(updatedDevices)),
                    redis.blacklistToken(deviceToRemove.token)
                ]);

                logger.info(`Removed device ${deviceId} for user ${userId}`);
            });
        } catch (error) {
            logger.error('Error removing device:', error);
            throw error;
        }
    }

    async updatePassword(userId, currentPassword, newPassword) {
        try {
            // Validate password strength
            if (!passwordStrength(newPassword)) {
                throw createError('9997', 'New password does not meet security requirements');
            }

            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();

                // Verify current password
                const isValidPassword = await comparePassword(currentPassword, userData.password);
                if (!isValidPassword) {
                    throw createError('9993', 'Current password is incorrect');
                }

                // Check password history
                const passwordHistory = userData.passwordHistory || [];
                const isPasswordReused = await Promise.any(
                    passwordHistory.map(async (hashedPwd) => comparePassword(newPassword, hashedPwd))
                ).catch(() => false);

                if (isPasswordReused) {
                    throw createError('9992', 'Password has been used recently');
                }

                // Hash and update password
                const hashedPassword = await hashPassword(newPassword);
                const updatedHistory = [hashedPassword, ...passwordHistory].slice(0, PASSWORD_HISTORY_SIZE);

                transaction.update(userRef, {
                    password: hashedPassword,
                    passwordHistory: updatedHistory,
                    lastPasswordChange: new Date().toISOString(),
                    tokenVersion: (userData.tokenVersion || 0) + 1,
                    updatedAt: new Date().toISOString()
                });

                // Audit log
                await AuditLogModel.logAction(userId, null, 'password_change', {
                    timestamp: new Date().toISOString()
                });

                logger.info(`Password updated for user ${userId}`);
            });
        } catch (error) {
            logger.error('Error updating password:', error);
            throw error;
        }
    }

    async verifyUserCode(userId, code) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const currentTime = Date.now();

                // Check code expiration
                if (currentTime > userData.verificationCodeExpiration) {
                    throw createError('9993', 'Verification code has expired');
                }

                // Check attempts limit
                if (userData.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
                    throw createError('9993', 'Maximum verification attempts exceeded');
                }

                // Verify code
                const isValid = await comparePassword(code, userData.verificationCode);
                if (!isValid) {
                    // Increment attempts
                    transaction.update(userRef, {
                        verificationAttempts: (userData.verificationAttempts || 0) + 1,
                        updatedAt: new Date().toISOString()
                    });
                    throw createError('9993', 'Invalid verification code');
                }

                // Clear verification data on success
                transaction.update(userRef, {
                    verificationCode: null,
                    verificationCodeTimestamp: null,
                    verificationCodeExpiration: null,
                    verificationAttempts: null,
                    isVerified: true,
                    updatedAt: new Date().toISOString()
                });

                logger.info(`User ${userId} verified successfully`);
            });

            return true;
        } catch (error) {
            logger.error('Error verifying code:', error);
            throw error;
        }
    }

    async storeVerificationCode(userId, verificationCode) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const currentTime = Date.now();
                const lastCodeTime = userData.verificationCodeTimestamp || 0;

                // Check cooldown period
                if (currentTime - lastCodeTime < VERIFICATION_CODE_COOLDOWN) {
                    throw createError('1013', 'Please wait before requesting a new code');
                }

                // Hash code and set expiration
                const hashedCode = await hashPassword(verificationCode);
                const codeExpiration = currentTime + VERIFICATION_CODE_EXPIRY;

                transaction.update(userRef, {
                    verificationCode: hashedCode,
                    verificationCodeTimestamp: currentTime,
                    verificationCodeExpiration: codeExpiration,
                    verificationAttempts: 0,
                    updatedAt: new Date().toISOString()
                });

                logger.info(`Verification code stored for user ${userId}`);
            });
        } catch (error) {
            logger.error('Error storing verification code:', error);
            throw error;
        }
    }

    // Include other existing methods...
    // getUserByphoneNumber, getUserById, getFriendCount, etc.
    
    async getUserById(userId) {
        try {
            // Try to get from cache first
            const cached = await redis.getKey(`user:${userId}`);
            if (cached) {
                return JSON.parse(cached);
            }

            const userDoc = await getDocument(collections.users, userId);
            if (!userDoc) {
                throw createError('9995', 'User not found');
            }

            // Cache the result
            await redis.setKey(`user:${userId}`, JSON.stringify(userDoc), 3600); // 1 hour cache
            return userDoc;
        } catch (error) {
            logger.error('Error getting user by ID:', error);
            throw error;
        }
    }

    async changeInfoAfterSignup(userId, userName, avatarUrl = null) {
        try {
            return await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);
                
                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const currentTime = Date.now();
                const lastModifiedAt = userData.lastModifiedAt || 0;
                
                // Check for rapid updates first
                if (currentTime - lastModifiedAt < 1000) {
                    throw createError('1003', 'Please wait a moment before updating again');
                }

                // Prepare update data after version check
                const currentVersion = userData.version || 0;
                const newVersion = currentVersion + 1;

                const updateData = {
                    userName,
                    updatedAt: new Date().toISOString(),
                    lastModifiedAt: currentTime,
                    version: newVersion
                };

                if (avatarUrl !== null) {
                    updateData.avatar_url = avatarUrl;
                }

                transaction.update(userRef, updateData);
                
                // Clear user cache to ensure fresh data
                await redis.deleteKey(`user:${userId}`);
                
                logger.info(`Updated user info after signup for user ${userId}`);

                return {
                    ...userData,
                    ...updateData
                };
            });
        } catch (error) {
            logger.error('Error updating user info after signup:', error);
            throw error;
        }
    }

    async cleanupInactiveDevices(userId) {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const devices = userData.deviceDetails || [];

                // Filter out inactive devices
                const activeDevices = devices.filter(device => 
                    new Date(device.lastUsed) > thirtyDaysAgo
                );

                if (activeDevices.length !== devices.length) {
                    transaction.update(userRef, {
                        deviceDetails: activeDevices,
                        deviceTokens: activeDevices.map(d => d.token),
                        deviceIds: activeDevices.map(d => d.id),
                        updatedAt: new Date().toISOString()
                    });

                    // Update Redis cache
                    await redis.setKey(`user:${userId}:devices`, JSON.stringify(activeDevices));
                    logger.info(`Cleaned up inactive devices for user ${userId}`);
                }
            });
        } catch (error) {
            logger.error('Error cleaning up inactive devices:', error);
            throw error;
        }
    }

    async clearUserDeviceToken(userId, deviceId) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const devices = userData.deviceDetails || [];
                const deviceIndex = devices.findIndex(d => d.id === deviceId);

                if (deviceIndex === -1) {
                    // If device not found, just return without error
                    return;
                }

                // Clear device token
                devices[deviceIndex] = {
                    ...devices[deviceIndex],
                    token: null,
                    refreshToken: null,
                    lastUsed: new Date().toISOString()
                };

                transaction.update(userRef, {
                    deviceDetails: devices,
                    deviceTokens: devices.map(d => d.token).filter(Boolean),
                    updatedAt: new Date().toISOString()
                });

                logger.info(`Cleared device token for user ${userId}, device ${deviceId}`);
            });
        } catch (error) {
            logger.error('Error clearing device token:', error);
            throw error;
        }
    }

    async updateVerificationStatus(userId, isVerified) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                transaction.update(userRef, {
                    isVerified,
                    updatedAt: new Date().toISOString(),
                    ...(isVerified && {
                        verificationCode: null,
                        verificationCodeTimestamp: null,
                        verificationCodeExpiration: null,
                        verificationAttempts: null
                    })
                });

                logger.info(`Updated verification status for user ${userId} to ${isVerified}`);
            });
        } catch (error) {
            logger.error('Error updating verification status:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                // Delete user document
                transaction.delete(userRef);

                // Clear Redis keys
                await Promise.all([
                    redis.deleteKey(`user:${userId}`),
                    redis.deleteKey(`user:${userId}:profile`),
                    redis.deleteKey(`user:${userId}:devices`),
                    redis.deleteKey(`user:${userId}:sessions`),
                    redis.deleteKey(`login_attempts:${userId}`),
                    redis.deleteKey(`lockout:${userId}`)
                ]);

                logger.info(`Deleted user ${userId}`);
            });
        } catch (error) {
            logger.error('Error deleting user:', error);
            throw error;
        }
    }

    async getUserByphoneNumber(phoneNumber) {
        try {
            // Query by phone number
            const querySnapshot = await queryDocuments(collections.users, 'phoneNumber', '==', phoneNumber);
            if (querySnapshot.length === 0) return null;

            return querySnapshot[0];
        } catch (error) {
            logger.error('Error getting user by phone:', error);
            throw error;
        }
    }

    async setBlock(userId, targetUserId, type) {
        try {
            await runTransaction(async (transaction) => {
                // Get both users
                const userRef = db.collection(collections.users).doc(userId);
                const targetRef = db.collection(collections.users).doc(targetUserId);
                
                const [userDoc, targetDoc] = await Promise.all([
                    transaction.get(userRef),
                    transaction.get(targetRef)
                ]);

                if (!userDoc.exists || !targetDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const blockedUsers = userData.blockedUsers || [];

                if (type === 0) { // Block
                    if (!blockedUsers.includes(targetUserId)) {
                        transaction.update(userRef, {
                            blockedUsers: arrayUnion(targetUserId),
                            updatedAt: new Date().toISOString()
                        });
                        
                        // Log block action
                        await AuditLogModel.logAction(userId, targetUserId, 'block_user', {
                            timestamp: new Date().toISOString()
                        });
                    }
                } else { // Unblock
                    if (blockedUsers.includes(targetUserId)) {
                        transaction.update(userRef, {
                            blockedUsers: blockedUsers.filter(id => id !== targetUserId),
                            updatedAt: new Date().toISOString()
                        });
                        
                        // Log unblock action
                        await AuditLogModel.logAction(userId, targetUserId, 'unblock_user', {
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                // Clear cache
                await redis.deleteKey(`user:${userId}`);
                logger.info(`User ${userId} ${type === 0 ? 'blocked' : 'unblocked'} user ${targetUserId}`);
            });
        } catch (error) {
            logger.error('Error setting block status:', error);
            throw error;
        }
    }

    async setUserInfo(userId, updateData) {
        try {
            return await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const userData = userDoc.data();
                const updatedInfo = {
                    ...updateData,
                    updatedAt: new Date().toISOString(),
                    lastModifiedAt: Date.now(),
                    version: (userData.version || 0) + 1
                };

                // Optimistic locking check
                const currentVersion = userData.version || 0;
                const lastModifiedAt = userData.lastModifiedAt || 0;
                
                if (Date.now() - lastModifiedAt < 1000) {
                    throw createError('1003', 'Please wait a moment before updating again');
                }

                if (currentVersion !== updatedInfo.version - 1) {
                    throw createError('9999', 'Data was modified by another request');
                }

                transaction.update(userRef, updatedInfo);
                
                // Clear cache
                await redis.deleteKey(`user:${userId}`);
                logger.info(`Updated user info for user ${userId}`);

                return {
                    ...userData,
                    ...updatedInfo
                };
            });
        } catch (error) {
            logger.error('Error updating user info:', error);
            throw error;
        }
    }

    async resetPassword(phoneNumber, code, newPassword) {
        try {
            // Get user by phone number
            const user = await this.getUserByphoneNumber(phoneNumber);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // Validate password strength
            if (!passwordStrength(newPassword)) {
                throw createError('9997', 'New password does not meet security requirements');
            }

            // Verify the code
            await this.verifyUserCode(user.uid, code);

            // Hash and update password
            const hashedPassword = await hashPassword(newPassword);
            
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(user.uid);
                const userDoc = await transaction.get(userRef);
                const userData = userDoc.data();
                const passwordHistory = userData.passwordHistory || [];

                // Check password history
                const isPasswordReused = await Promise.any(
                    passwordHistory.map(async (hashedPwd) => comparePassword(newPassword, hashedPwd))
                ).catch(() => false);

                if (isPasswordReused) {
                    throw createError('9992', 'Password has been used recently');
                }

                const updatedHistory = [hashedPassword, ...passwordHistory].slice(0, PASSWORD_HISTORY_SIZE);

                transaction.update(userRef, {
                    password: hashedPassword,
                    passwordHistory: updatedHistory,
                    lastPasswordChange: new Date().toISOString(),
                    tokenVersion: (userData.tokenVersion || 0) + 1,
                    updatedAt: new Date().toISOString(),
                    // Clear verification data
                    verificationCode: null,
                    verificationCodeTimestamp: null,
                    verificationCodeExpiration: null,
                    verificationAttempts: null
                });

                // Log password reset
                await AuditLogModel.logAction(user.uid, null, 'password_reset', {
                    timestamp: new Date().toISOString()
                });
            });

            // Invalidate all sessions
            await redis.blacklistUserTokens(user.uid);
            
            return true;
        } catch (error) {
            logger.error('Error resetting password:', error);
            throw error;
        }
    }

    async getUserInfo(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // Return only necessary fields
            return {
                uid: user.uid,
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
}

module.exports = new UserService();
