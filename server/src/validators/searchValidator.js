import Joi from 'joi';

const searchPostsSchema = Joi.object({
    keyword: Joi.string().required().min(1),
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20)
});

const searchUsersSchema = Joi.object({
    keyword: Joi.string().required().min(1),
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20)
});

const getSavedSearchSchema = Joi.object({
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20)
});

const deleteSavedSearchSchema = Joi.object({
    searchId: Joi.string().required(),
    all: Joi.string().valid('0', '1').default('0')
});

const validateSearchPosts = (data) => {
    return searchPostsSchema.validate(data);
};

const validateGetSavedSearch = (data) => {
    return getSavedSearchSchema.validate(data);
};

const validateDeleteSavedSearch = (params, query) => {
    return deleteSavedSearchSchema.validate({ ...params, ...query });
};

const validateSearchUsers = (data) => {
    return searchUsersSchema.validate(data);
};

export default {
    validateSearchPosts,
    validateGetSavedSearch,
    validateDeleteSavedSearch,
    validateSearchUsers,
};