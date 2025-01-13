import { createError } from '../utils/customError.js';
import { sendResponse } from '../utils/responseHandler.js';
import chatService from '../services/chatService.js';
import chatValidator from '../validators/chatValidator.js';
import logger from '../utils/logger.js';

class ChatController {
    async createConversation(req, res, next) {
        try {
            const { error, value } = chatValidator.validateCreateConversation(req.body);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { partnerId } = value;
            const userId = req.user.userId;

            const conversationId = await chatService.createConversation(userId, partnerId);
            sendResponse(res, '1000', { conversationId });
        } catch (err) {
            logger.error('Error in createConversation controller:', err);
            next(err);
        }
    }
    async getListConversation(req, res, next) {
        try {
            const { error, value } = chatValidator.validateGetListConversation(req.query);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { index, count } = value;
            const userId = req.user.userId;

            logger.debug('Calling service with:', { userId, index, count });

            const result = await chatService.getListConversation(userId, index, count);

            logger.debug('Service response:', result);

            // Return response in correct format
            sendResponse(res, '1000', {
                data: result.data,
                numNewMessage: result.numNewMessage
            });
        } catch (err) {
            logger.error('Error in getListConversation controller:', err);
            next(err);
        }
    }

    async getConversationMessages(req, res, next) {
        try {
            const conversationId = req.params.conversationId;
            if (!conversationId) {
                throw createError('1002', 'conversationId is required');
            }

            const { error, value } = chatValidator.validateGetConversation(req.query);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { index, count, lastMessageId } = value;
            const userId = req.user.userId;

            logger.debug('Fetching messages:', {
                conversationId,
                userId,
                index,
                count,
                lastMessageId
            });

            const messagesData = await chatService.getConversationMessage(userId, {
                conversationId,
                index,
                count,
                lastMessageId
            });

            logger.debug('Messages retrieved:', {
                count: messagesData.length,
                firstMessageId: messagesData[0]?.messageId,
                lastMessageId: messagesData[messagesData.length - 1]?.messageId
            });

            sendResponse(res, '1000', {
                data: messagesData,
                pagination: {
                    hasMore: messagesData.length === count,
                    lastMessageId: messagesData[messagesData.length - 1]?.messageId
                }
            });
        } catch (err) {
            logger.error('Error in getConversationMessages controller:', err);
            next(err);
        }
    }

    async setReadMessage(req, res, next) {
        try {
            const conversationId = req.params.conversationId;
            if (!conversationId) {
                throw createError('1002', 'conversationId is required');
            }

            const userId = req.user.userId;
            const updatedCount = await chatService.setReadMessage(userId, { conversationId });

            sendResponse(res, '1000', { data: [{ updated_count: updatedCount }] });
        } catch (err) {
            logger.error('Error in setReadMessage controller:', err);
            next(err);
        }
    }

    async deleteMessage(req, res, next) {
        try {
            const { error, value } = chatValidator.validateDeleteMessage(req.query);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { partnerId, conversationId } = value;
            const userId = req.user.userId;
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
            const { error, value } = chatValidator.validateDeleteConversation(req.query);
            if (error) {
                const messages = error.details.map(detail => detail.message).join(', ');
                throw createError('1002', messages);
            }

            const { partnerId, conversationId } = value;
            const userId = req.user.userId;

            const deletionResult = await chatService.deleteConversation(userId, partnerId, conversationId);

            sendResponse(res, '1000', { data: [{ deleted: deletionResult }] });
        } catch (err) {
            logger.error('Error in deleteConversation controller:', err);
            next(err);
        }
    }
}

export default new ChatController();
