const Joi = require('joi');

const getListConversationSchema = Joi.object({
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20),
});

const getConversationSchema = Joi.object({
    partner_id: Joi.string().optional(),
    conversation_id: Joi.string().optional(),
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required(),
}).or('partner_id', 'conversation_id').messages({
    'object.missing': 'Either "partner_id" or "conversation_id" must be provided',
});

const setReadMessageSchema = Joi.object({
    partner_id: Joi.string().optional(),
    conversation_id: Joi.string().optional(),
}).or('partner_id', 'conversation_id').messages({
    'object.missing': 'Either "partner_id" or "conversation_id" must be provided',
});

const deleteMessageSchema = Joi.object({
    partner_id: Joi.string().optional(),
    conversation_id: Joi.string().optional(),
}).or('partner_id', 'conversation_id').messages({
    'object.missing': 'Either "partner_id" or "conversation_id" must be provided',
});

const deleteConversationSchema = Joi.object({
    partner_id: Joi.string().optional(),
    conversation_id: Joi.string().optional(),
}).or('partner_id', 'conversation_id').messages({
    'object.missing': 'Either "partner_id" or "conversation_id" must be provided',
});

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

module.exports = {
    validateGetListConversation,
    validateGetConversation,
    validateSetReadMessage,
    validateDeleteMessage,
    validateDeleteConversation,
};