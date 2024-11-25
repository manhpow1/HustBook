const Joi = require('joi');

const signupSchema = Joi.object({
    phoneNumber: Joi.string().pattern(/^0\d{9}$/).required(),
    password: Joi.string().min(6).max(30).required(),
    uuid: Joi.string().required()
});

const loginSchema = Joi.object({
    phoneNumber: Joi.string().pattern(/^0\d{9}$/).required(),
    password: Joi.string().required(),
    deviceId: Joi.string().required()
});

const changeInfoSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    avatar: Joi.string().uri().optional()
});

const changePasswordSchema = Joi.object({
    password: Joi.string().required(),
    new_password: Joi.string()
        .min(6)
        .max(30)
        .required()
        .custom((value, helpers) => {
            // Password strength validation
            if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/.test(value)) {
                return helpers.error('password.weak');
            }
            return value;
        })
});

const validateSignup = (data) => {
    return signupSchema.validate(data);
};

const validateLogin = (data) => {
    return loginSchema.validate(data);
};

const validateChangeInfo = (data) => {
    return changeInfoSchema.validate(data);
};

const validateChangePassword = (data) => {
    return changePasswordSchema.validate(data);
};

module.exports = {
    validateSignup,
    validateLogin,
    validateChangeInfo,
    validateChangePassword,
};