const Joi = require('joi');

const getRequestedFriendsSchema = Joi.object({
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required()
});

const getUserFriendsSchema = Joi.object({
    user_id: Joi.string().optional(),
    index: Joi.number().integer().min(0).optional(),
    count: Joi.number().integer().min(1).max(100).optional()
});

const validateGetRequestedFriends = (data) => {
    return getRequestedFriendsSchema.validate(data);
};

const validateGetUserFriends = (data) => {
    return getUserFriendsSchema.validate(data, { convert: true });
};

module.exports = {
    validateGetRequestedFriends,
    validateGetUserFriends,
};