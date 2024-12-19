const Joi = require('joi');

const searchSchema = Joi.object({
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

const validateSearch = (data) => {
    return searchSchema.validate(data);
};

const validateGetSavedSearch = (data) => {
    return getSavedSearchSchema.validate(data);
};

const validateDeleteSavedSearch = (params, query) => {
    return deleteSavedSearchSchema.validate({ ...params, ...query });
};

module.exports = {
    validateSearch,
    validateGetSavedSearch,
    validateDeleteSavedSearch
};