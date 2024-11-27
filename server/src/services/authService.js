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

const createUser = async (phoneNumber, password, uuid, verificationCode) => {
    const hashedPassword = await hashPassword(password);
    const deviceToken = generateDeviceToken();

    // Generate a unique user ID
    const userId = uuidv4();

    await createDocument(collections.users, {
        uid: userId,
        phoneNumber,
        password: hashedPassword, // Store hashed password
        uuid,
        verificationCode,
        verificationCodeTimestamp: Date.now(),
        isVerified: false,
        deviceToken,
    });

    return { userId, verificationCode, deviceToken };
};

const getUserByPhoneNumber = async (phoneNumber) => {
    const users = await queryDocuments(collections.users, (ref) =>
        ref.where('phoneNumber', '==', phoneNumber).limit(1)
    );
    if (users.length === 0) {
        throw createError('9995', 'User not found');
    }
    return users[0];
};

const getUserById = async (userId) => {
    const user = await getDocument(collections.users, userId);
    if (!user) {
        throw createError('9995', 'User not found');
    }
    return user;
};

const updateUserVerification = async (userId, isVerified, deviceToken) => {
    await updateDocument(collections.users, userId, { isVerified, deviceToken });
};

const updateUserDeviceInfo = async (userId, deviceToken, deviceId) => {
    await updateDocument(collections.users, userId, { deviceToken, deviceId });
};

const updateUserRefreshToken = async (userId, refreshToken) => {
    await updateDocument(collections.users, userId, { refreshToken });
    // Invalidate previous tokens if necessary
};

const clearUserDeviceToken = async (userId) => {
    await updateDocument(collections.users, userId, { deviceToken: null });
};

const storeVerificationCode = async (userId, verificationCode) => {
    await updateDocument(collections.users, userId, {
        verificationCode,
        verificationCodeTimestamp: Date.now(),
    });
};

const updateUserInfo = async (userId, updateData) => {
    await updateDocument(collections.users, userId, updateData);
};

const updatePassword = async (userId, newPassword) => {
    const hashedPassword = await hashPassword(newPassword);
    await updateDocument(collections.users, userId, {
        password: hashedPassword,
        passwordUpdatedAt: new Date(),
    });
    // Optionally invalidate all existing sessions
    await clearUserDeviceToken(userId);
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