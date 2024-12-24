import Joi from 'joi';

const checkUserStatusSchema = Joi.object({});

const validateCheckUserStatus = (data) => {
    // Since token is handled by middleware, no required fields here.
    return checkUserStatusSchema.validate(data, { abortEarly: false });
};

export {
    validateCheckUserStatus
};