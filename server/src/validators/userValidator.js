const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

/**
 * Password complexity requirements:
 * - Minimum 8 characters
 * - Maximum 30 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 */
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

/**
 * Phone number validation schema:
 * - Must start with '0'
 * - Must be exactly 10 digits
 */
const phoneNumberSchema = Joi.string()
    .pattern(/^0\d{9}$/)
    .required()
    .messages({
        'string.pattern.base': 'Phone number must start with 0 and be 10 digits long.',
        'any.required': 'Phone number is required.',
    });

/**
 * Token validation schema:
 * - Must be a non-empty string
 * - Length between 32 and 256 characters
 */
const tokenSchema = Joi.object({
    token: Joi.string().required().min(32).max(256).messages({
        'string.empty': 'Token cannot be empty.',
        'string.min': 'Token is too short.',
        'string.max': 'Token is too long.',
        'any.required': 'Token is required.',
    }),
}).required().messages({
    'object.base': 'Invalid input format.',
});

/**
 * Signup validation schema:
 * - phoneNumber
 * - password
 * - uuid
 */
const signupSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
    password: passwordComplexity,
    uuid: Joi.string().required().messages({
        'string.empty': 'UUID is required.',
        'any.required': 'UUID is required.',
    }),
}).required().messages({
    'any.required': 'All parameters are required.',
    'string.pattern.base': 'Parameter value is invalid.',
});

/**
 * Login validation schema:
 * - phoneNumber
 * - password
 * - deviceId
 */
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
}).required().messages({
    'any.required': 'All parameters are required.',
});

/**
 * Change user info schema:
 * - username
 * - avatar (optional)
 */
const changeInfoSchema = Joi.object({
    username: Joi.string().min(3).max(30).required().custom((value, helpers) => {
        const sanitized = sanitizeHtml(value, {
            allowedTags: [],
            allowedAttributes: {},
        });
        if (sanitized !== value) {
            return helpers.error('any.invalid');
        }
        return sanitized;
    }).messages({
        'string.empty': 'Username cannot be empty.',
        'string.min': 'Username must be at least 3 characters long.',
        'string.max': 'Username must be at most 30 characters long.',
        'any.required': 'Username is required.',
        'any.invalid': 'Username contains invalid characters.',
    }),
    avatar: Joi.any() // Assuming avatar is handled by middleware (e.g., multer)
        .optional(),
}).required().messages({
    'any.required': 'All parameters are required.',
});

/**
 * Change password schema:
 * - password (current password)
 * - new_password
 */
const changePasswordSchema = Joi.object({
    password: Joi.string().required().messages({
        'string.empty': 'Current password cannot be empty.',
        'any.required': 'Current password is required.',
    }),
    new_password: passwordComplexity,
}).required().messages({
    'any.required': 'All parameters are required.',
});

/**
 * Set block schema:
 * - user_id
 * - type (0: block, 1: unblock)
 */
const setBlockSchema = Joi.object({
    user_id: Joi.string().uuid().required().messages({
        'string.base': 'User ID must be a string.',
        'string.uuid': 'User ID must be a valid UUID.',
        'any.required': 'User ID is required.'
    }),
    type: Joi.number().integer().valid(0, 1).required().messages({
        'number.base': 'Type must be a number.',
        'number.integer': 'Type must be an integer.',
        'any.only': 'Type must be 0 (block) or 1 (unblock).',
        'any.required': 'Type is required.'
    })
}).required().messages({
    'object.base': 'Invalid input format.'
});

/**
 * Refresh token schema:
 * - refreshToken
 */
const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        'string.empty': 'Refresh token cannot be empty.',
        'any.required': 'Refresh token is required.',
    }),
}).required().messages({
    'object.base': 'Invalid input format.',
});

/**
 * Get verify code schema:
 * - phonenumber
 */
const getVerifyCodeSchema = Joi.object({
    phonenumber: phoneNumberSchema,
}).required().messages({
    'any.required': 'Phonenumber is required.',
});

/**
 * Check verify code schema:
 * - phonenumber
 * - code
 */
const checkVerifyCodeSchema = Joi.object({
    phonenumber: phoneNumberSchema,
    code: Joi.string().length(6).required().messages({
        'string.empty': 'Verification code cannot be empty.',
        'string.length': 'Verification code must be 6 characters long.',
        'any.required': 'Verification code is required.',
    }),
}).required().messages({
    'any.required': 'All parameters are required.',
});

/**
 * Sanitizes input strings to prevent XSS attacks.
 * @param {string} value - The string to sanitize.
 * @returns {string} - The sanitized string.
 */
const sanitizeInput = (value) => {
    return sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
    });
};

/**
 * Validation Functions
 */

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

const validateRefreshToken = (data) => {
    return refreshTokenSchema.validate(data, { abortEarly: false });
};

const validateGetVerifyCode = (data) => {
    return getVerifyCodeSchema.validate(data, { abortEarly: false });
};

const validateCheckVerifyCode = (data) => {
    return checkVerifyCodeSchema.validate(data, { abortEarly: false });
};

module.exports = {
    validateSignup,
    validateLogin,
    validateChangeInfo,
    validateChangePassword,
    validateSetBlock,
    validateRefreshToken,
    validateGetVerifyCode,
    validateCheckVerifyCode,
    sanitizeInput,
};