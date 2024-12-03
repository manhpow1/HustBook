const { v4: uuidv4 } = require('uuid');
const { collections, createDocument, getDocument, updateDocument, queryDocuments, runTransaction, arrayUnion} = require('../config/database');
const { createError } = require('../utils/customError');
const { generateDeviceToken, hashPassword, comparePassword, generateJWT, verifyJWT, generateRefreshToken } = require('../utils/authHelper');
const logger = require('../utils/logger');
const UserModel = require('../models/User'); // Assuming UserModel is capitalized
const AuditLogModel = require('../models/auditLogModel');

const createUser = async (phoneNumber, password, uuid, verificationCode) => {
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
            tokenVersion: 0, // Initialize tokenVersion
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
};

const getUserByPhoneNumber = async (phoneNumber) => {
    try {
        const users = await queryDocuments(collections.users, (ref) =>
            ref.where('phoneNumber', '==', phoneNumber).limit(1)
        );
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        logger.error('Error fetching user by phone number:', error);
        throw createError('9999', 'Failed to fetch user.');
    }
};

const getUserById = async (userId) => {
    try {
        const userData = await getDocument(collections.users, userId);
        if (!userData) {
            throw createError('9995', 'User not found.');
        }
        return userData;
    } catch (error) {
        logger.error('Error fetching user by ID:', error);
        throw error;
    }
};

const updateUserVerification = async (userId, isVerified, deviceToken) => {
    try {
        await runTransaction(async (transaction) => {
            const userRef = db.collection(collections.users).doc(userId);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw createError('9995', 'User not found.');
            }

            const currentData = userDoc.data();

            // Update only if not already verified or deviceToken needs to be updated
            if (!currentData.isVerified || currentData.deviceToken !== deviceToken) {
                transaction.update(userRef, { isVerified, deviceToken });
                logger.info(`User ${userId} verification status updated to ${isVerified}.`);
            }
        });
    } catch (error) {
        logger.error('Error updating user verification:', error);
        throw createError('9999', 'Failed to update verification status.');
    }
};

const updateUserDeviceInfo = async (userId, deviceToken, deviceId) => {
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
};

const updateUserRefreshToken = async (userId, refreshToken) => {
    try {
        await updateDocument(collections.users, userId, { refreshToken });
        logger.info(`User ${userId} refresh token updated.`);
    } catch (error) {
        logger.error('Error updating refresh token:', error);
        throw createError('9999', 'Failed to update refresh token.');
    }
};

const clearUserDeviceToken = async (userId) => {
    try {
        await updateDocument(collections.users, userId, { deviceToken: null });
        logger.info(`User ${userId} device token cleared.`);
    } catch (error) {
        logger.error('Error clearing device token:', error);
        throw createError('9999', 'Failed to clear device token.');
    }
};

const storeVerificationCode = async (userId, verificationCode) => {
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
            const cooldownPeriod = 1 * 60 * 1000; // 1 minute

            if (currentTime - lastCodeTimestamp < cooldownPeriod) {
                throw createError('1013', 'Please wait before requesting a new verification code.');
            }

            transaction.update(userRef, {
                verificationCode,
                verificationCodeTimestamp: currentTime,
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
};

const updateUserInfo = async (userId, updateData) => {
    try {
        await updateDocument(collections.users, userId, updateData);
        logger.info(`User ${userId} information updated.`);
    } catch (error) {
        logger.error('Error updating user information:', error);
        throw createError('9999', 'Failed to update user information.');
    }
};

const updatePassword = async (userId, newPassword) => {
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
                tokenVersion: currentTokenVersion + 1, // Invalidate existing tokens
            });
            logger.info(`User ${userId} password updated and tokenVersion incremented.`);
        });
    } catch (error) {
        logger.error('Error updating password:', error);
        throw createError('9999', 'Failed to update password.');
    }
};

const setBlock = async (currentUserId, targetUserId, type) => {
    try {
        const user = new UserModel(currentUserId);
        const targetUser = new UserModel(targetUserId);

        if (type === 0) {
            // Block the user
            await user.blockUser(targetUserId);
            await AuditLogModel.logAction(currentUserId, targetUserId, 'block');
            logger.info(`User ${currentUserId} blocked user ${targetUserId}.`);
        } else if (type === 1) {
            // Unblock the user
            await user.unblockUser(targetUserId);
            await AuditLogModel.logAction(currentUserId, targetUserId, 'unblock');
            logger.info(`User ${currentUserId} unblocked user ${targetUserId}.`);
        } else {
            throw createError('1004', 'Invalid type for blocking/unblocking.');
        }
    } catch (error) {
        logger.error('Error in setBlock service:', error);
        throw error;
    }
};

const uploadAvatar = async (avatarFile) => {
    try {
        // TODO: Implement actual upload logic (e.g., AWS S3, Google Cloud Storage)
        // For demonstration, returning a placeholder URL
        const avatarUrl = `http://example.com/avatars/${avatarFile.filename}`;
        logger.info(`Avatar uploaded: ${avatarUrl}`);
        return avatarUrl;
    } catch (error) {
        logger.error('Error uploading avatar:', error);
        throw createError('1007', 'Upload File Failed.');
    }
};

const verifyUserCode = async (userId, code) => {
    try {
        const user = await getUserById(userId);
        const currentTime = Date.now();
        const codeExpirationTime = 5 * 60 * 1000; // 5 minutes

        if (
            user.verificationCode !== code ||
            currentTime - user.verificationCodeTimestamp > codeExpirationTime
        ) {
            return false;
        }

        return true;
    } catch (error) {
        logger.error('Error verifying user code:', error);
        throw createError('9999', 'Failed to verify code.');
    }
};

module.exports = {
    generateDeviceToken,
    hashPassword,
    comparePassword,
    generateJWT,
    verifyJWT,
    generateRefreshToken,
    createUser,
    getUserByPhoneNumber,
    getUserById,
    updateUserVerification,
    updateUserDeviceInfo,
    updateUserRefreshToken,
    clearUserDeviceToken,
    storeVerificationCode,
    updateUserInfo,
    updatePassword,
    setBlock,
    uploadAvatar,
    verifyUserCode,
};