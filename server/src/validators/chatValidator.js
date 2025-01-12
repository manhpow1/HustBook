import Joi from 'joi';

const getListConversationSchema = Joi.object({
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20),
});

const getConversationSchema = Joi.object({
    partnerId: Joi.string().optional(),
    conversationId: Joi.string().optional(),
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required(),
}).or('partnerId', 'conversationId').messages({
    'object.missing': 'Either "partnerId" or "conversationId" must be provided',
});

const setReadMessageSchema = Joi.object({
    partnerId: Joi.string().optional(),
    conversationId: Joi.string().optional(),
}).or('partnerId', 'conversationId').messages({
    'object.missing': 'Either "partnerId" or "conversationId" must be provided',
});

const deleteMessageSchema = Joi.object({
    partnerId: Joi.string().optional(),
    conversationId: Joi.string().optional(),
}).or('partnerId', 'conversationId').messages({
    'object.missing': 'Either "partnerId" or "conversationId" must be provided',
});

const deleteConversationSchema = Joi.object({
    partnerId: Joi.string().optional(),
    conversationId: Joi.string().optional(),
}).or('partnerId', 'conversationId').messages({
    'object.missing': 'Either "partnerId" or "conversationId" must be provided',
});

const createConversationSchema = Joi.object({
    partnerId: Joi.string().required(),
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
