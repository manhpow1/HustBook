import Joi from 'joi';

const acceptableReasons = [
    'spam',
    'inappropriateContent',
    'harassment',
    'hateSpeech',
    'violence',
    'other',
];

const createPostSchema = Joi.object({
    content: Joi.string()
        .required()
        .min(1)
        .max(1000)
        .trim()
        .pattern(/^[^<>]*$/)
        .messages({
            'string.empty': 'Content cannot be empty',
            'string.min': 'Content must be at least 1 character long',
            'string.max': 'Content cannot exceed 1000 characters',
            'string.pattern.base': 'Content contains invalid characters'
        }),
    contentLowerCase: Joi.array()
        .items(Joi.string().lowercase().trim())
        .default(() => [])
        .strip(), // This field will be generated server-side
    images: Joi.array()
        .items(
            Joi.string()
                .uri()
                .pattern(/\.(jpg|jpeg|png|gif)$/i)
        )
        .max(4)
        .messages({
            'array.max': 'Maximum 4 images allowed',
            'string.pattern.base': 'Invalid image format'
        })
}).required();

const updatePostSchema = Joi.object({
    content: Joi.string()
        .required()
        .min(1)
        .max(1000)
        .trim()
        .pattern(/^[^<>]*$/)
        .messages({
            'string.empty': 'Content cannot be empty',
            'string.min': 'Content must be at least 1 character long',
            'string.max': 'Content cannot exceed 1000 characters',
            'string.pattern.base': 'Content contains invalid characters',
            'any.required': 'Content is required'
        }),
    contentLowerCase: Joi.array()
        .items(Joi.string().lowercase().trim())
        .default(() => [])
        .strip(),
    existingImages: Joi.array()
        .items(Joi.string().uri())
        .default([])
        .allow(null)
        .messages({
            'array.base': 'Existing images must be an array'
        }),
    // Update the images validation to handle Firebase paths
    images: Joi.array()
        .items(
            Joi.object({
                path: Joi.string(),
                fieldname: Joi.string(),
                originalname: Joi.string(),
                mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif'),
                size: Joi.number().max(5 * 1024 * 1024) // 5MB
            }).unknown(true)
        )
        .default([])
        .messages({
            'array.base': 'Images must be an array'
        })
}).custom((value, helpers) => {
    const totalImages = (value.existingImages?.length || 0) + (value.images?.length || 0);
    if (totalImages > 4) {
        return helpers.error('array.max', { message: 'Maximum 4 images allowed in total' });
    }
    return value;
});

const commentSchema = Joi.object({
    content: Joi.string()
        .required()
        .max(500)
        .messages({
            'string.base': 'Content must be a string',
            'string.empty': 'Content cannot be empty',
            'string.max': 'Content cannot exceed 500 characters'
        })
});

const likeSchema = Joi.object({
    postId: Joi.string().required()
});

const getPostSchema = Joi.object({
    postId: Joi.string().required()
});

const getListPostsSchema = Joi.object({
    postId: Joi.string().allow('').optional(),
    lastVisible: Joi.alternatives().try(
        Joi.string(),
        Joi.allow(null)
    ).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    reset: Joi.boolean().optional()
});

const getPostCommentsSchema = Joi.object({
    postId: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    lastVisible: Joi.string().optional(),
}).unknown(true);

const getUserPostsSchema = Joi.object({
    userId: Joi.string().required(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    lastVisible: Joi.string().optional(),
});

const reportPostSchema = Joi.object({
    reason: Joi.string()
        .valid(...acceptableReasons)
        .required(),
    details: Joi.string()
        .max(500)
        .when('reason', {
            is: 'other',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }),
});

const validateCreatePost = (data) => {
    return createPostSchema.validate(data);
};

const validateUpdatePost = (data) => {
    return updatePostSchema.validate(data);
};

const validateComment = (data) => {
    return commentSchema.validate(data);
};

const validateLike = (params) => {
    return likeSchema.validate(params);
};

const validateGetPost = (data) => {
    return getPostSchema.validate(data);
};

const validateGetPostComments = (query) => {
    return getPostCommentsSchema.validate(query, { abortEarly: false });
};

const validateGetUserPosts = (data) => {
    return getUserPostsSchema.validate(data);
};

const validateReportPost = (data) => {
    return reportPostSchema.validate(data);
};

const validateGetListPosts = (data) => {
    return getListPostsSchema.validate(data, { convert: true });
};

const validateDeletePost = (params) => {
    const schema = Joi.object({
        postId: Joi.string().required()
    });
    return schema.validate(params);
};

export default {
    validateCreatePost,
    validateUpdatePost,
    validateComment,
    validateLike,
    validateGetPost,
    validateGetPostComments,
    validateGetUserPosts,
    validateReportPost,
    validateGetListPosts,
    validateDeletePost,
};
