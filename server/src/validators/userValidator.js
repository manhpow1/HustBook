const Joi = require('joi');
const sanitizeHtml = require('sanitize-html');

/**
 * Password complexity requirements:
 * - Minimum 8 characters
 * - Maximum 30 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (!@#$%^&*)
 * - No common patterns or sequences
 * - No password/username similarity
 * - No repeating characters (more than twice)
 */

// Password strength checker
const passwordStrength = (value) => {
    // Return early if basic validation fails
    if (!value || typeof value !== 'string') return false;

    // Check for common patterns
    const commonPatterns = [
        /^[a-zA-Z]{1,}[0-9]{1,}$/, // All letters followed by all numbers
        /^[0-9]{1,}[a-zA-Z]{1,}$/, // All numbers followed by all letters
        /(.)\1{2,}/, // Character repeated more than twice
        /^(?:abc|123|password|admin|user|login|welcome)/i, // Common password patterns
        /(?:qwerty|asdfgh|zxcvbn)/i // Keyboard patterns
    ];

    if (commonPatterns.some(pattern => pattern.test(value))) {
        return false;
    }

    // Calculate strength score
    let strength = 0;
    const rules = {
        'length': value.length >= 12,
        'uppercase': /[A-Z]/.test(value),
        'lowercase': /[a-z]/.test(value),
        'numbers': /[0-9]/.test(value),
        'special': /[!@#$%^&*]/.test(value),
        'mixedChars': /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(value),
        'noRepeat': !/(.)\1{2,}/.test(value)
    };

    // Calculate score based on rules
    Object.values(rules).forEach(rule => {
        if (rule) strength += 1;
    });

    return strength >= 5; // Require at least 5 rules to pass
};

// Base password complexity validation
const passwordComplexity = Joi.string()
    .min(8)
    .max(30)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])[a-zA-Z\\d!@#$%^&*]+$'))
    .custom((value, helpers) => {
        if (!passwordStrength(value)) {
            return helpers.message('Password is too weak or contains common patterns');
        }
        return value;
    })
    .required()
    .messages({
        'string.pattern.base': 'Password must include uppercase, lowercase letters, numbers, and special characters (!@#$%^&*).',
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
 * Check if password matches phone number
 */
const validatePasswordNotPhone = (password, phoneNumber) => {
    if (!password || !phoneNumber) return null;
    return password === phoneNumber ? 'Password cannot match the phone number.' : null;
};

/**
 * Token validation schema
 */
const tokenSchema = Joi.object({
    token: Joi.string()
        .required()
        .min(32)
        .max(512)
        .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/) // JWT format
        .messages({
            'string.empty': 'Token cannot be empty.',
            'string.min': 'Token is too short.',
            'string.max': 'Token is too long.',
            'string.pattern.base': 'Invalid token format.',
            'any.required': 'Token is required.',
        }),
}).required();

/**
 * Signup validation schema
 */
const signupSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
    password: passwordComplexity,
    uuid: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.empty': 'UUID is required.',
            'string.uuid': 'Invalid UUID format.',
            'any.required': 'UUID is required.',
        }),
    deviceId: Joi.string()
        .required()
        .trim()
        .messages({
            'string.empty': 'Device ID is required.',
            'any.required': 'Device ID is required.',
        })
}).required();

/**
 * Login validation schema
 */
const loginSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
    password: Joi.string()
        .min(8)
        .max(30)
        .required()
        .messages({
            'string.empty': 'Password cannot be empty.',
            'string.min': 'Password must be at least 8 characters.',
            'string.max': 'Password cannot exceed 30 characters.',
            'any.required': 'Password is required.',
        }),
    deviceId: Joi.string()
        .required()
        .trim()
        .messages({
            'string.empty': 'Device ID cannot be empty.',
            'any.required': 'Device ID is required.',
        }),
    biometricAuth: Joi.boolean()
        .default(false)
}).required();

/**
 * Change user info schema
 */
const changeInfoAfterSignupSchema = Joi.object({
    userName: Joi.string()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required()
        .messages({
            'string.empty': 'Username cannot be empty.',
            'string.min': 'Username must be at least 3 characters.',
            'string.max': 'Username cannot exceed 30 characters.',
            'string.pattern.base': 'Username can only contain letters, numbers, and underscores.',
            'any.required': 'Username is required.'
        }),
    avatar: Joi.string()
        .uri()
        .allow(null, '')
        .messages({
            'string.uri': 'Avatar must be a valid URL.'
        })
}).required();

/**
 * Change password schema
 */
const changePasswordSchema = Joi.object({
    password: Joi.string()
        .required()
        .messages({
            'string.empty': 'Current password cannot be empty.',
            'any.required': 'Current password is required.',
        }),
    new_password: passwordComplexity
}).required();

/**
 * Set block schema
 */
const setBlockSchema = Joi.object({
    userId: Joi.string()
        .uuid()
        .required()
        .messages({
            'string.base': 'User ID must be a string.',
            'string.uuid': 'User ID must be a valid UUID.',
            'any.required': 'User ID is required.'
        }),
    type: Joi.number()
        .integer()
        .valid(0, 1)
        .required()
        .messages({
            'number.base': 'Type must be a number.',
            'number.integer': 'Type must be an integer.',
            'any.only': 'Type must be 0 (block) or 1 (unblock).',
            'any.required': 'Type is required.'
        })
}).required();

/**
 * Refresh token schema
 */
const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .pattern(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/) // JWT format
        .messages({
            'string.empty': 'Refresh token cannot be empty.',
            'string.pattern.base': 'Invalid refresh token format.',
            'any.required': 'Refresh token is required.',
        }),
}).required();

/**
 * Get verify code schema
 */
const getVerifyCodeSchema = Joi.object({
    phonenumber: phoneNumberSchema,
}).required();

/**
 * Check verify code schema
 */
const checkVerifyCodeSchema = Joi.object({
    phonenumber: phoneNumberSchema,
    code: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required()
        .messages({
            'string.empty': 'Verification code cannot be empty.',
            'string.length': 'Verification code must be 6 digits.',
            'string.pattern.base': 'Verification code must only contain numbers.',
            'any.required': 'Verification code is required.',
        }),
}).required();

const forgotPasswordSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
    code: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .optional()
        .messages({
            'string.length': 'Verification code must be 6 digits.',
            'string.pattern.base': 'Verification code must only contain numbers.'
        }),
    newPassword: passwordComplexity.optional()
}).required();

/**
 * Enhanced input sanitization with additional security measures
 */
const sanitizeInput = (value) => {
    if (!value) return value;

    // Convert to string if not already
    const strValue = String(value);

    // Basic XSS prevention
    let sanitized = sanitizeHtml(strValue, {
        allowedTags: [],
        allowedAttributes: {},
        parser: {
            decodeEntities: true
        }
    });

    // Additional security measures
    sanitized = sanitized
        // Remove potential SQL injection characters
        .replace(/['";]/g, '')
        // Remove potential command injection characters
        .replace(/[$`]/g, '')
        // Remove potential script tags that might have survived
        .replace(/<\/?[^>]+(>|$)/g, '')
        // Remove unicode control characters
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        // Normalize whitespace
        .trim();

    return sanitized;
};

/**
 * Enhanced validation functions with security checks
 */
const validateSignup = (data) => {
    // Sanitize inputs
    const sanitizedData = {
        ...data,
        phoneNumber: sanitizeInput(data.phoneNumber),
        password: data.password // Don't sanitize password
    };

    // Validate schema
    const validation = signupSchema.validate(sanitizedData, {
        abortEarly: false,
        stripUnknown: true
    });

    // Additional security checks
    if (!validation.error) {
        const securityErrors = [];

        // Check password not similar to phone number
        if (validatePasswordNotPhone(data.password, data.phoneNumber)) {
            securityErrors.push({
                message: validatePasswordNotPhone(data.password, data.phoneNumber)
            });
        }

        // Check for any security validation errors
        if (securityErrors.length > 0) {
            return {
                error: {
                    details: securityErrors
                }
            };
        }
    }

    return validation;
};

const validateLogin = (data) => {
    const sanitizedData = {
        ...data,
        phoneNumber: sanitizeInput(data.phoneNumber),
        password: data.password
    };
    return loginSchema.validate(sanitizedData, { abortEarly: false });
};

const validateChangeInfoAfterSignup = (data) => {
    const sanitizedData = {
        ...data,
        userName: sanitizeInput(data.userName)
    };
    return changeInfoAfterSignupSchema.validate(sanitizedData, { abortEarly: false });
};

const validateChangePassword = (data, phoneNumber) => {
    const validation = changePasswordSchema.validate(data, { abortEarly: false });
    if (!validation.error && validatePasswordNotPhone(data.new_password, phoneNumber)) {
        return {
            error: {
                details: [{ message: validatePasswordNotPhone(data.new_password, phoneNumber) }]
            }
        };
    }
    return validation;
};

const validateSetBlock = (data) => {
    return setBlockSchema.validate(data, { abortEarly: false });
};

const validateRefreshToken = (data) => {
    return refreshTokenSchema.validate(data, { abortEarly: false });
};

const validateGetVerifyCode = (data) => {
    const sanitizedData = {
        phonenumber: sanitizeInput(data.phonenumber)
    };
    return getVerifyCodeSchema.validate(sanitizedData, { abortEarly: false });
};

/**
 * Set user info schema
 */
const setUserInfoSchema = Joi.object({
    fullName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s]*$/)
        .optional()
        .messages({
            'string.min': 'Full name must be at least 2 characters.',
            'string.max': 'Full name cannot exceed 50 characters.',
            'string.pattern.base': 'Full name can only contain letters and spaces.'
        }),
    bio: Joi.string()
        .max(200)
        .optional()
        .allow('')
        .messages({
            'string.max': 'Bio cannot exceed 200 characters.'
        }),
    avatar: Joi.string()
        .uri()
        .optional()
        .allow('')
        .messages({
            'string.uri': 'Avatar must be a valid URL.'
        }),
    coverPhoto: Joi.string()
        .uri()
        .optional()
        .allow('')
        .messages({
            'string.uri': 'Cover photo must be a valid URL.'
        }),
    location: Joi.string()
        .max(100)
        .optional()
        .allow('')
        .messages({
            'string.max': 'Location cannot exceed 100 characters.'
        })
}).min(1).required();

/**
 * Get user info schema
 */
const getUserInfoSchema = Joi.object({
    id: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.uuid': 'Invalid user ID format.'
        })
}).required();

const validateCheckVerifyCode = (data) => {
    const sanitizedData = {
        phonenumber: sanitizeInput(data.phonenumber),
        code: data.code
    };
    return checkVerifyCodeSchema.validate(sanitizedData, { abortEarly: false });
};

const validateSetUserInfo = (data) => {
    const sanitizedData = {
        fullName: sanitizeInput(data.fullName),
        bio: sanitizeInput(data.bio),
        location: sanitizeInput(data.location),
        avatar: data.avatar,
        coverPhoto: data.coverPhoto
    };
    return setUserInfoSchema.validate(sanitizedData, { abortEarly: false });
};

const validateGetUserInfo = (data) => {
    return getUserInfoSchema.validate(data, { abortEarly: false });
};

const validateForgotPassword = (data) => {
    const sanitizedData = {
        ...data,
        phoneNumber: sanitizeInput(data.phoneNumber),
        code: data.code,
        newPassword: data.newPassword // Don't sanitize password
    };
    return forgotPasswordSchema.validate(sanitizedData, { abortEarly: false });
};

module.exports = {
    validateSignup,
    validateLogin,
    validateChangeInfoAfterSignup,
    validateChangePassword,
    validateSetBlock,
    validateRefreshToken,
    validateGetVerifyCode,
    validateForgotPassword,
    validateCheckVerifyCode,
    validateSetUserInfo,
    validateGetUserInfo,
    sanitizeInput,
    passwordStrength // Export for testing
};
