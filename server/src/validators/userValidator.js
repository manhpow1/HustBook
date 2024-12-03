const Joi = require('joi');

// Password complexity requirements
const passwordComplexity = Joi.string()
    .min(8)
    .max(30)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]+$'))
    .required()
    .messages({
        'string.pattern.base': 'Password must include uppercase, lowercase letters, and numbers.',
        'string.min': 'Password must be at least 8 characters long.',
        'string.max': 'Password must be at most 30 characters long.',
        'any.required': 'Password is required.',
    });

// Phone number validation schema
const phoneNumberSchema = Joi.string()
    .pattern(/^0\d{9}$/)
    .required()
    .messages({
        'string.pattern.base': 'Phone number must start with 0 and be 10 digits long.',
        'any.required': 'Phone number is required.',
    });

// Token validation schema
const tokenSchema = Joi.object({
    token: Joi.string().required().min(32).max(256).messages({
        'string.empty': 'Token cannot be empty.',
        'string.min': 'Token is too short.',
        'string.max': 'Token is too long.',
        'any.required': 'Token is required.',
    }),
}).messages({
    'object.base': 'Invalid input format.',
});

// Signup validation schema
const signupSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
    password: passwordComplexity,
    uuid: Joi.string().required().messages({
        'string.empty': 'UUID is required.',
        'any.required': 'UUID is required.',
    }),
}).messages({
    'any.required': 'Required parameters are missing.',
    'string.pattern.base': 'Parameter value is invalid.',
});

// Login validation schema
const loginSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
    password: Joi.string().required().messages({
        'string.empty': 'Password cannot be empty.',
        'any.required': 'Password is required.',
    }),
    deviceId: Joi.string().required().messages({
        'string.empty': 'Device ID cannot be empty.',
        'any.required': 'Device ID is required.',
    }),
}).messages({
    'any.required': 'Required parameters are missing.',
});

// Change user info schema
const changeInfoSchema = Joi.object({
    username: Joi.string().min(3).max(30).required().messages({
        'string.empty': 'Username cannot be empty.',
        'string.min': 'Username must be at least 3 characters long.',
        'string.max': 'Username must be at most 30 characters long.',
        'any.required': 'Username is required.',
    }),
    avatar: Joi.string().uri().optional().messages({
        'string.uri': 'Avatar must be a valid URI.',
    }),
}).messages({
    'any.required': 'Required parameters are missing.',
});

// Change password schema
const changePasswordSchema = Joi.object({
    password: Joi.string().required().messages({
        'string.empty': 'Current password cannot be empty.',
        'any.required': 'Current password is required.',
    }),
    new_password: passwordComplexity,
}).messages({
    'any.required': 'Required parameters are missing.',
});

const setBlockSchema = Joi.object({
    user_id: Joi.number().integer().required().messages({
        'number.base': 'User ID must be a number.',
        'number.integer': 'User ID must be an integer.',
        'any.required': 'User ID is required.',
    }),
    type: Joi.number().integer().valid(0, 1).required().messages({
        'number.base': 'Type must be a number.',
        'number.integer': 'Type must be an integer.',
        'any.only': 'Type must be 0 (block) or 1 (unblock).',
        'any.required': 'Type is required.',
    }),
}).messages({
    'object.base': 'Invalid input format.',
});

const validateToken = (data) => {
    return tokenSchema.validate(data, { abortEarly: false });
};

const validateSignup = (data) => {
    return signupSchema.validate(data, { abortEarly: false });
};

const validateLogin = (data) => {
    return loginSchema.validate(data, { abortEarly: false });
};

const validateChangeInfo = (data) => {
    return changeInfoSchema.validate(data, { abortEarly: false });
};

const validateChangePassword = (data) => {
    return changePasswordSchema.validate(data, { abortEarly: false });
};

const validateSetBlock = (data) => {
    return setBlockSchema.validate(data, { abortEarly: false });
};

module.exports = {
    validateToken,
    validateSignup,
    validateLogin,
    validateChangeInfo,
    validateChangePassword,
    validateSetBlock,
};