import postService from '../services/postService.js';
import postValidator from '../validators/postValidator.js';
import { sendResponse } from '../utils/responseHandler.js';
import { createError } from '../utils/customError.js';
import { collections } from '../config/database.js';
import { db } from '../config/firebase.js';
import Post from '../models/Post.js';
import logger from '../utils/logger.js';
import { cleanupFiles, handleImageUpload } from '../utils/helpers.js';

class PostController {
    async createPost(req, res, next) {
        try {
            const { error } = postValidator.validateCreatePost(req.body);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { content } = req.body;
            const userId = req.user.userId;
            const files = req.files;

            // Generate contentLowerCase array for search
            const contentLowerCase = content.toLowerCase().split(/\s+/).filter(Boolean);

            // Validate file count
            if (files && files.length > Post.MAX_IMAGES) {
                throw createError('1008', `Maximum ${Post.MAX_IMAGES} images allowed`);
            }

            const postId = await postService.createPost(userId, content, contentLowerCase, files);

            // Clean up temporary files after successful upload
            if (files) {
                await cleanupFiles(files);
            }

            sendResponse(res, '1000', { postId });
        } catch (error) {
            // Clean up files on error
            if (req.files) {
                await cleanupFiles(req.files);
            }
            next(error);
        }
    }

    async getPost(req, res, next) {
        try {
            const { error } = postValidator.validateGetPost(req.params);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { postId } = req.params;
            const userId = req.user.userId;
            const post = await postService.getPost(postId, userId);

            if (!post) {
                return sendResponse(res, '9994', { message: 'No data found' });
            }

            sendResponse(res, '1000', post);
        } catch (error) {
            next(error);
        }
    }

    async updatePost(req, res, next) {
        try {
            logger.debug('updatePost: Received request', {
                content: req.body.content,
                filesCount: req.files?.length,
                existingImages: req.body.existingImages
            });

            const validationData = {
                content: req.body.content,
                existingImages: req.body.existingImages ? JSON.parse(req.body.existingImages) : [],
                images: req.files || []
            };

            const { error } = postValidator.validateUpdatePost(validationData);
            if (error) {
                logger.error('Validation error:', error.details);
                throw createError('1002', error.details[0].message);
            }

            const userId = req.user.userId;
            const { postId } = req.params;

            // Process images with Firebase Storage
            const processedImages = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    try {
                        const imageUrl = await handleImageUpload(file, `posts/${userId}`, {
                            width: 1920,
                            height: 1080,
                            fit: 'inside'
                        });
                        processedImages.push(imageUrl);
                    } catch (uploadError) {
                        logger.error('Image upload failed:', uploadError);
                        throw createError('1007', 'Failed to upload image');
                    }
                }
            }

            const existingImages = validationData.existingImages || [];
            const allImages = [...existingImages, ...processedImages];

            // Update post
            const updatedPost = await postService.updatePost(
                postId,
                userId,
                validationData.content,
                validationData.content.toLowerCase().split(/\s+/).filter(Boolean),
                allImages
            );

            return sendResponse(res, '1000', updatedPost);

        } catch (error) {
            // Clean up any uploaded files if error occurs
            if (req.files) {
                await cleanupFiles(req.files);
            }
            next(error);
        }
    }

    async deletePost(req, res, next) {
        try {
            const { error } = postValidator.validateDeletePost(req.params);
            if (error) throw createError('1002', error.details[0].message);

            const { postId } = req.params;
            const userId = req.user.userId;

            await postService.deletePost(postId, userId);

            await req.app.locals.auditLog.logAction(userId, postId, 'delete_post', {
                timestamp: new Date().toISOString()
            });

            sendResponse(res, '1000', { message: 'Post deleted successfully' });
        } catch (error) {
            next(error);
        }
    }

    async addComment(req, res, next) {
        try {
            const { error } = postValidator.validateComment(req.body);
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const { postId } = req.params;
            const { content } = req.body;
            const userId = req.user.userId;

            const userDoc = await db.collection(collections.users).doc(userId).get();
            const userData = userDoc.data();

            const commentId = await postService.addComment(postId, userId, String(content));

            sendResponse(res, '1000', {
                commentId,
                user: {
                    userId,
                    userName: userData?.userName || 'Anonymous User',
                    avatar: userData?.avatar || ''
                }
            });

        } catch (error) {
            next(error);
        }
    }

    async getComments(req, res, next) {
        try {
            const { error } = postValidator.validateGetPostComments({
                ...req.query,
                postId: req.params.postId
            });
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const { postId } = req.params;
            const { limit = 20, lastVisible } = req.query;
            const userId = req.user.userId;

            const result = await postService.getComments(postId, userId, parseInt(limit), lastVisible);

            sendResponse(res, '1000', {
                comments: result.comments,
                lastVisible: result.lastVisible ?
                    Buffer.from(result.lastVisible).toString('base64') : null,
                totalComments: result.totalComments
            });
        } catch (error) {
            next(error);
        }
    }

    async getUserPosts(req, res, next) {
        try {
            const { error } = postValidator.validateGetUserPosts(req.params, req.query);
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const { userId } = req.params;
            const { limit = 20, lastVisible } = req.query;

            let startAfterDoc = null;

            if (lastVisible) {
                const lastVisibleId = Buffer.from(lastVisible, 'base64').toString('utf-8');
                startAfterDoc = await db.collection(collections.posts).doc(lastVisibleId).get();

                if (!startAfterDoc.exists) {
                    throw createError('1004', 'Invalid lastVisible value');
                }
            }

            const { posts, lastVisible: newLastVisible } = await postService.getUserPosts(
                userId,
                parseInt(limit),
                startAfterDoc
            );

            const encodedLastVisible = newLastVisible
                ? Buffer.from(newLastVisible.id).toString('base64')
                : null;

            sendResponse(res, '1000', {
                posts,
                lastVisible: encodedLastVisible,
            });
        } catch (error) {
            next(error);
        }
    }

    async reportPost(req, res, next) {
        try {
            const { error } = postValidator.validateReportPost(req.body);
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const { postId } = req.params;
            const { reason, details } = req.body;
            const userId = req.user.userId;

            const post = await postService.getPost(postId);

            if (!post) throw createError('9992', 'The requested post does not exist.');

            await postService.reportPost(postId, userId, reason, details);

            sendResponse(res, '1000', { message: 'Report submitted successfully. The post is under review.' });
        } catch (error) {
            next(error);
        }
    }

    async toggleLike(req, res, next) {
        try {
            const { error } = postValidator.validateLike(req.params);
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const userId = req.user.userId;
            const { postId } = req.params;

            const result = await postService.toggleLike(postId, userId);
            sendResponse(res, '1000', {
                liked: result.liked,
                likeCount: result.likeCount
            });
        } catch (error) {
            next(error);
        }
    }

    async getListPosts(req, res, next) {
        try {
            const { error, value } = postValidator.validateGetListPosts(req.query);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const {
                postId,
                lastVisible,
                limit = 20,
            } = value;

            const result = await postService.getListPosts({
                postId,
                lastVisible: lastVisible ? Buffer.from(lastVisible, 'base64').toString('utf-8') : null,
                limit: parseInt(limit)
            });

            if (!result) {
                throw createError('9999', 'Failed to fetch posts');
            }

            const response = {
                posts: result.posts || [],
                lastVisible: result.lastVisible ? Buffer.from(result.lastVisible).toString('base64') : null
            };

            return sendResponse(res, '1000', response);
        } catch (error) {
            next(error);
        }
    }
}

export default new PostController();
