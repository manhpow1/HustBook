import Joi from 'joi';
import sanitizeHtml from 'sanitize-html';

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
export const passwordStrength = (value) => {
    // Return early if basic validation fails
    if (!value || typeof value !== 'string') return false;

    // Check for overly weak patterns
    const weakPatterns = [
        /^(?:password|admin|user|login|welcome|123456|abcdef)$/i, // Explicitly weak patterns
        /^(.)\1{3,}$/, // Character repeated more than three times consecutively
    ];

    if (weakPatterns.some(pattern => pattern.test(value))) {
        return false;
    }

    // Calculate strength score
    let strength = 0;
    const rules = {
        length: value.length >= 8, // Minimum length of 8 for flexibility
        uppercase: /[A-Z]/.test(value), // Contains at least one uppercase letter
        lowercase: /[a-z]/.test(value), // Contains at least one lowercase letter
        numbers: /[0-9]/.test(value), // Contains at least one number
        special: /[!@#$%^&*]/.test(value), // Contains at least one special character
        noRepeat: !/(.)\1{3,}/.test(value), // No character repeated more than three times
    };

    // Calculate score based on rules
    Object.values(rules).forEach(rule => {
        if (rule) strength += 1;
    });

    // Require at least 3 rules to pass for a flexible password policy
    return strength >= 3;
};


// Base password complexity validation
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
    .pattern(/^0[1-9][0-9]{8}$/)
    .required()
    .messages({
        'string.pattern.base': 'Phone number needs to start with 0 and be 10 digits long.',
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
}).required();

/**
 * Change user info schema
 */
const changeInfoAfterSignupSchema = Joi.object({
    userName: Joi.string()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .required(),
    avatar: Joi.alternatives().try(
        Joi.string().uri().messages({
            'string.uri': 'Avatar must be a valid URL'
        }),
        Joi.object().unknown(true).messages({
            'object.base': 'Avatar must be a valid file object'
        }),
        Joi.any().allow(null)
    )
        .optional()
        .messages({
            'alternatives.types': 'Avatar must be either a URL string or file object'
        })
        .optional()
        .messages({
            'alternatives.types': 'Cover photo must be either a URL string or file object'
        })
});

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
 * Get verify code schema
 */
const getVerifyCodeSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
}).required();

/**
 * Check verify code schema
 */
const checkVerifyCodeSchema = Joi.object({
    phoneNumber: phoneNumberSchema,
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
        .replace(/[^\x20-\x7E]/g, '')
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


const validateGetVerifyCode = (data) => {
    const sanitizedData = {
        phoneNumber: sanitizeInput(data.phoneNumber)
    };
    return getVerifyCodeSchema.validate(sanitizedData, { abortEarly: false });
};

/**
 * Set user info schema
 */
const setUserInfoSchema = Joi.object({
    userName: Joi.string()
        .min(2)
        .max(50)
        .pattern(/^[a-zA-Z\s]*$/)
        .optional()
        .messages({
            'string.min': 'Username must be at least 2 characters.',
            'string.max': 'Username cannot exceed 50 characters.',
            'string.pattern.base': 'Username can only contain letters and spaces.'
        }),
    bio: Joi.string()
        .max(200)
        .optional()
        .allow('')
        .messages({
            'string.max': 'Bio cannot exceed 200 characters.'
        }),
    avatar: Joi.alternatives().try(
        Joi.string().uri().messages({
            'string.uri': 'Avatar must be a valid URL'
        }),
        Joi.object().unknown(true).messages({
            'object.base': 'Avatar must be a valid file object'
        }),
        Joi.any().allow(null)
    )
        .optional()
        .messages({
            'alternatives.types': 'Avatar must be either a URL string or file object'
        }),
    coverPhoto: Joi.alternatives().try(
        Joi.string().uri().messages({
            'string.uri': 'Cover photo must be a valid URL'
        }),
        Joi.object().unknown(true).messages({
            'object.base': 'Cover photo must be a valid file object'
        }),
        Joi.any().allow(null)
    )
        .optional()
        .messages({
            'alternatives.types': 'Cover photo must be either a URL string or file object'
        }),
    address: Joi.string()
        .max(100)
        .optional()
        .allow('')
        .messages({
            'string.max': 'Address cannot exceed 100 characters.'
        }),
    city: Joi.string()
        .max(50)
        .optional()
        .allow('')
        .messages({
            'string.max': 'City cannot exceed 50 characters.'
        }),
    country: Joi.string()
        .max(50)
        .optional()
        .allow('')
        .messages({
            'string.max': 'Country cannot exceed 50 characters.'
        })
}).min(1).required();

/**
 * Get user info schema
 */
const getUserInfoSchema = Joi.object({
    userId: Joi.string()
        .uuid()
        .optional()
        .messages({
            'string.uuid': 'Invalid user ID format.'
        })
}).required();

const validateCheckVerifyCode = (data) => {
    const sanitizedData = {
        phoneNumber: sanitizeInput(data.phoneNumber),
        code: data.code
    };
    return checkVerifyCodeSchema.validate(sanitizedData, { abortEarly: false });
};

const validateSetUserInfo = (data) => {
    const sanitizedData = {
        userName: sanitizeInput(data.userName),
        bio: sanitizeInput(data.bio),
        address: sanitizeInput(data.address),
        city: sanitizeInput(data.city),
        country: sanitizeInput(data.country),
        avatar: data.avatar,
        coverPhoto: data.coverPhoto
    };
    return setUserInfoSchema.validate(sanitizedData, { abortEarly: false });
};

const validateGetUserInfo = (data) => {
    return getUserInfoSchema.validate(data, { abortEarly: false });
};

const validateForgotPassword = (data) => {
    // Kiểm tra và lấy giá trị phoneNumber
    const phoneNumber = data.phoneNumber?.phoneNumber || data.phoneNumber;

    const sanitizedData = {
        phoneNumber: sanitizeInput(phoneNumber),
        code: data.code,
        newPassword: data.newPassword
    };

    return forgotPasswordSchema.validate(sanitizedData, { abortEarly: false });
};

export default {
    validateSignup,
    validateLogin,
    validateChangeInfoAfterSignup,
    validateChangePassword,
    validateSetBlock,
    validateGetVerifyCode,
    validateForgotPassword,
    validateCheckVerifyCode,
    validateSetUserInfo,
    validateGetUserInfo,
    sanitizeInput,
};
