const { createError } = require('../utils/customError');
const { sendResponse } = require('../utils/responseHandler');
const chatService = require('../services/chatService');
const chatValidator = require('../validators/chatValidator');
const logger = require('../utils/logger');

class chatController {
    async getListConversation(req, res, next) {
        try {
            // Validate query parameters
            const { error, value } = chatValidator.validateGetListConversation(req.query);
            if (error) {
                // Combine all validation error messages
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { index, count } = value;
            const userId = req.user.uid; // from authenticateToken middleware

            const { conversations, numNewMessage } = await chatService.getListConversation(userId, index, count);

            if (!conversations || conversations.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            sendResponse(res, '1000', {
                data: conversations,
                numNewMessage: numNewMessage.toString()
            });
        } catch (err) {
            logger.error('Error in getListConversation controller:', err);
            next(err);
        }
    }

    async getConversation(req, res, next) {
        try {
            const { error, value } = chatValidator.validateGetConversation(req.query);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { partnerId, conversationId, index, count } = value;
            const userId = req.user.uid; // from authenticateToken middleware

            const messagesData = await chatService.getConversation(userId, partnerId, conversationId, index, count);

            if (!messagesData || messagesData.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            sendResponse(res, '1000', { data: messagesData });
        } catch (err) {
            logger.error('Error in getConversation controller:', err);
            next(err);
        }
    }

    async setReadMessage(req, res, next) {
        try {
            // Validate query parameters
            const { error, value } = chatValidator.validateSetReadMessage(req.query);
            if (error) {
                // Combine all validation error messages
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { partnerId, conversationId } = value;
            const userId = req.user.uid; // from authenticateToken middleware

            const updatedCount = await chatService.setReadMessage(userId, partnerId, conversationId);

            sendResponse(res, '1000', { data: [{ updated_count: updatedCount }] });
        } catch (err) {
            logger.error('Error in setReadMessage controller:', err);
            next(err);
        }
    }

    async deleteMessage(req, res, next) {
        try {
            // Validate query parameters
            const { error, value } = chatValidator.validateDeleteMessage(req.query);
            if (error) {
                // Combine all validation error messages
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { partnerId, conversationId } = value;
            const userId = req.user.uid; // from authenticateToken middleware
            const { messageId } = req.params;

            if (!messageId) {
                throw createError('1002', '"messageId" is required in the URL path');
            }

            const deletionResult = await chatService.deleteMessage(userId, partnerId, conversationId, messageId);

            sendResponse(res, '1000', { data: [{ deleted: deletionResult }] });
        } catch (err) {
            logger.error('Error in deleteMessage controller:', err);
            next(err);
        }
    }

    async deleteConversation(req, res, next) {
        try {
            // Validate query parameters
            const { error, value } = chatValidator.validateDeleteConversation(req.query);
            if (error) {
                // Combine all validation error messages
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { partnerId, conversationId } = value;
            const userId = req.user.uid; // from authenticateToken middleware

            const deletionResult = await chatService.deleteConversation(userId, partnerId, conversationId);

            sendResponse(res, '1000', { data: [{ deleted: deletionResult }] });
        } catch (err) {
            logger.error('Error in deleteConversation controller:', err);
            next(err);
        }
    }
}

module.exports = new chatController();