const authService = require('../services/authService');
const { validateSignup, validateLogin, validateChangeInfo } = require('../validators/userValidator');
const { generateRandomCode, formatPhoneNumber } = require('../utils/helpers');
const User = require('../models/User');
const { sendResponse, handleError } = require('../utils/responseHandler');
const logger = require('../utils/logger');

const signup = async (req, res, next) => {
    try {
        const { error } = validateSignup(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { phoneNumber, password, uuid } = req.body;

        const existingUser = await authService.getUserByPhoneNumber(phoneNumber);
        if (existingUser) {
            return sendResponse(res, '9996');
        }

        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        const verificationCode = generateRandomCode();

        const { userId, deviceToken } = await authService.createUser(formattedPhoneNumber, password, uuid, verificationCode);

        const token = authService.generateJWT({ uid: userId, phone: formattedPhoneNumber });

        sendResponse(res, '1000', {
            id: userId,
            token: token,
            deviceToken: deviceToken,
            verifyCode: verificationCode,
        });
    } catch (error) {
        logger.error('Signup Error:', { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const login = async (req, res, next) => {
    try {
        const { error } = validateLogin(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }

        const { phoneNumber, password, deviceId } = req.body;

        const user = await authService.getUserByPhoneNumber(phoneNumber);
        if (!user) {
            return sendResponse(res, '9995');
        }

        const isPasswordCorrect = await authService.comparePassword(password, user.password);
        if (!isPasswordCorrect) {
            return sendResponse(res, '1004');
        }

        const deviceToken = authService.generateDeviceToken();
        await authService.updateUserDeviceInfo(user.uid, deviceToken, deviceId);

        const token = authService.generateJWT({ uid: user.uid, phone: user.phoneNumber });

        const userModel = new User(user);

        const refreshToken = authService.generateRefreshToken(user.id);
        await authService.updateUserRefreshToken(user.id, refreshToken);

        sendResponse(res, '1000', {
            ...userModel.toJSON(),
            token: token,
            deviceToken: deviceToken,
        });
    } catch (error) {
        logger.error('Login Error:', { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const logout = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return sendResponse(res, '1002');
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        await authService.clearUserDeviceToken(userId);

        sendResponse(res, '1000');
    } catch (error) {
        logger.error('Logout Error:', { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const getVerifyCode = async (req, res, next) => {
    try {
        const { phonenumber } = req.body;

        if (!/^0\d{9}$/.test(phonenumber)) {
            return sendResponse(res, '1004');
        }

        const user = await authService.getUserByPhoneNumber(phonenumber);
        if (!user) {
            return sendResponse(res, '9995');
        }

        const verificationCode = generateRandomCode();
        await authService.storeVerificationCode(user.uid, verificationCode);

        if (process.env.NODE_ENV !== 'production') {
            return sendResponse(res, '1000', { verifyCode: verificationCode });
        } else {
            return sendResponse(res, '1000', { message: 'Verification code sent.' });
        }
        
    } catch (error) {
        logger.error('Error in get_verify_code:', { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const checkVerifyCode = async (req, res, next) => {
    try {
        const { phonenumber, code } = req.body;

        if (!phonenumber || !code) {
            return sendResponse(res, '1002');
        }

        if (!/^0\d{9}$/.test(phonenumber)) {
            return sendResponse(res, '1004');
        }

        const user = await authService.getUserByPhoneNumber(phonenumber);
        if (!user) {
            return sendResponse(res, '9995');
        }

        const currentTime = Date.now();
        const codeExpirationTime = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (user.verificationCode !== code ||
            currentTime - user.verificationCodeTimestamp > codeExpirationTime) {
            return sendResponse(res, '9993');
        }

        const token = authService.generateJWT({ uid: user.uid, phone: phonenumber });
        const deviceToken = authService.generateDeviceToken();

        await authService.updateUserVerification(user.uid, true, deviceToken);

        sendResponse(res, '1000', {
            id: user.uid,
            token: token,
            deviceToken: deviceToken,
            active: user.active || "1"
        });
    } catch (error) {
        logger.error("Error in check_verify_code:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const checkAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        const deviceToken = req.headers['x-device-token'];

        if (!token || !deviceToken) {
            return sendResponse(res, '9998', { isAuthenticated: false });
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        const user = await authService.getUserById(userId);

        if (!user || user.deviceToken !== deviceToken) {
            return sendResponse(res, '9998', { isAuthenticated: false });
        }

        sendResponse(res, '1000', { isAuthenticated: true });
    } catch (error) {
        logger.error("Auth check error:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
    }
};

const changeInfoAfterSignup = async (req, res, next) => {
    try {
        const { error } = validateChangeInfo(req.body);
        if (error) {
            return sendResponse(res, '1002');
        }
        const { token, username } = req.body;
        const avatar = req.file;

        if (!token || !username) {
            return sendResponse(res, '1002');
        }

        const decodedToken = authService.verifyJWT(token);
        const userId = decodedToken.uid;

        const user = await authService.getUserById(userId);
        if (!user) {
            return sendResponse(res, '9995');
        }

        if (username === user.phoneNumber) {
            return sendResponse(res, '1004');
        }

        const updateData = { username };

        if (avatar) {
            // In a real-world scenario, you would upload this file to a storage service
            // and get a URL. For this example, we'll just use a placeholder URL.
            updateData.avatar = `http://example.com/avatars/${avatar.filename}`;
        }

        await authService.updateUserInfo(userId, updateData);

        const updatedUser = await authService.getUserById(userId);

        sendResponse(res, '1000', {
            id: userId,
            username: updatedUser.username,
            phonenumber: updatedUser.phoneNumber,
            created: updatedUser.createdAt,
            avatar: updatedUser.avatar,
            is_blocked: updatedUser.isBlocked || false,
            online: updatedUser.online || false
        });
    } catch (error) {
        logger.error("Error in change_info_after_signup:", { error: error.message, stack: error.stack });
        handleError(error, req, res, next);
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