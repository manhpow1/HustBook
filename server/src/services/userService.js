import { v4 as uuidv4 } from 'uuid';
import { collections, getDocument, queryDocuments } from '../config/database.js';
import { createError } from '../utils/customError.js';
import { generateDeviceToken, hashPassword, comparePassword } from '../utils/authHelper.js';
import { db } from '../config/firebase.js';
import { passwordStrength } from '../validators/userValidator.js';
import redis from '../utils/redis.js';
import logger from '../utils/logger.js';
import User from '../models/userModel.js';
import { handleAvatarUpload, handleCoverPhotoUpload, deleteFileFromStorage } from '../utils/helpers.js';

// Constants
const MAX_DEVICES_PER_USER = 5;
const VERIFICATION_CODE_EXPIRY = 5 * 60 * 1000;
const VERIFICATION_CODE_COOLDOWN = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const PASSWORD_HISTORY_SIZE = 5;

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

            const deviceToken = generateDeviceToken();
            const userId = uuidv4();
            const tokenFamily = uuidv4();
            const hashedPassword = await hashPassword(password);

            // Create new User model instance with all required fields
            const user = new User({
                userId: userId,
                userName: `user_${userId.substring(0, 8)}`,
                phoneNumber,
                password: hashedPassword,
                passwordHistory: [hashedPassword],
                uuid,
                verificationCode,
                verificationCodeExpiration: Date.now() + VERIFICATION_CODE_EXPIRY,
                verificationAttempts: 0,
                isVerified: false,
                deviceIds: [deviceId],
                deviceDetails: [{
                    deviceId: deviceId,
                    token: deviceToken,
                    lastUsed: new Date().toISOString()
                }],
                tokenVersion: 0,
                tokenFamily,
                online: false,
                isBlocked: false,
                isAdmin: false,
                avatar: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastPasswordChange: new Date().toISOString()
            });

            // Save to Firestore and return the saved user
            await user.save();

            logger.info(`User created with ID: ${userId}`);
            return { userId, deviceToken, tokenFamily };

        } catch (error) {
            logger.error('Error creating user:', error);
            throw createError('9999', 'Failed to create user.');
        }
    }

    async updateUserDeviceInfo(userId, deviceToken, deviceId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
                throw createError('9998', 'Valid Device ID is required');
            }

            if (user.deviceIds.length >= MAX_DEVICES_PER_USER && !user.deviceIds.includes(deviceId)) {
                throw createError('9994', 'Maximum number of devices reached');
            }

            // Update device details with validation
            const updatedDevices = user.deviceDetails.filter(d => d.deviceId !== deviceId);
            updatedDevices.push({
                deviceId: deviceId.trim(),
                token: deviceToken,
                lastUsed: new Date().toISOString(),
            });

            // Update user device information with validation
            user.deviceDetails = updatedDevices;
            user.deviceTokens = Array.from(new Set([
                ...(user.deviceTokens || []).filter(Boolean),
                deviceToken
            ]));
            user.deviceIds = Array.from(new Set([
                ...(user.deviceIds || []).filter(Boolean),
                deviceId.trim()
            ]));

            await user.save();
            logger.info(`Updated device info for user ${userId}, device ${deviceId}`);
        } catch (error) {
            logger.error('Error updating device info:', error);
            throw error;
        }
    }

    async updatePassword(req, userId, currentPassword, newPassword) {
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
            // Increment token version and save
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            await user.save();            
            // Force cache clear
            await redis.cache.del(`user:${userId}`);

            await req.app.locals.auditLog.logAction(userId, null, 'password_change', {
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
            const userDoc = await getDocument(collections.users, userId);
            if (!userDoc) {
                throw createError('9995', 'User not found');
            }
            return new User(userDoc);
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
                user.deviceIds = activeDevices.map(d => d.deviceId);

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
            if (!userId || typeof userId !== 'string') {
                throw createError('1004', 'Invalid userId parameter');
            }
            if (!deviceId || typeof deviceId !== 'string') {
                throw createError('1004', 'Invalid deviceId parameter');
            }

            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (!Array.isArray(user.deviceDetails)) {
                throw createError('1004', 'Invalid deviceDetails structure for user');
            }

            const deviceIndex = user.deviceDetails.findIndex(d => d.deviceId === deviceId);
            if (deviceIndex === -1) {
                logger.warn(`Device ${deviceId} not found for user ${userId}`);
                return;
            }

            const updatedDevice = {
                ...user.deviceDetails[deviceIndex],
                token: null,
                lastUsed: new Date().toISOString(),
            };

            const updatedDeviceDetails = [...user.deviceDetails];
            updatedDeviceDetails[deviceIndex] = updatedDevice;

            user.deviceDetails = updatedDeviceDetails;

            user.deviceTokens = updatedDeviceDetails
                .map(d => d.token)
                .filter(Boolean);
            await user.save();
            logger.info(`Cleared device token for user ${userId}, device ${deviceId}`);
        } catch (error) {
            logger.error('Error clearing device token:', error);
            throw error;
        }
    }

    async setBlock(req, userId, targetUserId, type) {
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

            await req.app.locals.auditLog.logAction(userId, targetUserId,
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
                userId: user.userId,
                userName: user.userName,
                avatar: user.avatar,
                coverPhoto: user.coverPhoto,
                bio: user.bio,
                address: user.address,
                city: user.city,
                country: user.country,
                createdAt: user.createdAt,
                friendsCount: user.friendsCount || 0,
                isVerified: user.isVerified,
                lastSeen: user.lastSeen,
                online: user.online,
                version: user.version || 0,
                isAdmin: user.isAdmin || false,
            };
        } catch (error) {
            logger.error('Error getting user info:', error);
            throw error;
        }
    }

    // In userService.js
    async changeInfoAfterSignup(userId, userName, avatarUrl, userNameLowerCase) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (!userName) {
                throw createError('1002', 'Username is required');
            }

            const currentTime = Date.now();
            const lastModifiedAt = user.lastModifiedAt || 0;
            if (currentTime - lastModifiedAt < 1000) {
                throw createError('1003', 'Please wait before updating again');
            }

            // Check username uniqueness if userName is being updated
            if (userNameLowerCase && userNameLowerCase.length > 0) {
                const existingUser = await db.collection('users')
                    .where('userNameLowerCase', 'array-contains-any', userNameLowerCase)
                    .where('userId', '!=', userId)
                    .get();

                if (!existingUser.empty) {
                    throw createError('1002', 'Username already taken');
                }
            }

            // Update user data
            user.userName = userName;
            user.userNameLowerCase = userNameLowerCase;

            // Update avatar if new one was uploaded
            if (avatarUrl) {
                // Delete old avatar if it exists
                if (user.avatar) {
                    try {
                        await deleteFileFromStorage(user.avatar);
                        logger.info('Deleted old avatar', { userId });
                    } catch (deleteError) {
                        logger.warn('Failed to delete old avatar', {
                            userId,
                            error: deleteError.message
                        });
                    }
                }
                user.avatar = avatarUrl;
            }

            user.lastModifiedAt = currentTime;
            user.version = (user.version || 0) + 1;
            user.updatedAt = new Date().toISOString();

            await user.save();

            logger.info('User info updated after signup', {
                userId,
                userName,
                userNameLowerCase,
                hasAvatar: !!avatarUrl
            });

            return {
                userId: user.userId,
                userName: user.userName,
                avatar: user.avatar,
                version: user.version,
                updatedAt: user.updatedAt,
                userNameLowerCase: user.userNameLowerCase
            };

        } catch (error) {
            logger.error('Error updating user info after signup:', error, { userId });
            throw error;
        }
    }

    async setUserInfo(userId, updateData) {
        try {
            return await db.runTransaction(async (transaction) => {
                const userRef = db.collection('users').doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const currentData = userDoc.data();
                const currentVersion = currentData.version || 0;

                if (updateData.version < currentVersion) {
                    throw createError('1009', 'concurrent modifications detected');
                }

                const normalizeText = (text) => {
                    if (!text) return text;
                    return text.normalize('NFC');
                };

                const textFields = ['userName', 'bio', 'address', 'city', 'country'];
                const sanitizedData = {};

                for (const field of textFields) {
                    if (updateData[field] !== undefined) {
                        sanitizedData[field] = normalizeText(updateData[field]);
                    }
                }

                if (sanitizedData.userName) {
                    sanitizedData.userNameLowerCase = sanitizedData.userName
                        .toLowerCase()
                        .split(/\s+/)
                        .filter(Boolean);
                }

                if (updateData.coverPhoto) {
                    sanitizedData.coverPhoto = updateData.coverPhoto;
                    logger.debug('Adding cover photo to update:', { coverPhoto: updateData.coverPhoto });
                }

                if (updateData.avatar) {
                    sanitizedData.avatar = updateData.avatar;
                    logger.debug('Adding avatar to update:', { avatar: updateData.avatar });
                }

                // Handle file deletions
                if (updateData.existingAvatar === '') {
                    sanitizedData.avatar = '';
                    logger.debug('Clearing avatar');
                }

                if (updateData.existingCoverPhoto === '') {
                    sanitizedData.coverPhoto = '';
                    logger.debug('Clearing cover photo');
                }

                const updatePayload = {
                    ...sanitizedData,
                    version: currentVersion + 1,
                    lastModifiedAt: Date.now(),
                    updatedAt: new Date().toISOString()
                };

                logger.debug('Final update payload:', { updatePayload });

                transaction.update(userRef, updatePayload);

                return {
                    ...updatePayload,
                    userId
                };
            });
        } catch (error) {
            logger.error('Error updating user info:', {
                userId,
                error: error.message,
                stack: error.stack,
                updateData: JSON.stringify(updateData)
            });
            throw error;
        }
    }

    async resetPassword(req, phoneNumber, verifyCode, newPassword) {
        try {
            logger.info('Starting password reset verification', { phoneNumber });

            const user = await this.getUserByphoneNumber(phoneNumber);
            if (!user) {
                logger.warn('User not found during password reset', { phoneNumber });
                throw createError('9995', 'User not found');
            }

            // Verify code
            const verificationRef = db.collection('verificationCodes').doc(phoneNumber);
            const verificationDoc = await verificationRef.get();

            if (!verificationDoc.exists) {
                logger.warn('Verification code not found', { phoneNumber });
                throw createError('9993', 'Verification code has expired or does not exist');
            }

            const verificationData = verificationDoc.data();

            // Validate verification code type
            if (verificationData.type !== 'password_reset') {
                logger.warn('Invalid verification code type', {
                    expected: 'password_reset',
                    received: verificationData.type
                });
                throw createError('9993', 'Invalid verification code');
            }

            // Check expiration
            if (Date.now() > verificationData.expiresAt.toDate().getTime()) {
                logger.warn('Verification code expired', {
                    expiredAt: verificationData.expiresAt.toDate()
                });
                await verificationRef.delete();
                throw createError('9993', 'Verification code has expired');
            }

            // Verify code match
            if (verificationData.verifyCode !== verifyCode) {
                logger.warn('Invalid verification code provided', { phoneNumber });

                const attempts = (verificationData.attempts || 0) + 1;
                if (attempts >= 5) {
                    await verificationRef.delete();
                    throw createError('9993', 'Maximum verification attempts exceeded');
                }

                await verificationRef.update({ attempts });
                throw createError('9993', 'Invalid verification code');
            }

            // Validate password strength
            if (!passwordStrength(newPassword)) {
                logger.warn('Password strength check failed', { userId: user.userId });
                throw createError('9997', 'New password does not meet security requirements');
            }

            // Check password history
            const isPasswordReused = await Promise.any(
                user.passwordHistory.map(async (hashedPwd) => comparePassword(newPassword, hashedPwd))
            ).catch(() => false);

            if (isPasswordReused) {
                logger.warn('Password reuse detected', { userId: user.userId });
                throw createError('9992', 'Password has been used recently');
            }

            // Update password
            const hashedPassword = await hashPassword(newPassword);
            user.password = hashedPassword;
            user.passwordHistory = [hashedPassword, ...user.passwordHistory].slice(0, PASSWORD_HISTORY_SIZE);
            user.lastPasswordChange = new Date().toISOString();
            user.tokenVersion += 1;

            // Save changes and cleanup
            await Promise.all([
                user.save(),
                verificationRef.delete(),
                req.app.locals.auditLog.logAction(user.userId, null, 'password_reset', {
                    deviceId: req.get('Device-ID'),
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                })
            ]);

            logger.info('Password reset completed successfully', { userId: user.userId });
            return { success: true };

        } catch (error) {
            logger.error('Password reset failed', {
                error: error.message,
                code: error.code,
                phoneNumber
            });
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }
            await user.delete();
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

    async removeUserDevice(userId, deviceId, req = null) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            if (!deviceId || typeof deviceId !== 'string') {
                throw createError('9998', 'Valid Device ID is required');
            }

            // Remove device from arrays
            user.deviceDetails = user.deviceDetails.filter(d => d.deviceId !== deviceId);
            user.deviceIds = user.deviceIds.filter(d => d !== deviceId);
            
            // Remove associated token
            const deviceInfo = user.deviceDetails.find(d => d.deviceId === deviceId);
            if (deviceInfo) {
                user.deviceTokens = user.deviceTokens.filter(t => t !== deviceInfo.token);
            }

            await user.save();

            // Log the device removal if request object is provided
            if (req) {
                await req.app.locals.auditLog.logAction(userId, null, 'device_removed', {
                    deviceId,
                    ip: req.ip,
                    timestamp: new Date().toISOString()
                });
            }

            logger.info(`Removed device ${deviceId} for user ${userId}`);
            return true;
        } catch (error) {
            logger.error('Error removing device:', error);
            throw error;
        }
    }

    async isUserBlocked(userId, targetUserId) {
        try {
            const user = await this.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found');
            }

            // Check if the target user is in the blocked list
            return user.blockedUsers?.includes(targetUserId) || false;
        } catch (error) {
            logger.error('Error checking blocked status:', error);
            throw error;
        }
    }
}

export default new UserService();
