const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { collections, createDocument, getDocument, updateDocument, queryDocuments } = require('../config/database');
const { auth } = require('../config/firebase');
const config = require('config');

const SALT_ROUNDS = 10;
const JWT_SECRET = config.get('jwt.secret');
const JWT_EXPIRATION = '1h';
const REFRESH_TOKEN_SECRET = config.get('jwt.refreshSecret');
const REFRESH_TOKEN_EXPIRATION = '7d';

const generateDeviceToken = () => uuidv4();

const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });
};

const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

const generateJWT = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
};

const verifyJWT = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

const createUser = async (phoneNumber, password, uuid, verificationCode) => {
    const hashedPassword = await hashPassword(password);
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

const getUserById = async (userId) => {
    return await getDocument(collections.users, userId);
};

const updateUserVerification = async (userId, isVerified, deviceToken) => {
    await updateDocument(collections.users, userId, { isVerified, deviceToken });
};

const updateUserDeviceInfo = async (userId, deviceToken, deviceId) => {
    await updateDocument(collections.users, userId, { deviceToken, deviceId });
};

const updateUserRefreshToken = async (userId, refreshToken) => {
    await updateDocument(collections.users, userId, { refreshToken });
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

const updateUserInfo = async (userId, updateData) => {
    await updateDocument(collections.users, userId, updateData);
};

const validateUsername = (username) => {
    if (username.length < 3 || username.length > 30) return false;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(username)) return false;
    if (username.includes('/') || username.includes('\\')) return false;
    if (/^\d+$/.test(username)) return false;
    if (/^(\+\d{1,2}\s?)?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(username)) return false;
    if (/^\d+\s+[\w\s]+(?:avenue|ave|street|st|road|rd|boulevard|blvd)\.?$/i.test(username)) return false;
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
    getUserById,
    updateUserVerification,
    updateUserDeviceInfo,
    updateUserRefreshToken,
    clearUserDeviceToken,
    storeVerificationCode,
    updateUserInfo,
    validateUsername,
    generateRefreshToken
};