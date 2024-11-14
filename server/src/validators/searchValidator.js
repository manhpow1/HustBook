const Joi = require('joi');

const searchSchema = Joi.object({
    user_id: Joi.string().required(),
    keyword: Joi.string().required().min(1),
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20)
});

const getSavedSearchSchema = Joi.object({
    index: Joi.number().integer().min(0).default(0),
    count: Joi.number().integer().min(1).max(100).default(20)
});

const validateSearch = (data) => {
    return searchSchema.validate(data);
};

const validateGetSavedSearch = (data) => {
    return getSavedSearchSchema.validate(data);
};

module.exports = { 
    validateSearch,
    validateGetSavedSearch, 
};