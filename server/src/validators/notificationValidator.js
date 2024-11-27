const Joi = require('joi');

const checkNewItemSchema = Joi.object({
    last_id: Joi.string().required(),
    category_id: Joi.string().valid('0', '1', '2', '3').default('0')
});

const updatePushSettingsSchema = Joi.object({
    like_comment: Joi.string().valid('0', '1'),
    from_friends: Joi.string().valid('0', '1'),
    requested_friend: Joi.string().valid('0', '1'),
    suggested_friend: Joi.string().valid('0', '1'),
    birthday: Joi.string().valid('0', '1'),
    video: Joi.string().valid('0', '1'),
    report: Joi.string().valid('0', '1'),
    sound_on: Joi.string().valid('0', '1'),
    notification_on: Joi.string().valid('0', '1'),
    vibrant_on: Joi.string().valid('0', '1'),
    led_on: Joi.string().valid('0', '1'),
}).min(1);

const validateCheckNewItem = (data) => {
    return checkNewItemSchema.validate(data);
};

const validateUpdatePushSettings = (data) => {
    return updatePushSettingsSchema.validate(data);
};

module.exports = {
    validateCheckNewItem,
    validateUpdatePushSettings,
};