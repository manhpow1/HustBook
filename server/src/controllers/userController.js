const userService = require('../services/userService');
const userValidator = require('../validators/userValidator');
const { comparePassword, generateJWT, generateRefreshToken, generateRandomCode, verifyRefreshToken } = require('../utils/authHelper');
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

            const formattedphoneNumber = formatPhoneNumber(phoneNumber);            
            const existingUser = await userService.getUserByphoneNumber(formattedphoneNumber);
            if (existingUser) {
                throw createError('9996'); // User already exists
            }
            const verificationCode = generateRandomCode();

            const { userId, deviceToken } = await userService.createUser(
                formattedphoneNumber,
                password,
                uuid,
                verificationCode
            );

            const token = generateJWT({
                uid: userId,
                phone: formattedphoneNumber,
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

            const formattedphoneNumber = formatPhoneNumber(phoneNumber);
            const user = await userService.getUserByphoneNumber(formattedphoneNumber);
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
                userName: user.userName,
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

            const { phoneNumber } = value;

            const formattedphoneNumber = formatPhoneNumber(phoneNumber);
            const user = await userService.getUserByphoneNumber(formattedphoneNumber);
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

            const { phoneNumber, code } = value;

            const formattedphoneNumber = formatPhoneNumber(phoneNumber);
            const user = await userService.getUserByphoneNumber(formattedphoneNumber);
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
            const userId = req.user.uid; // From authenticateToken
            const avatarFile = req.file; // handled by multer if provided
            const { userName } = req.body;

            // Validate input
            const { error } = userValidator.validateChangeInfoAfterSignup({ userName });
            if (error) {
                // Collect all validation errors into a single message
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            let avatarUrl = '';
            if (avatarFile) {
                // Implement actual upload logic
                // For demonstration, suppose we have a method in userService to handle avatar uploads:
                avatarUrl = await userService.uploadAvatar(avatarFile);
            }

            await userService.updateUserInfo(userId, {
                userName: userName,
                ...(avatarUrl && { avatar: avatarUrl })
            });

            const updatedUser = await userService.getUserById(userId);
            if (!updatedUser) {
                throw createError('9995', 'User not found.');
            }

            const responseData = {
                id: updatedUser.uid,
                userName: updatedUser.userName,
                phoneNumber: updatedUser.phoneNumber || '',
                created: updatedUser.createdAt ? updatedUser.createdAt.toISOString() : '',
                avatar: updatedUser.avatar || '',
                isBlocked: updatedUser.isBlocked ? '1' : '0',
                online: updatedUser.online ? '1' : '0'
            };

            sendResponse(res, '1000', responseData);
        } catch (error) {
            logger.error('Error in changeInfoAfterSignup controller:', error);
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

            // Check if token is in deny list
            const isDenied = await cache.get(`denied_token:${refreshToken}`);
            if (isDenied) {
                throw createError('9998', 'Token has been revoked.');
            }

            let decoded;
            try {
                decoded = verifyRefreshToken(refreshToken);
            } catch (err) {
                // Add failed token to deny list
                await cache.set(`denied_token:${refreshToken}`, true, 86400); // 24 hour TTL
                throw createError('9998', 'Invalid refresh token.');
            }

            const { userId, tokenVersion, family } = decoded;

            const user = await userService.getUserById(userId);
            if (!user) {
                throw createError('9995', 'User not found.');
            }

            // Verify token version and family
            if (user.tokenVersion !== tokenVersion || user.tokenFamily !== family) {
                // Possible refresh token reuse! Invalidate all tokens
                await userService.invalidateAllTokens(userId);
                throw createError('9998', 'Token has been invalidated.');
            }

            // Implement refresh token rotation
            const tokenFamily = user.tokenFamily || generateTokenFamily();
            const newTokenVersion = user.tokenVersion + 1;

            // Generate new tokens with updated versions
            const newAccessToken = generateJWT({
                uid: user.uid,
                phone: user.phoneNumber,
                tokenVersion: newTokenVersion,
                exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
            });

            const newRefreshToken = generateRefreshToken({
                ...user,
                tokenVersion: newTokenVersion,
                tokenFamily: tokenFamily
            });

            // Add old token to deny list
            await cache.set(`denied_token:${refreshToken}`, true, 86400);

            // Update user's token information
            await userService.updateTokenInfo(user.uid, {
                tokenVersion: newTokenVersion,
                tokenFamily: tokenFamily,
                refreshToken: newRefreshToken,
                lastTokenRefresh: new Date().toISOString()
            });

            // Set cookies with tokens
            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            sendResponse(res, '1000', {
                token: newAccessToken,
                refreshToken: newRefreshToken,
                expiresIn: 900 // 15 minutes in seconds
            });

            // Log token refresh
            logger.info(`Token refreshed for user ${userId}`);
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

            const { userId, type } = value;
            const currentUserId = req.user.uid;

            if (currentUserId === userId) {
                throw createError('1010', 'Users cannot block themselves.');
            }

            await userService.setBlock(currentUserId, userId, type);

            const message = type === 0 ? 'User blocked successfully.' : 'User unblocked successfully.';
            sendResponse(res, '1000', { message });
        } catch (error) {
            logger.error('SetBlock Error:', error);
            next(error);
        }
    }

    async getUserInfo(req, res, next) {
        try {
            let targetUserId = req.params.id;
            const requestingUser = req.user; // Set by authenticateToken middleware if token is provided

            // If no targetUserId provided, use requestingUser
            if (!targetUserId && !requestingUser) {
                // Neither token nor userId provided
                throw createError('1002', 'Parameter is not enough'); // or '9998' if token is invalid
            }

            if (!targetUserId && requestingUser) {
                targetUserId = requestingUser.uid;
            }

            // Fetch user data
            const userData = await userService.getUserById(targetUserId);
            if (!userData) {
                throw createError('9995', 'User not found.');
            }

            // Extract and prepare response data
            const {
                uid: id,
                userName = '',
                createdAt: created,
                description = '',
                avatar = '',
                coverImage = '',
                link = '',
                address = '',
                city = '',
                country = '',
                online = false
            } = userData;

            const listing = await userService.getFriendCount(id);

            let isFriend = '0';
            if (requestingUser && requestingUser.uid !== id) {
                // Check friendship
                const friendStatus = await userService.areUsersFriends(requestingUser.uid, id);
                isFriend = friendStatus ? '1' : '0';
            }

            // `online` expected as '1' or '0'
            const onlineStatus = online ? '1' : '0';

            const responseData = {
                id,
                userName,
                created: created ? created.toISOString() : '',
                description,
                avatar,
                cover_image: coverImage,
                link,
                address,
                city,
                country,
                listing,
                isFriend,
                online: onlineStatus,
            };

            sendResponse(res, '1000', responseData);
        } catch (error) {
            logger.error('Error in getUserInfo controller:', error);
            next(error);
        }
    }

    async setUserInfo(req, res, next) {
        try {
            const userId = req.user.uid;
            const {
                userName,
                description,
                avatar,
                address,
                city,
                country,
                cover_image,
                link
            } = req.body;

            const updateData = {};
            if (userName !== undefined) updateData.userName = userName;
            if (description !== undefined) updateData.description = description;
            if (avatar !== undefined) updateData.avatar = avatar;
            if (address !== undefined) updateData.address = address;
            if (city !== undefined) updateData.city = city;
            if (country !== undefined) updateData.country = country;
            if (cover_image !== undefined) updateData.coverImage = cover_image;
            if (link !== undefined) updateData.link = link;

            // If no fields to update, return current user info
            if (Object.keys(updateData).length === 0) {
                const currentUser = await userService.getUserById(userId);
                if (!currentUser) throw createError('9995', 'User not found.');
                return sendResponse(res, '1000', {
                    avatar: currentUser.avatar || '',
                    cover_image: currentUser.coverImage || '',
                    link: currentUser.link || '',
                    city: currentUser.city || '',
                    country: currentUser.country || ''
                });
            }

            await userService.updateUserInfo(userId, updateData);
            const updatedUser = await userService.getUserById(userId);
            if (!updatedUser) {
                throw createError('9995', 'User not found.');
            }

            sendResponse(res, '1000', {
                avatar: updatedUser.avatar || '',
                cover_image: updatedUser.coverImage || '',
                link: updatedUser.link || '',
                city: updatedUser.city || '',
                country: updatedUser.country || ''
            });
        } catch (error) {
            logger.error('Error in setUserInfo controller:', error);
            next(error);
        }
    }
}

module.exports = new UserController();
