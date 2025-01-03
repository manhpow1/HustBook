import Joi from 'joi';

const getRequestedFriendsSchema = Joi.object({
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required()
});

const setAcceptFriendSchema = Joi.object({
    userId: Joi.string().required(),
    isAccept: Joi.string().valid('0', '1').required()
});

const getUserFriendsSchema = Joi.object({
    userId: Joi.string().optional(),
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required()
});

const getListSuggestedFriendsSchema = Joi.object({
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20)
});

const setRequestFriendSchema = Joi.object({
    userId: Joi.string().required()
});

const getListBlocksSchema = Joi.object({
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required()
});

const validateGetRequestedFriends = (data) => {
    return getRequestedFriendsSchema.validate(data);
};

const validateGetUserFriends = (data) => {
    return getUserFriendsSchema.validate(data, { convert: true });
};

const validateSetAcceptFriend = (data) => {
    return setAcceptFriendSchema.validate(data);
};

const validateGetListSuggestedFriends = (data) => {
    return getListSuggestedFriendsSchema.validate(data);
};

const validateSetRequestFriend = (data) => {
    return setRequestFriendSchema.validate(data);
};

const validateGetListBlocks = (data) => {
    return getListBlocksSchema.validate(data);
};

export default{
    validateGetRequestedFriends,
    validateGetUserFriends,
    validateSetAcceptFriend,
    validateGetListSuggestedFriends,
    validateSetRequestFriend,
    validateGetListBlocks,
};