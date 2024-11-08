const Joi = require('joi');

const checkNewItemSchema = Joi.object({
    last_id: Joi.string().required(),
    category_id: Joi.string().valid('0', '1', '2', '3').default('0')
});

const validateCheckNewItem = (data) => {
    return checkNewItemSchema.validate(data);
};

module.exports = {
    validateCheckNewItem
};