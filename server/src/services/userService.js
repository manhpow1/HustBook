const { v4: uuidv4 } = require('uuid');
const { collections, db, createDocument, getDocument, updateDocument, queryDocuments, runTransaction, arrayUnion, } = require('../config/database');
const { createError } = require('../utils/customError');
const { generateDeviceToken, hashPassword } = require('../utils/authHelper');
const logger = require('../utils/logger');
const User = require('../models/userModel');
const AuditLogModel = require('../models/auditLogModel');

class userService {
    async createUser(phoneNumber, password, uuid, verificationCode) {
        try {
            const hashedPassword = await hashPassword(password);
            const deviceToken = generateDeviceToken();
            const userId = uuidv4();

            await createDocument(collections.users, {
                uid: userId,
                phoneNumber,
                password: hashedPassword,
                uuid,
                verificationCode,
                verificationCodeTimestamp: Date.now(),
                isVerified: false,
                deviceToken,
                tokenVersion: 0,
                createdAt: new Date().toISOString(),
                online: false,
                isBlocked: false,
            });

            logger.info(`User created with ID: ${userId}`);
            return { userId, deviceToken };
        } catch (error) {
            logger.error('Error creating user:', error);
            throw createError('9999', 'Failed to create user.');
        }
    }

    async getUserByphoneNumber(phoneNumber) {
        try {
            const users = await queryDocuments(collections.users, (ref) =>
                ref.where('phoneNumber', '==', phoneNumber).limit(1)
            );
            return users.length > 0 ? users[0] : null;
        } catch (error) {
            logger.error('Error fetching user by phone number:', error);
            throw createError('9999', 'Failed to fetch user.');
        }
    }

    async getUserById(userId) {
        try {
            const userRef = db.collection(collections.users).doc(userId);
            const userDoc = await userRef.get();
            return userDoc.exists ? userDoc.data() : null;
        } catch (error) {
            logger.error('Error fetching user by ID:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getFriendCount(userId) {
        try {
            const friendsSnapshot = await db.collection(collections.friends)
                .doc(userId)
                .collection('userFriends')
                .get();
            return friendsSnapshot.size.toString();
        } catch (error) {
            logger.error('Error fetching friend count:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async areUsersFriends(userIdA, userIdB) {
        // Check if B is in A's userFriends collection
        try {
            const friendDoc = await db.collection(collections.friends)
                .doc(userIdA)
                .collection('userFriends')
                .doc(userIdB)
                .get();
            return friendDoc.exists;
        } catch (error) {
            logger.error('Error checking friendship:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async updateUserVerification(userId, isVerified, deviceToken) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found.');
                }

                const currentData = userDoc.data();

                if (!currentData.isVerified || currentData.deviceToken !== deviceToken) {
                    transaction.update(userRef, { isVerified, deviceToken });
                    logger.info(`User ${userId} verification status updated to ${isVerified}.`);
                }
            });
        } catch (error) {
            logger.error('Error updating user verification:', error);
            throw createError('9999', 'Failed to update verification status.');
        }
    }

    async updateUserDeviceInfo(userId, deviceToken, deviceId) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                transaction.update(userRef, {
                    deviceTokens: arrayUnion(deviceToken),
                    deviceIds: arrayUnion(deviceId),
                });
                logger.info(`User ${userId} device info updated.`);
            });
        } catch (error) {
            logger.error('Error updating user device info:', error);
            throw createError('9999', 'Failed to update device information.');
        }
    }

    async updateTokenInfo(userId, tokenInfo) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found.');
                }

                // Update token information atomically
                transaction.update(userRef, {
                    ...tokenInfo,
                    tokenUpdatedAt: new Date().toISOString()
                });

                // Update cache if exists
                const cachedUser = await cache.get(`user:${userId}`);
                if (cachedUser) {
                    await cache.set(`user:${userId}`, {
                        ...cachedUser,
                        ...tokenInfo,
                        tokenUpdatedAt: new Date().toISOString()
                    }, 3600);
                }

                logger.info(`Token info updated for user ${userId}`);
            });
        } catch (error) {
            logger.error('Error updating token info:', error);
            throw createError('9999', 'Failed to update token information.');
        }
    }

    async invalidateAllTokens(userId) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found.');
                }

                // Increment token version and generate new family
                const newTokenVersion = (userDoc.data().tokenVersion || 0) + 1;
                const newTokenFamily = uuidv4();

                // Update user document
                transaction.update(userRef, {
                    tokenVersion: newTokenVersion,
                    tokenFamily: newTokenFamily,
                    refreshToken: null,
                    deviceToken: null,
                    deviceTokens: [],
                    tokenUpdatedAt: new Date().toISOString(),
                    lastInvalidation: new Date().toISOString()
                });

                // Clear user from cache
                await cache.del(`user:${userId}`);

                // Log invalidation event
                logger.info(`All tokens invalidated for user ${userId}`);

                // Create audit log entry
                await AuditLogModel.logAction(userId, null, 'token_invalidation', {
                    reason: 'security_measure',
                    tokenVersion: newTokenVersion
                });
            });
        } catch (error) {
            logger.error('Error invalidating tokens:', error);
            throw createError('9999', 'Failed to invalidate tokens.');
        }
    }

    async clearUserDeviceToken(userId) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                
                transaction.update(userRef, { 
                    deviceToken: null,
                    deviceTokens: [],
                    lastTokenClear: new Date().toISOString()
                });

                // Clear relevant cache entries
                await Promise.all([
                    cache.del(`user:${userId}`),
                    cache.del(`auth:${userId}:requests`)
                ]);

                logger.info(`User ${userId} device tokens cleared.`);
            });
        } catch (error) {
            logger.error('Error clearing device token:', error);
            throw createError('9999', 'Failed to clear device token.');
        }
    }

async storeVerificationCode(userId, verificationCode) {
        try {
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found.');
                }

                const data = userDoc.data();
                const lastCodeTimestamp = data.verificationCodeTimestamp || 0;
                const currentTime = Date.now();
                const cooldownPeriod = 1 * 60 * 1000;

                if (currentTime - lastCodeTimestamp < cooldownPeriod) {
                    throw createError('1013', 'Please wait before requesting a new verification code.');
                }

                // Hash verification code before storing
                const hashedCode = await hashPassword(verificationCode);
                
                // Store hashed code with expiration
                const codeExpiration = currentTime + (5 * 60 * 1000); // 5 minutes expiration
                
                transaction.update(userRef, {
                    verificationCode: hashedCode,
                    verificationCodeTimestamp: currentTime,
                    verificationCodeExpiration: codeExpiration,
                    verificationAttempts: 0 // Reset attempts counter
                });
                logger.info(`Verification code for user ${userId} stored.`);
            });
        } catch (error) {
            logger.error('Error storing verification code:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Failed to store verification code.');
        }
    }

    async updateUserInfo(userId, updateData) {
        try {
            await updateDocument(collections.users, userId, updateData);
            const updatedUser = await this.getUserById(userId);
            return updatedUser;
        } catch (error) {
            logger.error(`Error updating user info for user ${userId}:`, error);
            throw createError('9999', 'Exception error');
        }
    }

    async updatePassword(userId, newPassword) {
        try {
            const hashedPassword = await hashPassword(newPassword);
            await runTransaction(async (transaction) => {
                const userRef = db.collection(collections.users).doc(userId);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    throw createError('9995', 'User not found.');
                }

                const currentTokenVersion = userDoc.data().tokenVersion || 0;

                transaction.update(userRef, {
                    password: hashedPassword,
                    passwordUpdatedAt: new Date().toISOString(),
                    tokenVersion: currentTokenVersion + 1,
                });
                logger.info(`User ${userId} password updated and tokenVersion incremented.`);
            });
        } catch (error) {
            logger.error('Error updating password:', error);
            throw createError('9999', 'Failed to update password.');
        }
    }

    async setBlock(currentUserId, targetUserId, type) {
        try {
            const currentUserData = await getDocument('users', currentUserId);
            if (!currentUserData) {
                throw createError('9995', 'Current user not found.');
            }

            const user = new User(currentUserData);

            if (type === 0) {
                await user.blockUser(targetUserId);
                await AuditLogModel.logAction(currentUserId, targetUserId, 'block');
                logger.info(`User ${currentUserId} blocked user ${targetUserId}`);
            } else {
                await user.unblockUser(targetUserId);
                await AuditLogModel.logAction(currentUserId, targetUserId, 'unblock');
                logger.info(`User ${currentUserId} unblocked user ${targetUserId}`);
            }
        } catch (error) {
            logger.error(`Error in setBlock for user ${currentUserId} on user ${targetUserId}:`, error);
            throw error;
        }
    }

    async isUserBlocked(blockerId, blockedId) {
        const blockerUser = await this.getUserById(blockerId);
        if (!blockerUser) throw createError('9995', 'User not found.');
    
        const blockedUsers = blockerUser.blockedUsers || [];
        return blockedUsers.includes(blockedId);
    }

    async uploadAvatar(avatarFile) {
        try {
            const avatarUrl = `http://example.com/avatars/${avatarFile.filename}`;
            logger.info(`Avatar uploaded: ${avatarUrl}`);
            return avatarUrl;
        } catch (error) {
            logger.error('Error uploading avatar:', error);
            throw createError('1007', 'Upload File Failed.');
        }
    }

async verifyUserCode(userId, code) {
        try {
            const user = await this.getUserById(userId);
            const currentTime = Date.now();
            const maxAttempts = 5;

            // Check if code has expired
            if (currentTime > user.verificationCodeExpiration) {
                throw createError('9993', 'Verification code has expired.');
            }

            // Check attempts limit
            if (user.verificationAttempts >= maxAttempts) {
                throw createError('9993', 'Maximum verification attempts exceeded. Please request a new code.');
            }

            // Increment attempts counter
            await updateDocument(collections.users, userId, {
                verificationAttempts: (user.verificationAttempts || 0) + 1
            });

            // Verify hashed code
            const isValid = await comparePassword(code, user.verificationCode);
            
            if (!isValid) {
                throw createError('9993', 'Invalid verification code.');
            }

            // Clear verification data after successful verification
            await updateDocument(collections.users, userId, {
                verificationCode: null,
                verificationCodeTimestamp: null,
                verificationCodeExpiration: null,
                verificationAttempts: null
            });

            return true;
        } catch (error) {
            logger.error('Error verifying user code:', error);
            throw createError('9999', 'Failed to verify code.');
        }
    }
}

module.exports = new userService();
