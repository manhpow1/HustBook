const { v4: uuidv4 } = require('uuid');
const { collections, createDocument, getDocument, updateDocument, queryDocuments } = require('../config/database');
const { createError } = require('../utils/customError');
const {
    generateDeviceToken,
    hashPassword,
    comparePassword,
    generateJWT,
    verifyJWT,
    generateRefreshToken,
} = require('../utils/authHelper');
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

const createUser = async (phoneNumber, password, uuid, verificationCode) => {
    const hashedPassword = await hashPassword(password);
    const deviceToken = generateDeviceToken();

    // Generate a unique user ID
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
    });

    return { userId, verificationCode, deviceToken };
};

const getUserByPhoneNumber = async (phoneNumber) => {
    const users = await queryDocuments(collections.users, (ref) =>
        ref.where('phoneNumber', '==', phoneNumber).limit(1)
    );
    return users.length > 0 ? users[0] : null;
};

const getUserById = async (userId) => {
    const user = await getDocument(collections.users, userId);
    if (!user) {
        throw createError('9995', 'User not found');
    }
    return user;
};

const updateUserVerification = async (userId, isVerified, deviceToken) => {
    try {
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection(collections.users).doc(userId);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw createError('9995', 'User not found');
            }

            const currentData = userDoc.data();

            // Update only if not already verified or if deviceToken needs to be updated
            if (!currentData.isVerified || currentData.deviceToken !== deviceToken) {
                transaction.update(userRef, { isVerified, deviceToken });
            }
        });
    } catch (error) {
        logger.error('Error in updateUserVerification:', error);
        throw createError('9999', 'Exception error');
    }
};

const updateUserDeviceInfo = async (userId, deviceToken, deviceId) => {
    await db.runTransaction(async (transaction) => {
        const userRef = db.collection(collections.users).doc(userId);
        transaction.update(userRef, {
            deviceTokens: admin.firestore.FieldValue.arrayUnion(deviceToken),
            deviceIds: admin.firestore.FieldValue.arrayUnion(deviceId),
        });
    });
};

const updateUserRefreshToken = async (userId, refreshToken) => {
    await updateDocument(collections.users, userId, { refreshToken });
};

const clearUserDeviceToken = async (userId) => {
    await updateDocument(collections.users, userId, { deviceToken: null });
};

const storeVerificationCode = async (userId, verificationCode) => {
    try {
        await db.runTransaction(async (transaction) => {
            const userRef = db.collection(collections.users).doc(userId);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw createError('9995', 'User not found');
            }

            const data = userDoc.data();
            const lastCodeTimestamp = data.verificationCodeTimestamp || 0;
            const currentTime = Date.now();
            const cooldownPeriod = 1 * 60 * 1000; // 1 minute cooldown

            if (currentTime - lastCodeTimestamp < cooldownPeriod) {
                throw createError('1013', 'Please wait before requesting a new verification code.');
            }

            transaction.update(userRef, {
                verificationCode,
                verificationCodeTimestamp: currentTime,
            });
        });
    } catch (error) {
        logger.error('Error in storeVerificationCode:', error);
        if (error.code) {
            throw error;
        }
        throw createError('9999', 'Exception error');
    }
};

const updateUserInfo = async (userId, updateData) => {
    await updateDocument(collections.users, userId, updateData);
};

const updatePassword = async (userId, newPassword) => {
    const hashedPassword = await hashPassword(newPassword);
    await db.runTransaction(async (transaction) => {
        const userRef = db.collection(collections.users).doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
            throw createError('9995', 'User not found');
        }

        const currentTokenVersion = userDoc.data().tokenVersion || 0;

        transaction.update(userRef, {
            password: hashedPassword,
            passwordUpdatedAt: new Date(),
            tokenVersion: currentTokenVersion + 1, // Invalidate tokens
        });
    });
};

module.exports = {
    generateDeviceToken,
    hashPassword,
    comparePassword,
    generateJWT,
    verifyJWT,
    createUser,
    getUserByPhoneNumber,
    getUserById,
    updateUserVerification,
    updateUserDeviceInfo,
    updateUserRefreshToken,
    clearUserDeviceToken,
    storeVerificationCode,
    updateUserInfo,
    generateRefreshToken,
    updatePassword,
};