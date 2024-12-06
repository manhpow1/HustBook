const Joi = require('joi');

const checkNewItemSchema = Joi.object({
    last_id: Joi.string().required().label('last_id'),
    category_id: Joi.string().valid('0', '1', '2', '3').default('0').label('category_id'),
});

const setPushSettingsSchema = Joi.object({
    like_comment: Joi.string().valid('0', '1').optional().label('like_comment'),
    from_friends: Joi.string().valid('0', '1').optional().label('from_friends'),
    requested_friend: Joi.string().valid('0', '1').optional().label('requested_friend'),
    suggested_friend: Joi.string().valid('0', '1').optional().label('suggested_friend'),
    birthday: Joi.string().valid('0', '1').optional().label('birthday'),
    video: Joi.string().valid('0', '1').optional().label('video'),
    report: Joi.string().valid('0', '1').optional().label('report'),
    notification_on: Joi.string().valid('0', '1').optional().label('notification_on'),
})
    .min(1)
    .messages({
        'object.min': 'At least one setting must be provided.',
        'string.base': 'Each setting must be a string.',
        'any.only': 'Invalid value for {#label}. Must be "0" or "1".',
    });

const getNotificationsSchema = Joi.object({
    index: Joi.number().integer().min(0).required(),
    count: Joi.number().integer().min(1).max(100).required()
});

const validateCheckNewItem = (data) => {
    return checkNewItemSchema.validate(data);
};

const validateSetPushSettings = (data) => {
    return setPushSettingsSchema.validate(data, { abortEarly: false });
};

const validateGetNotifications = (data) => {
    return getNotificationsSchema.validate(data, { abortEarly: false });
};

module.exports = {
    validateCheckNewItem,
    validateSetPushSettings,
    validateGetNotifications,
};