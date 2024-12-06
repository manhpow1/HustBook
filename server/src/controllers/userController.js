const userService = require('../services/userService');
const userValidator = require('../validators/userValidator');
const { comparePassword, generateJWT, verifyJWT, generateRefreshToken, generateRandomCode } = require('../utils/authHelper');
const { formatPhoneNumber } = require('../utils/helpers');
const { sendResponse } = require('../utils/responseHandler');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

class UserController {
    async signup(req, res, next) {
        try {
            const { error, value } = userValidator.validateSignup(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, password, uuid } = value;

            const existingUser = await userService.getUserByPhoneNumber(phoneNumber);
            if (existingUser) {
                throw createError('9996'); // User already exists
            }

            const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
            const verificationCode = generateRandomCode();

            const { userId, deviceToken } = await userService.createUser(
                formattedPhoneNumber,
                password,
                uuid,
                verificationCode
            );

            const token = generateJWT({
                uid: userId,
                phone: formattedPhoneNumber,
            });

            sendResponse(res, '1000', {
                id: userId,
                token: token,
                deviceToken: deviceToken,
                ...(process.env.NODE_ENV !== 'production' && { verifyCode: verificationCode }),
            });
        } catch (error) {
            logger.error('Signup Error:', error);
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { error, value } = userValidator.validateLogin(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phoneNumber, password, deviceId } = value;

            const user = await userService.getUserByPhoneNumber(phoneNumber);
            if (!user) {
                throw createError('9995', 'User not found.');
            }

            const isPasswordCorrect = await comparePassword(password, user.password);
            if (!isPasswordCorrect) {
                throw createError('1004', 'Incorrect password.');
            }

            const deviceToken = userService.generateDeviceToken();
            await userService.updateUserDeviceInfo(user.uid, deviceToken, deviceId);

            const token = generateJWT({
                uid: user.uid,
                phone: user.phoneNumber,
                tokenVersion: user.tokenVersion,
            });

            const refreshToken = generateRefreshToken(user);
            await userService.updateUserRefreshToken(user.uid, refreshToken);

            sendResponse(res, '1000', {
                id: user.uid,
                username: user.username,
                phoneNumber: user.phoneNumber,
                token: token,
                refreshToken: refreshToken,
                deviceToken: deviceToken,
            });
        } catch (error) {
            logger.error('Login Error:', error);
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const userId = req.user.uid;

            await userService.clearUserDeviceToken(userId);
            await userService.updateUserRefreshToken(userId, null);

            sendResponse(res, '1000', { message: 'Logout successful.' });
        } catch (error) {
            logger.error('Logout Error:', error);
            next(error);
        }
    }

    async getVerifyCode(req, res, next) {
        try {
            const { error, value } = userValidator.validateGetVerifyCode(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phonenumber } = value;

            const user = await userService.getUserByPhoneNumber(phonenumber);
            if (!user) {
                throw createError('9995', 'User not found.');
            }

            const verificationCode = generateRandomCode();
            await userService.storeVerificationCode(user.uid, verificationCode);

            sendResponse(res, '1000', {
                ...(process.env.NODE_ENV !== 'production' && { verifyCode: verificationCode }),
                message: process.env.NODE_ENV !== 'production' ? 'Verification code generated.' : 'Verification code sent.',
            });
        } catch (error) {
            logger.error('GetVerifyCode Error:', error);
            next(error);
        }
    }

    async checkVerifyCode(req, res, next) {
        try {
            const { error, value } = userValidator.validateCheckVerifyCode(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { phonenumber, code } = value;

            const user = await userService.getUserByPhoneNumber(phonenumber);
            if (!user) {
                throw createError('9995', 'User not found.');
            }

            const isValid = await userService.verifyUserCode(user.uid, code);
            if (!isValid) {
                throw createError('9993', 'Verification code is incorrect or expired.');
            }

            const token = generateJWT({
                uid: user.uid,
                phone: user.phoneNumber,
                tokenVersion: user.tokenVersion,
            });
            const deviceToken = userService.generateDeviceToken();

            await userService.updateUserVerification(user.uid, true, deviceToken);

            sendResponse(res, '1000', {
                id: user.uid,
                token: token,
                deviceToken: deviceToken,
                active: user.active || '1',
            });
        } catch (error) {
            logger.error('CheckVerifyCode Error:', error);
            next(error);
        }
    }

    async checkAuth(req, res, next) {
        try {
            sendResponse(res, '1000', { isAuthenticated: true });
        } catch (error) {
            logger.error('CheckAuth Error:', error);
            next(error);
        }
    }

    async changeInfoAfterSignup(req, res, next) {
        try {
            const { error, value } = userValidator.validateChangeInfo(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { username } = value;
            const avatar = req.file;
            const userId = req.user.uid;

            if (username === req.user.phoneNumber) {
                throw createError('1004', 'Username cannot be the same as phone number.');
            }

            const updateData = { username };

            if (avatar) {
                const avatarUrl = await userService.uploadAvatar(avatar);
                updateData.avatar = avatarUrl;
            }

            await userService.updateUserInfo(userId, updateData);

            const updatedUser = await userService.getUserById(userId);

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
            logger.error('ChangeInfoAfterSignup Error:', error);
            next(error);
        }
    }

    async changePassword(req, res, next) {
        try {
            const { error, value } = userValidator.validateChangePassword(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { password, new_password } = value;
            const userId = req.user.uid;

            const user = await userService.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found.');
            }

            const isPasswordCorrect = await comparePassword(password, user.password);
            if (!isPasswordCorrect) {
                throw createError('1004', 'Current password is incorrect.');
            }

            if (password === new_password) {
                throw createError('1004', 'New password must be different from current password.');
            }

            await userService.updatePassword(userId, new_password);

            sendResponse(res, '1000', { message: 'Password changed successfully.' });
        } catch (error) {
            logger.error('ChangePassword Error:', error);
            next(error);
        }
    }

    async refreshToken(req, res, next) {
        try {
            const { error, value } = userValidator.validateRefreshToken(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', errorMessage);
            }

            const { refreshToken } = value;

            let decoded;
            try {
                decoded = verifyJWT(refreshToken);
            } catch (err) {
                throw createError('9998', 'Invalid refresh token.');
            }

            const { userId, tokenVersion } = decoded;

            const user = await userService.getUserById(userId);

            if (user.tokenVersion !== tokenVersion) {
                throw createError('9998', 'Invalid refresh token.');
            }

            const newAccessToken = generateJWT({
                uid: user.uid,
                phone: user.phoneNumber,
                tokenVersion: user.tokenVersion,
            });
            const newRefreshToken = generateRefreshToken(user);

            await userService.updateUserRefreshToken(user.uid, newRefreshToken);

            sendResponse(res, '1000', {
                token: newAccessToken,
                refreshToken: newRefreshToken,
            });
        } catch (error) {
            logger.error('RefreshToken Error:', error);
            next(error);
        }
    }

    async setBlock(req, res, next) {
        try {
            const { error, value } = userValidator.validateSetBlock(req.body);
            if (error) {
                const errorMessage = error.details.map(detail => detail.message).join(', ');
                throw createError('1003', errorMessage);
            }

            const { user_id, type } = value;
            const currentUserId = req.user.uid;

            if (currentUserId === user_id) {
                throw createError('1010', 'Users cannot block themselves.');
            }

            await userService.setBlock(currentUserId, user_id, type);

            const message = type === 0 ? 'User blocked successfully.' : 'User unblocked successfully.';
            sendResponse(res, '1000', { message });
        } catch (error) {
            logger.error('SetBlock Error:', error);
            next(error);
        }
    }
}

module.exports = new UserController();
