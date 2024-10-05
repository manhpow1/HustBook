const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { collections, createDocument, getDocument, updateDocument, queryDocuments } = require('../config/database');
const { auth } = require('../config/firebase');
const env = require('../config/env');

const SALT_ROUNDS = 10;
const JWT_SECRET = env.jwt.secret;
const JWT_EXPIRATION = '1h';

const generateDeviceToken = () => uuidv4();

const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

const hashPassword = async (password) => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

const generateJWT = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

const verifyJWT = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

const createUser = async (phoneNumber, password, uuid) => {
    const hashedPassword = await hashPassword(password);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const deviceToken = generateDeviceToken();

    const newUser = await auth.createUser({
        phoneNumber: "+84" + phoneNumber.substring(1),
        password: password,
    });

    await createDocument(collections.users, {
        uid: newUser.uid,
        phoneNumber,
        password: hashedPassword,
        uuid,
        verificationCode,
        isVerified: false,
        deviceToken
    });

    return { userId: newUser.uid, verificationCode, deviceToken };
};

const getUserByPhoneNumber = async (phoneNumber) => {
    const users = await queryDocuments(collections.users, (ref) =>
        ref.where('phoneNumber', '==', phoneNumber).limit(1)
    );
    return users[0];
};

const updateUserVerification = async (userId, isVerified, deviceToken) => {
    await updateDocument(collections.users, userId, { isVerified, deviceToken });
};

const updateUserDeviceInfo = async (userId, deviceToken, deviceId) => {
    await updateDocument(collections.users, userId, { deviceToken, deviceId });
};

const clearUserDeviceToken = async (userId) => {
    await updateDocument(collections.users, userId, { deviceToken: null });
};

const storeVerificationCode = async (userId, verificationCode) => {
    await updateDocument(collections.users, userId, {
        verificationCode,
        verificationCodeTimestamp: Date.now()
    });
};

const validateUsername = (username) => {
    if (/[!@#$%^&*(),.?":{}|<>]/.test(username)) {
        return false;
    }

    if (username.length < 3 || username.length > 30) {
        return false;
    }

    if (
        username.includes('/') ||
        username.includes('\\') ||
        /^\d+$/.test(username) ||
        /^(\+\d{1,2}\s?)?1?\-?\.?\s?$$?\d{3}$$?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(username) ||
        /^\d+\s+[\w\s]+(?:avenue|ave|street|st|road|rd|boulevard|blvd)\.?$/i.test(username)
    ) {
        return false;
    }

    return true;
};

module.exports = {
    generateDeviceToken,
    hashPassword,
    comparePassword,
    generateJWT,
    verifyJWT,
    createUser,
    getUserByPhoneNumber,
    updateUserVerification,
    updateUserDeviceInfo,
    clearUserDeviceToken,
    storeVerificationCode,
    validateUsername
};