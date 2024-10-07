const authService = require('../services/authService');
const { validateSignup, validateLogin, validateChangeInfo } = require('../validators/userValidator');
const { generateRandomCode, hashPassword, comparePassword, formatPhoneNumber } = require('../utils/helpers');
const User = require('../models/User');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');
const { error } = require('winston');

const signup = async (req, res, next) => {
    try {
        const { error } = validateSignup(req.body);
        if (error) {
            throw createError('1002');
        }

        const { phoneNumber, password, uuid } = req.body;

        const existingUser = await authService.getUserByPhoneNumber(phoneNumber);
        if (existingUser) {
            throw createError('9996');
        }

        const hashedPassword = await hashPassword(password);
        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        const verificationCode = generateRandomCode();

        const { userId, deviceToken } = await authService.createUser(formattedPhoneNumber, hashedPassword, uuid, verificationCode);

        const token = authService.generateJWT({ uid: userId, phone: formattedPhoneNumber });

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userId,
                token: token,
                deviceToken: deviceToken,
                verifyCode: verificationCode,
            },
        });
    } catch (error) {
        logger.error('Signup Error:', error);
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { error } = validateLogin(req.body);
        if (error) {
            throw createError('1002');
        }

        const { phoneNumber, password, deviceId } = req.body;

        const user = await authService.getUserByPhoneNumber(phoneNumber);
        if (!user) {
            throw createError('9995');
        }

        const isPasswordCorrect = await comparePassword(password, user.password);
        if (!isPasswordCorrect) {
            throw createError('1004');
        }

        const deviceToken = authService.generateDeviceToken();
        await authService.updateUserDeviceInfo(user.uid, deviceToken, deviceId);

        const token = authService.generateJWT({ uid: user.uid, phone: user.phoneNumber });

        const userModel = new User(user);

        const refreshToken = generateRefreshToken(user.id);
        await updateDocument(collections.users, user.id, { refreshToken });

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                ...userModel.toJSON(),
                token: token,
                deviceToken: deviceToken,
            },
        });
    } catch (error) {
        logger.error('Login Error:', error);
        next(error);
    }
};

const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            throw createError('1002');
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        await authService.clearUserDeviceToken(userId);

        res.status(200).json({ code: "1000", message: "OK" });
    } catch (error) {
        logger.error('Logout Error:', error);
        next(error);
    }
};

const getVerifyCode = async (req, res) => {
    try {
        const { phonenumber } = req.body;

        if (!/^0\d{9}$/.test(phonenumber)) {
            throw createError('1004');
        }

        const user = await authService.getUserByPhoneNumber(phonenumber);
        if (!user) {
            throw createError('9995');
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        await authService.storeVerificationCode(user.uid, verificationCode);

        res.status(200).json({
            code: "1000",
            message: "Verification code sent successfully",
            data: {
                verifyCode: verificationCode // In production, don't send this back to the client
            }
        });
    } catch (error) {
        logger.error('Error in get_verify_code:', error);
        next(error);
    }
};

const checkVerifyCode = async (req, res) => {
    try {
        const { phonenumber, code } = req.body;

        if (!phonenumber || !code) {
            throw createError('1002');
        }

        if (!/^0\d{9}$/.test(phonenumber)) {
            throw createError('1004');
        }

        const user = await authService.getUserByPhoneNumber(phonenumber);
        if (!user) {
            throw createError('9995');
        }

        const currentTime = Date.now();
        const codeExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (user.verificationCode !== code ||
            currentTime - user.verificationCodeTimestamp > codeExpirationTime) {
            throw createError('9993');
        }

        const token = authService.generateJWT({ uid: user.uid, phone: phonenumber });
        const deviceToken = authService.generateDeviceToken();

        await authService.updateUserVerification(user.uid, true, deviceToken);

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: user.uid,
                token: token,
                deviceToken: deviceToken,
                active: user.active || "1"
            }
        });
    } catch (error) {
        logger.error("Error in check_verify_code:", error);
        next(error);
    }
};

const checkAuth = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const deviceToken = req.headers['x-device-token'];

        if (!token || !deviceToken) {
            return res.json({ isAuthenticated: false });
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        const user = await getDocument(collections.users, userId);

        if (!user || user.deviceToken !== deviceToken) {
            return res.json({ isAuthenticated: false });
        }

        res.json({ isAuthenticated: true });
    } catch (error) {
        console.error("Auth check error:", error);
        res.json({ isAuthenticated: false });
    }
};

const changeInfoAfterSignup = async (req, res) => {
    try {
        const { error } = validateChangeInfo(req.body);
        if (error) {
            throw createError('1002');
        }
        const { token, username } = req.body;
        const avatar = req.file;

        if (!token || !username) {
            throw createError('1002');
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        const user = await getDocument(collections.users, userId);
        if (!user) {
            throw createError('9995');
        }

        if (username === req.user.phoneNumber) {
            throw createError('1004');
        }

        const updateData = { username };

        if (avatar) {
            // In a real-world scenario, you would upload this file to a storage service
            // and get a URL. For this example, we'll just use a placeholder URL.
            updateData.avatar = `http://example.com/avatars/${avatar.filename}`;
        }

        await updateDocument(collections.users, userId, updateData);

        const updatedUser = await getDocument(collections.users, userId);

        res.status(200).json({
            code: "1000",
            message: "OK",
            data: {
                id: userId,
                username: updatedUser.username,
                phonenumber: updatedUser.phoneNumber,
                created: updatedUser.createdAt,
                avatar: updatedUser.avatar,
                is_blocked: updatedUser.isBlocked || false,
                online: updatedUser.online || false
            }
        });
    } catch (error) {
        logger.error("Error in change_info_after_signup:", error);
        next(error);
    }
};

module.exports = {
    login,
    signup,
    logout,
    getVerifyCode,
    checkVerifyCode,
    checkAuth,
    changeInfoAfterSignup
};