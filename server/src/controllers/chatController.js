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
}

module.exports = new chatController();