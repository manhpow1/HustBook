import friendValidator from '../validators/friendValidator.js';
import friendService from '../services/friendService.js';
import { sendResponse } from '../utils/responseHandler.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';

class FriendController {
    async getRequestedFriends(req, res, next) {
        try {
            const { error } = friendValidator.validateGetRequestedFriends(req.query);
            if (error) {
                throw createError('1002', error.details[0].message);
            }

            const { index, count } = req.query;
            const userId = req.user.userId;

            const result = await friendService.getRequestedFriends(userId, parseInt(index), parseInt(count));

            sendResponse(res, '1000', {
                request: result.requests,
                total: result.total,
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserFriends(req, res, next) {
        try {
            const { error, value } = friendValidator.validateGetUserFriends(req.body);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { index, count } = value;
            if (!req.user?.userId) {
                throw createError('1002', 'User not authenticated');
            }
            
            logger.debug('getUserFriends controller - Input params:', {
                userId: req.user.userId,
                count: parseInt(count),
                index: parseInt(index)
            });

            const result = await friendService.getUserFriends(
                req.user.userId,
                parseInt(count),
                parseInt(index)
            );

            sendResponse(res, '1000', {
                friends: result.friends,
                total: result.total.toString(),
            });
        } catch (error) {
            next(error);
        }
    }

    async setAcceptFriend(req, res, next) {
        try {
            const { error } = friendValidator.validateSetAcceptFriend(req.body);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { userId, isAccept } = req.body;

            await friendService.setAcceptFriend(req.user.userId, userId, isAccept);

            sendResponse(res, '1000', {
                message: isAccept === '1' ? 'Friend request accepted' : 'Friend request rejected',
            });
        } catch (error) {
            next(error);
        }
    }

    async getListSuggestedFriends(req, res, next) {
        try {
            const { error, value } = friendValidator.validateGetListSuggestedFriends(req.query);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { index, count } = value;
            const userId = req.user.userId;

            const result = await friendService.getListSuggestedFriends(userId, index, count);

            if (!result.list_users || result.list_users.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            sendResponse(res, '1000', {
                list_users: result.list_users,
            });
        } catch (error) {
            next(error);
        }
    }

    async setRequestFriend(req, res, next) {
        try {
            const { error } = friendValidator.validateSetRequestFriend(req.body);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { userId } = req.body;
            const senderId = req.user.userId;

            if (senderId === userId) {
                throw createError('1004', 'Cannot send friend request to yourself');
            }

            const result = await friendService.setRequestFriend(senderId, userId);

            sendResponse(res, '1000', result);
        } catch (error) {
            if (error.code === '1010') {
                next(error);
            } else {
                next(createError('9999', 'Exception error'));
            }
        }
    }

    async getListBlocks(req, res, next) {
        try {
            const { error } = friendValidator.validateGetListBlocks(req.query);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { index, count } = req.query;
            const userId = req.user.userId;

            const result = await friendService.getListBlocks(userId, parseInt(index), parseInt(count));

            if (result.blocks.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            sendResponse(res, '1000', {
                data: result.blocks,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new FriendController();
