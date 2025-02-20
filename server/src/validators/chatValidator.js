import Joi from 'joi';

// Common schemas
const paginationSchema = {
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20)
};

const identifierSchema = {
    partnerId: Joi.string().optional(),
    conversationId: Joi.string().optional()
};

// Validation schemas
const createConversationSchema = Joi.object({
    partnerId: Joi.string().required()
});

const getListConversationSchema = Joi.object({
    ...paginationSchema
});

const getConversationSchema = Joi.object({
    ...paginationSchema,
    lastMessageId: Joi.string().optional()
});

const setReadMessageSchema = Joi.object({

});

const deleteMessageSchema = Joi.object({
    ...identifierSchema,
    messageId: Joi.string().required()
}).or('partnerId', 'conversationId').messages({
    'object.missing': 'Either "partnerId" or "conversationId" must be provided'
});

const deleteConversationSchema = Joi.object({
    ...identifierSchema
}).or('partnerId', 'conversationId').messages({
    'object.missing': 'Either "partnerId" or "conversationId" must be provided'
});

const validateCreateConversation = (data) => {
    return createConversationSchema.validate(data, { abortEarly: false });
};

const validateGetListConversation = (data) => {
    return getListConversationSchema.validate(data, { abortEarly: false });
};

const validateGetConversation = (data) => {
    return getConversationSchema.validate(data, { abortEarly: false });
};

const validateSetReadMessage = (data) => {
    return setReadMessageSchema.validate(data, { abortEarly: false });
};

const validateDeleteMessage = (data) => {
    return deleteMessageSchema.validate(data, { abortEarly: false });
};

const validateDeleteConversation = (data) => {
    return deleteConversationSchema.validate(data, { abortEarly: false });
};

export default {
    validateCreateConversation,
    validateGetListConversation,
    validateGetConversation,
    validateSetReadMessage,
    validateDeleteMessage,
    validateDeleteConversation,
};
