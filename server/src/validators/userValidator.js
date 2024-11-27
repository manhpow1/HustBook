// File: src/validators/userValidator.js

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
});

// Signup validation schema
const signupSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
    password: passwordComplexity,
    uuid: Joi.string().required().messages({
        'string.empty': 'UUID cannot be empty.',
        'any.required': 'UUID is required.',
    }),
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
});

// Change password schema
const changePasswordSchema = Joi.object({
    password: Joi.string().required().messages({
        'string.empty': 'Current password cannot be empty.',
        'any.required': 'Current password is required.',
    }),
    new_password: passwordComplexity,
});

// Validation functions
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

module.exports = {
    validateToken,
    validateSignup,
    validateLogin,
    validateChangeInfo,
    validateChangePassword,
};
