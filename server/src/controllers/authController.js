const authService = require('../services/authService');
const userValidator = require('../validators/userValidator');
const { formatPhoneNumber } = require('../utils/helpers');
const User = require('../models/User');
const { sendResponse } = require('../utils/responseHandler');
const { createError } = require('../utils/customError');
const { generateRandomCode, comparePassword } = require('../utils/authHelper');

const signup = async (req, res, next) => {
    try {
        const { error } = userValidator.validateSignup(req.body);
        if (error) {
            throw createError('1002', error.details[0].message);
        }

        const { phoneNumber, password, uuid } = req.body;

        const existingUser = await authService.getUserByPhoneNumber(phoneNumber);
        if (existingUser) {
            throw createError('9996');
        }

        const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
        const verificationCode = generateRandomCode();

        const { userId, deviceToken } = await authService.createUser(
            formattedPhoneNumber,
            password,
            uuid,
            verificationCode
        );

        const token = authService.generateJWT({
            uid: user.uid,
            phone: user.phoneNumber,
        });

        sendResponse(res, '1000', {
            id: userId,
            token: token,
            deviceToken: deviceToken,
            verifyCode: verificationCode,
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { error } = userValidator.validateLogin(req.body);
        if (error) {
            throw createError('1002', error.details[0].message);
        }

        const { phoneNumber, password, deviceId } = req.body;

        const user = await authService.getUserByPhoneNumber(phoneNumber);
        if (!user) {
            throw createError('9995', 'User not found');
        }

        const isPasswordCorrect = await comparePassword(password, user.password);
        if (!isPasswordCorrect) {
            throw createError('1004', 'Incorrect password');
        }

        const deviceToken = authService.generateDeviceToken();
        await authService.updateUserDeviceInfo(user.uid, deviceToken, deviceId);

        const token = authService.generateJWT({
            uid: user.uid,
            phone: user.phoneNumber,
            passwordUpdatedAt: user.passwordUpdatedAt,
        });

        const refreshToken = authService.generateRefreshToken(user.uid, user.passwordUpdatedAt);
        await authService.updateUserRefreshToken(user.uid, refreshToken);

        sendResponse(res, '1000', {
            id: user.uid,
            username: user.username,
            phoneNumber: user.phoneNumber,
            token: token,
            refreshToken: refreshToken,
            deviceToken: deviceToken,
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const userId = req.user.uid;

        await authService.clearUserDeviceToken(userId);
        await authService.updateUserRefreshToken(userId, null); // Invalidate refresh token

        sendResponse(res, '1000');
    } catch (error) {
        next(error);
    }
};

const getVerifyCode = async (req, res, next) => {
    try {
        const { phonenumber } = req.body;

        if (!/^0\d{9}$/.test(phonenumber)) {
            throw createError('1004', 'Invalid phone number format');
        }

        const user = await authService.getUserByPhoneNumber(phonenumber);
        if (!user) {
            throw createError('9995');
        }

        const verificationCode = generateRandomCode();
        await authService.storeVerificationCode(user.uid, verificationCode);

        if (process.env.NODE_ENV !== 'production') {
            sendResponse(res, '1000', { verifyCode: verificationCode });
        } else {
            sendResponse(res, '1000', { message: 'Verification code sent.' });
        }
    } catch (error) {
        next(error);
    }
};

const checkVerifyCode = async (req, res, next) => {
    try {
        const { phonenumber, code } = req.body;

        if (!phonenumber || !code) {
            throw createError('1002', 'Phone number and code are required');
        }

        if (!/^0\d{9}$/.test(phonenumber)) {
            throw createError('1004', 'Invalid phone number format');
        }

        const user = await authService.getUserByPhoneNumber(phonenumber);
        if (!user) {
            throw createError('9995');
        }

        const currentTime = Date.now();
        const codeExpirationTime = 5 * 60 * 1000; // 5 minutes

        if (
            user.verificationCode !== code ||
            currentTime - user.verificationCodeTimestamp > codeExpirationTime
        ) {
            throw createError('9993');
        }

        const token = authService.generateJWT({
            uid: user.uid,
            phone: user.phoneNumber,
            passwordUpdatedAt: user.passwordUpdatedAt,
        });
        const deviceToken = authService.generateDeviceToken();

        await authService.updateUserVerification(user.uid, true, deviceToken);

        sendResponse(res, '1000', {
            id: user.uid,
            token: token,
            deviceToken: deviceToken,
            active: user.active || '1',
        });
    } catch (error) {
        next(error);
    }
};

const checkAuth = async (req, res, next) => {
    try {
        sendResponse(res, '1000', { isAuthenticated: true });
    } catch (error) {
        next(error);
    }
};

const changeInfoAfterSignup = async (req, res, next) => {
    try {
        const { error } = userValidator.validateChangeInfo(req.body);
        if (error) {
            throw createError('1002', error.details.map(detail => detail.message).join(', '));
        }

        const { username } = req.body;
        const avatar = req.file;
        const userId = req.user.uid;

        if (username === req.user.phoneNumber) {
            throw createError('1004', 'Username cannot be the same as phone number');
        }

        const updateData = { username };

        if (avatar) {
            // Handle avatar upload and get the URL
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
            online: updatedUser.online || false,
        });
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { error } = userValidator.validateChangePassword(req.body);
        if (error) {
            throw createError('1002', error.details.map(detail => detail.message).join(', '));
        }

        const { password, new_password } = req.body;
        const userId = req.user.uid;

        const user = await authService.getUserById(userId);
        if (!user) {
            throw createError('9995', 'User not found');
        }

        const isPasswordCorrect = await authService.comparePassword(password, user.password);
        if (!isPasswordCorrect) {
            throw createError('1004', 'Current password is incorrect');
        }

        if (password === new_password) {
            throw createError('1004', 'New password must be different from current password');
        }

        await authService.updatePassword(userId, new_password);

        sendResponse(res, '1000', { message: 'Password changed successfully' });
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw createError('1002', 'Refresh token is required');
        }

        // Verify refresh token
        const decoded = authService.verifyRefreshToken(refreshToken);
        const userId = decoded.userId;
        const tokenVersion = decoded.tokenVersion;

        const user = await authService.getUserById(userId);

        if (!user) {
            throw createError('9995', 'User not found');
        }

        // Check tokenVersion
        if (user.tokenVersion !== tokenVersion) {
            throw createError('9998', 'Invalid refresh token');
        }

        // Generate new tokens
        const newAccessToken = authService.generateJWT(user);
        const newRefreshToken = authService.generateRefreshToken(user);

        // Update refresh token in database
        await authService.updateUserRefreshToken(user.uid, newRefreshToken);

        sendResponse(res, '1000', {
            token: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    signup,
    login,
    logout,
    getVerifyCode,
    checkVerifyCode,
    checkAuth,
    changeInfoAfterSignup,
    changePassword,
    refreshToken,
};
