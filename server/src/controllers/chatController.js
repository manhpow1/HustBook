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

            const { partner_id, conversation_id, index, count } = value;
            const userId = req.user.uid; // from authenticateToken middleware

            const messagesData = await chatService.getConversation(userId, partner_id, conversation_id, index, count);

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

            const { partner_id, conversation_id } = value;
            const userId = req.user.uid; // from authenticateToken middleware

            const updatedCount = await chatService.setReadMessage(userId, partner_id, conversation_id);

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

            const { partner_id, conversation_id } = value;
            const userId = req.user.uid; // from authenticateToken middleware
            const { message_id } = req.params;

            if (!message_id) {
                throw createError('1002', '"message_id" is required in the URL path');
            }

            const deletionResult = await chatService.deleteMessage(userId, partner_id, conversation_id, message_id);

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

            const { partner_id, conversation_id } = value;
            const userId = req.user.uid; // from authenticateToken middleware

            const deletionResult = await chatService.deleteConversation(userId, partner_id, conversation_id);

            sendResponse(res, '1000', { data: [{ deleted: deletionResult }] });
        } catch (err) {
            logger.error('Error in deleteConversation controller:', err);
            next(err);
        }
    }
}

module.exports = new chatController();