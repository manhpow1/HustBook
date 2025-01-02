import postService from '../services/postService.js';
import postValidator from '../validators/postValidator.js';
import { sendResponse } from '../utils/responseHandler.js';
import { createError } from '../utils/customError.js';
import { collections } from '../config/database.js';
import { db } from '../config/firebase.js';
import Post from '../models/Post.js';
import { cleanupFiles } from '../utils/helpers.js';

class PostController {
    async createPost(req, res, next) {
        try {
            const { error } = postValidator.validateCreatePost(req.body);
            if (error) {
                throw createError('1002', error.details.map(detail => detail.message).join(', '));
            }

            const { content } = req.body;
            const userId = req.user.uid;
            const files = req.files;

            // Validate file count
            if (files && files.length > Post.MAX_IMAGES) {
                throw createError('1008', `Maximum ${Post.MAX_IMAGES} images allowed`);
            }

            const postId = await postService.createPost(userId, content, files);

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
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const { id } = req.params;

            const post = await postService.getPost(id);

            if (!post) throw createError('9992', 'The requested post does not exist.');

            sendResponse(res, '1000', post);
        } catch (error) {
            next(error);
        }
    }

    async updatePost(req, res, next) {
        try {
            const { error } = postValidator.validateUpdatePost(req.body);
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const { id } = req.params;
            const { content } = req.body;
            const userId = req.user.uid;
            const images = req.files ? req.files.map(file => file.path) : [];

            const updatedPost = await postService.updatePost(id, userId, content, images);

            if (!updatedPost) throw createError('9992', 'The requested post does not exist.');

            sendResponse(res, '1000', updatedPost);
        } catch (error) {
            next(error);
        }
    }

    async deletePost(req, res, next) {
        try {
            const { error } = validateDeletePost(req.params);
            if (error) {
                throw createError('1002', error.details[0].message);
            }
            const { id } = req.params;
            const userId = req.user.uid;
            // Get post with caching
            const post = await postService.getPost(id);
            if (!post) {
                throw createError('9992', 'The requested post does not exist.');
            }
            // Check permissions
            if (post.userId !== userId && !req.user.isAdmin) {
                throw createError('1009', 'Not authorized to delete this post');
            }
            // Check post state
            if (!Post.validateForDeletion(post)) {
                throw createError('1012', 'Post cannot be deleted');
            }
            // Delete post and associated resources
            await postService.deletePost(id);
            // Log the action
            await req.app.locals.auditLog.logAction(userId, id, 'delete_post', {
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

            const { id } = req.params;
            const { content } = req.body;
            const userId = req.user.uid;

            await postService.addComment(id, userId, content);

            sendResponse(res, '1000', { message: 'Comment added successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getComments(req, res, next) {
        try {
            const { error } = postValidator.validateGetPostComments(req.query);
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const { id } = req.params;
            const { limit = 20, lastVisible } = req.query;

            let startAfterDoc = null;

            if (lastVisible) {
                const lastVisibleId = Buffer.from(lastVisible, 'base64').toString('utf-8');
                startAfterDoc = await db.collection(collections.comments).doc(lastVisibleId).get();

                if (!startAfterDoc.exists) {
                    throw createError('1004', 'Invalid lastVisible value');
                }
            }

            const { comments, lastVisible: newLastVisible } = await postService.getComments(
                id,
                parseInt(limit),
                startAfterDoc
            );

            if (!comments.length) throw createError('9994', 'No data or end of list data');

            const encodedLastVisible = newLastVisible
                ? Buffer.from(newLastVisible.id).toString('base64')
                : null;

            sendResponse(res, '1000', {
                comments,
                lastVisible: encodedLastVisible,
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

            const { id } = req.params;
            const { reason, details } = req.body;
            const userId = req.user.uid;

            const post = await postService.getPost(id);

            if (!post) throw createError('9992', 'The requested post does not exist.');

            await postService.reportPost(id, userId, reason, details);

            sendResponse(res, '1000', { message: 'Report submitted successfully. The post is under review.' });
        } catch (error) {
            next(error);
        }
    }

    async toggleLike(req, res, next) {
        try {
            const { error } = postValidator.validateLike(req.params);
            if (error) throw createError('1002', error.details.map(detail => detail.message).join(', '));

            const userId = req.user.uid;
            const { id: postId } = req.params;

            await postService.toggleLike(postId, userId);

            sendResponse(res, '1000', { message: 'Like status updated successfully' });
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
                userId,
                in_campaign,
                campaignId,
                latitude,
                longitude,
                lastVisible,
                limit = 20,
            } = value;

            let startAfterDoc = null;
            if (lastVisible) {
                const lastVisibleId = Buffer.from(lastVisible, 'base64').toString('utf-8');
                startAfterDoc = await db.collection(collections.posts).doc(lastVisibleId).get();
                if (!startAfterDoc.exists) {
                    throw createError('1004', 'Invalid lastVisible value');
                }
            }

            const { posts, lastVisible: newLastVisible } = await postService.getListPosts({
                userId: userId || req.user.uid,
                inCampaign: in_campaign,
                campaignId: campaignId,
                latitude,
                longitude,
                lastVisible: startAfterDoc,
                limit: parseInt(limit),
            });

            const encodedLastVisible = newLastVisible
                ? Buffer.from(newLastVisible.id).toString('base64')
                : null;

            return sendResponse(res, '1000', {
                posts,
                lastVisible: encodedLastVisible,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new PostController();
