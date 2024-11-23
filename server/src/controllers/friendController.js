const friendValidator = require('../validators/friendValidator');
const friendService = require('../services/friendService');
const { sendResponse, handleError } = require('../utils/responseHandler');
const logger = require('../utils/logger');
const { getDocument } = require('../config/database');

const getRequestedFriends = async (req, res, next) => {
    try {
        const { error } = friendValidator.validateGetRequestedFriends(req.query);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { index, count } = req.query;
        const userId = req.user.uid;

        const result = await friendService.getRequestedFriends(userId, parseInt(index), parseInt(count));

        if (result.requests.length === 0) {
            return sendResponse(res, '9994');
        }

        sendResponse(res, '1000', {
            request: result.requests,
            total: result.total
        });
    } catch (error) {
        logger.error('Error in getRequestedFriends controller:', error);
        handleError(error, req, res, next);
    }
};

const getUserFriends = async (req, res, next) => {
    try {
        const { error, value } = friendValidator.validateGetUserFriends(req.body);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { user_id, index, count } = value;
        const userId = user_id || req.user.uid;

        const result = await friendService.getUserFriends({
            userId,
            index: parseInt(index || '0'),
            count: parseInt(count || '20')
        });

        sendResponse(res, '1000', {
            friends: result.friends,
            total: result.total.toString()
        });
    } catch (error) {
        logger.error('Error in getUserFriends controller:', error);
        handleError(error, req, res, next);
    }
};

const setAcceptFriend = async (req, res, next) => {
    try {
        const { error } = friendValidator.validateSetAcceptFriend(req.body);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { user_id, is_accept } = req.body;
        const userId = req.user.uid;

        // Check if the user exists
        const requester = await getDocument(collections.users, user_id);
        if (!requester) {
            return sendResponse(res, '9995'); // User is not validated
        }

        await friendService.setAcceptFriend(userId, user_id, is_accept);

        // If successful, return success response
        sendResponse(res, '1000', {
            message: is_accept === '1' ? 'Friend request accepted' : 'Friend request rejected'
        });
    } catch (error) {
        logger.error('Error in setAcceptFriend controller:', error);
        handleError(error, req, res, next);
    }
};

const getListSuggestedFriends = async (req, res, next) => {
    try {
        const { error, value } = friendValidator.validateGetListSuggestedFriends(req.query);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { index, count } = value;
        const userId = req.user.uid;

        const result = await friendService.getListSuggestedFriends(userId, index, count);

        if (!result.list_users || result.list_users.length === 0) {
            return sendResponse(res, '9994'); // No data or end of list data
        }

        sendResponse(res, '1000', {
            list_users: result.list_users
        });
    } catch (error) {
        logger.error('Error in getListSuggestedFriends controller:', error);
        handleError(error, req, res, next);
    }
};

const setRequestFriend = async (req, res, next) => {
    try {
        const { error } = friendValidator.validateSetRequestFriend(req.body);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { user_id } = req.body;
        const senderId = req.user.uid;

        // Check if trying to send request to self
        if (senderId === user_id) {
            return sendResponse(res, '1004', { message: 'Cannot send friend request to yourself' });
        }

        // Check if recipient exists
        const recipient = await getDocument(collections.users, user_id);
        if (!recipient) {
            return sendResponse(res, '9995'); // User is not validated
        }

        const result = await friendService.setRequestFriend(senderId, user_id);

        sendResponse(res, '1000', result);
    } catch (error) {
        logger.error('Error in setRequestFriend controller:', error);
        if (error.message === 'Friend request already exists') {
            return sendResponse(res, '1010');
        }
        if (error.message === 'Users are already friends') {
            return sendResponse(res, '1010');
        }
        handleError(error, req, res, next);
    }
};

const getListBlocks = async (req, res, next) => {
    try {
        const { error } = friendValidator.validateGetListBlocks(req.query);
        if (error) {
            return sendResponse(res, '1002', { message: error.details[0].message });
        }

        const { index, count } = req.query;
        const userId = req.user.uid;

        const result = await friendService.getListBlocks(
            userId,
            parseInt(index),
            parseInt(count)
        );

        if (result.blocks.length === 0) {
            return sendResponse(res, '9994'); // No data or end of list data
        }

        sendResponse(res, '1000', {
            data: result.blocks
        });
    } catch (error) {
        logger.error('Error in getListBlocks controller:', error);
        handleError(error, req, res, next);
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