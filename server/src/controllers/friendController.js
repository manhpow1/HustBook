const friendValidator = require('../validators/friendValidator');
const friendService = require('../services/friendService');
const { sendResponse } = require('../utils/responseHandler');
const { createError } = require('../utils/customError');

const getRequestedFriends = async (req, res, next) => {
    try {
        const { error } = friendValidator.validateGetRequestedFriends(req.query);
        if (error) {
            throw createError('1002', error.details[0].message);
        }

        const { index, count } = req.query;
        const userId = req.user.uid;

        const result = await friendService.getRequestedFriends(userId, parseInt(index), parseInt(count));

        if (result.requests.length === 0) {
            throw createError('9994');
        }

        sendResponse(res, '1000', {
            request: result.requests,
            total: result.total,
        });
    } catch (error) {
        next(error);
    }
};

const getUserFriends = async (req, res, next) => {
    try {
        const { error, value } = friendValidator.validateGetUserFriends(req.body);
        if (error) {
            throw createError('1002', error.details.map(detail => detail.message).join(', '));
        }

        const { user_id, index, count } = value;
        const userId = user_id || req.user.uid;

        const result = await friendService.getUserFriends(
            userId,
            parseInt(count),
            parseInt(index),
        );

        sendResponse(res, '1000', {
            friends: result.friends,
            total: result.total.toString(),
        });
    } catch (error) {
        next(error);
    }
};

const setAcceptFriend = async (req, res, next) => {
    try {
        const { error } = friendValidator.validateSetAcceptFriend(req.body);
        if (error) {
            throw createError('1002', error.details.map(detail => detail.message).join(', '));
        }

        const { user_id, is_accept } = req.body;
        const userId = req.user.uid;

        await friendService.setAcceptFriend(userId, user_id, is_accept);

        sendResponse(res, '1000', {
            message: is_accept === '1' ? 'Friend request accepted' : 'Friend request rejected',
        });
    } catch (error) {
        next(error);
    }
};

const getListSuggestedFriends = async (req, res, next) => {
    try {
        const { error, value } = friendValidator.validateGetListSuggestedFriends(req.query);
        if (error) {
            throw createError('1002', error.details.map(detail => detail.message).join(', '));
        }

        const { index, count } = value;
        const userId = req.user.uid;

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
};

const setRequestFriend = async (req, res, next) => {
    try {
        const { error } = friendValidator.validateSetRequestFriend(req.body);
        if (error) {
            throw createError('1002', error.details.map(detail => detail.message).join(', '));
        }

        const { user_id } = req.body;
        const senderId = req.user.uid;

        if (senderId === user_id) {
            throw createError('1004', 'Cannot send friend request to yourself');
        }

        const result = await friendService.setRequestFriend(senderId, user_id);

        sendResponse(res, '1000', result);
    } catch (error) {
        if (error.code === '1010') {
            next(error);
        } else {
            next(createError('9999', 'Exception error'));
        }
    }
};

const getListBlocks = async (req, res, next) => {
    try {
        const { error } = friendValidator.validateGetListBlocks(req.query);
        if (error) {
            throw createError('1002', error.details.map(detail => detail.message).join(', '));
        }

        const { index, count } = req.query;
        const userId = req.user.uid;

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
};

module.exports = {
    getRequestedFriends,
    getUserFriends,
    setAcceptFriend,
    getListSuggestedFriends,
    setRequestFriend,
    getListBlocks,
};
