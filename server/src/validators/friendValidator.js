const Joi = require('joi');

const getRequestedFriendsSchema = Joi.object({
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required()
});

const validateGetRequestedFriends = (data) => {
    return getRequestedFriendsSchema.validate(data);
};

module.exports = {
    validateGetRequestedFriends
};