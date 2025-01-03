import Post from '../models/Post.js';
import admin from 'firebase-admin';
import { getBoundingBox, getDistance } from '../utils/geoUtils.js';
import { collections, createDocument, getDocument, updateDocument } from '../config/database.js';
import { db } from '../config/firebase.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';
import redis from '../utils/redis.js';
import { handleImageUpload, deleteFileFromStorage } from '../utils/helpers.js';

class PostService {
    async createPost(userId, content, imageFiles) {
        try {
            let processedImageUrls = [];

            if (imageFiles && imageFiles.length > 0) {
                const uploadPromises = imageFiles.map(file =>
                    handleImageUpload(file, `posts/${userId}`)
                );
                processedImageUrls = await Promise.all(uploadPromises);
            }

            const postData = new Post({
                userId,
                content,
                images: processedImageUrls,
                createdAt: new Date(),
                likes: 0,
                comments: 0
            }).toJSON();

            const postId = await createDocument(collections.posts, postData);

            // Cache invalidation
            await redis.cache.del(`user:${userId}:posts`);

            return postId;
        } catch (error) {
            logger.error('Error in createPost service:', error);
            throw error.code ? error : createError('9999', 'Exception error');
        }
    }

    async getPost(postId, userId) {
        try {
            const postRef = db.collection(collections.posts).doc(postId);
            const postDoc = await postRef.get();

            if (!postDoc.exists) {
                return null;
            }

            const postData = postDoc.data();

            // Get author info
            const authorDoc = await db.collection(collections.users)
                .doc(postData.userId)
                .get();

            const authorData = authorDoc.exists ? authorDoc.data() : {};

            // Check if user has liked the post
            const likeRef = db.collection(collections.likes)
                .doc(`${postId}_${userId}`);
            const likeDoc = await likeRef.get();

            return {
                id: postDoc.id,
                ...postData,
                created: postData.createdAt?.toDate?.()?.toISOString() || null,
                isLiked: likeDoc.exists ? '1' : '0',
                author: {
                    id: postData.userId,
                    userName: authorData.userName || 'Unknown User',
                    avatar: authorData.avatar || ''
                }
            };
        } catch (error) {
            logger.error('Error in getPost service:', error);
            throw error.code ? error : createError('9999', 'Exception error');
        }
    }

    async updatePost(postId, userId, content, newImages) {
        try {
            const existingPost = await this.getPost(postId);
            if (!existingPost) {
                throw createError('9992', 'Post not found');
            }

            if (existingPost.userId !== userId) {
                throw createError('1009', 'Not authorized to update this post');
            }

            // Create updated post with validation
            const updatedPost = new Post({
                ...existingPost,
                content,
                images: newImages,
                updatedAt: new Date()
            });

            // Validate the updated post
            updatedPost.validate();

            // Delete old images if they're being replaced
            if (existingPost.images && existingPost.images.length > 0 && newImages.length > 0) {
                try {
                    await Promise.all(
                        existingPost.images.map(url => deleteFileFromStorage(url))
                    );
                } catch (error) {
                    logger.error('Error deleting old images:', error);
                    // Continue with update even if image deletion fails
                }
            }

            // Update in database
            await updateDocument(collections.posts, postId, updatedPost.toJSON());

            // Clear cache
            await redis.del(`post:${postId}`);
            await redis.del(`user:${userId}:posts`);

            return updatedPost.toJSON();
        } catch (error) {
            logger.error('Error in updatePost service:', error);
            throw error.code ? error : createError('9999', 'Exception error');
        }
    }

    async deletePost(postId, userId) {
        return await db.runTransaction(async (transaction) => {
            const postRef = db.collection(collections.posts).doc(postId);
            const postDoc = await transaction.get(postRef);

            if (!postDoc.exists) {
                throw createError('9992', 'Post not found');
            }

            const post = postDoc.data();
            if (post.userId !== userId && !post.isAdmin) {
                throw createError('1009', 'Not authorized to delete this post');
            }

            if (!Post.validateForDeletion(post)) {
                throw createError('1012', 'Post cannot be deleted');
            }

            // Get associated resources
            const [commentsSnapshot, likesSnapshot] = await Promise.all([
                transaction.get(postRef.collection('comments')),
                transaction.get(db.collection(collections.likes).where('postId', '==', postId))
            ]);

            // Delete comments
            commentsSnapshot.docs.forEach(doc => {
                transaction.delete(doc.ref);
            });

            // Delete likes
            likesSnapshot.docs.forEach(doc => {
                transaction.delete(doc.ref);
            });

            // Delete images
            if (post.images?.length > 0) {
                await Promise.all(post.images.map(url => deleteFileFromStorage(url)));
            }

            // Delete post
            transaction.delete(postRef);

            // Clear caches
            await Promise.all([
                redis.del(`post:${postId}`),
                redis.del(`user:${post.userId}:posts`),
                redis.del(`post:${postId}:comments`),
                redis.del(`post:${postId}:likes`)
            ]);

            return true;
        });
    }

    async checkUserLike(postId, userId) {
        try {
            const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);
            const likeDoc = await likeRef.get();
            return likeDoc.exists;
        } catch (error) {
            logger.error('Error in checkUserLike service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async toggleLike(postId, userId) {
        const likeId = `${postId}_${userId}`;

        return await db.runTransaction(async (transaction) => {
            const postRef = db.collection(collections.posts).doc(postId);
            const likeRef = db.collection(collections.likes).doc(likeId);

            const [postDoc, likeDoc] = await Promise.all([
                transaction.get(postRef),
                transaction.get(likeRef)
            ]);

            if (!postDoc.exists) {
                throw createError('9992', 'Post not found');
            }

            const liked = !likeDoc.exists;
            const postData = postDoc.data();
            const newLikeCount = (postData.likes || 0) + (liked ? 1 : -1);

            if (liked) {
                transaction.set(likeRef, {
                    userId,
                    postId,
                    createdAt: new Date()
                });
            } else {
                transaction.delete(likeRef);
            }

            transaction.update(postRef, {
                likes: newLikeCount,
                updatedAt: new Date()
            });

            // Invalidate caches
            await Promise.all([
                redis.del(`post:${postId}`),
                redis.del(`user:${userId}:likes`),
                redis.del(`post:${postId}:likeCount`)
            ]);

            // Log activity
            await this.logLikeActivity(userId, postId, liked);

            return {
                liked,
                likeCount: newLikeCount
            };
        });
    }

    async logLikeActivity(userId, postId, isLike) {
        try {
            await db.collection('activities').add({
                type: isLike ? 'like' : 'unlike',
                userId,
                postId,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Failed to log like activity:', error);
            // Non-blocking error
        }
    }

    async addComment(postId, userId, content) {
        try {
            await db.runTransaction(async (transaction) => {
                const postRef = db.collection(collections.posts).doc(postId);
                const postDoc = await transaction.get(postRef);

                if (!postDoc.exists) {
                    throw createError('9992', 'Post not found');
                }

                const commentRef = db.collection(collections.comments).doc();
                transaction.set(commentRef, {
                    userId,
                    postId,
                    content,
                    createdAt: new Date(),
                });

                transaction.update(postRef, {
                    comments: admin.firestore.FieldValue.increment(1),
                });
            });
            return true;
        } catch (error) {
            logger.error('Error in addComment service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getComments(postId, userId, limit = 20, lastVisible = null) {
        try {
            const postRef = db.collection(collections.posts).doc(postId);
            const post = await postRef.get();

            if (!post.exists) {
                throw createError('9992', 'Post not found');
            }

            let query = postRef.collection('comments')
                .orderBy('createdAt', 'desc')
                .limit(limit);

            if (lastVisible) {
                const decodedLastVisible = Buffer.from(lastVisible, 'base64').toString('utf-8');
                const lastDoc = await postRef.collection('comments').doc(decodedLastVisible).get();

                if (!lastDoc.exists) {
                    throw createError('1004', 'Invalid pagination token');
                }
                query = query.startAfter(lastDoc);
            }

            const snapshot = await query.get();
            const commentUserIds = new Set();
            const comments = [];

            snapshot.docs.forEach(doc => {
                const commentData = doc.data();
                commentUserIds.add(commentData.userId);
                comments.push({
                    id: doc.id,
                    ...commentData
                });
            });

            // Get user data in parallel
            const userDocs = await db.collection(collections.users)
                .where('__name__', 'in', Array.from(commentUserIds))
                .get();

            const userMap = new Map();
            userDocs.docs.forEach(doc => {
                userMap.set(doc.id, {
                    id: doc.id,
                    userName: doc.data().userName || '',
                    avatar: doc.data().avatar || ''
                });
            });

            const enrichedComments = comments.map(comment => ({
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt.toDate().toISOString(),
                author: userMap.get(comment.userId) || {
                    id: comment.userId,
                    userName: 'Unknown User',
                    avatar: ''
                },
                isAuthor: comment.userId === userId,
                canEdit: comment.userId === userId || post.data().userId === userId,
                canDelete: comment.userId === userId || post.data().userId === userId
            }));

            // Cache comments
            await this.cacheComments(postId, enrichedComments);

            return {
                comments: enrichedComments,
                lastVisible: snapshot.docs.length > 0 ?
                    snapshot.docs[snapshot.docs.length - 1].id : null
            };
        } catch (error) {
            logger.error('Error in getComments service:', error);
            throw error.code ? error : createError('9999', 'Exception error');
        }
    }

    async cacheComments(postId, comments) {
        try {
            const cacheKey = `post:${postId}:comments`;
            await redis.setex(cacheKey, 300, JSON.stringify(comments));
        } catch (error) {
            logger.warn('Failed to cache comments:', error);
        }
    }

    async getUserPosts(userId, limit = 20, startAfterDoc = null) {
        try {
            let query = db.collection(collections.posts)
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc');

            query = query.limit(limit);

            if (startAfterDoc) {
                query = query.startAfter(startAfterDoc);
            }

            const snapshot = await query.get();

            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

            return {
                posts,
                lastVisible,
            };
        } catch (error) {
            logger.error('Error in getUserPosts service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async reportPost(postId, userId, reason, details) {
        try {
            const reportData = {
                postId,
                userId,
                reason,
                details: details || '',
                createdAt: new Date(),
                status: 'pending',
            };
            await createDocument(collections.reports, reportData);
            // Optionally, notify admins or handle further logic
        } catch (error) {
            logger.error('Error in reportPost service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getListPosts({
        id,
        userId,
        inCampaign,
        campaignId,
        latitude,
        longitude,
        lastVisible,
        limit = 20,
    }) {
        try {
            let query = db.collection(collections.posts)
                .orderBy('createdAt', 'desc');

            // Add filters
            if (id) {
                query = query.where('__name__', '==', id);
            }
            
            if (userId) {
                query = query.where('userId', '==', userId);
            }

            if (inCampaign === '1' && campaignId) {
                query = query.where('campaignId', '==', campaignId);
            }

            // Handle pagination
            if (lastVisible) {
                const lastDoc = await db.collection(collections.posts).doc(lastVisible).get();
                if (lastDoc.exists) {
                    query = query.startAfter(lastDoc);
                }
            }

            // Execute query
            const snapshot = await query.limit(limit).get();

            if (snapshot.empty) {
                return { posts: [], lastVisible: null };
            }

            // Process posts
            const posts = [];
            const authorIds = new Set();

            snapshot.docs.forEach(doc => {
                const postData = doc.data();
                authorIds.add(postData.userId);
                posts.push({
                    id: doc.id,
                    ...postData,
                    created: postData.createdAt?.toDate?.()?.toISOString() || null
                });
            });

            // Get author information
            const authors = await this.getAuthorsInfo(Array.from(authorIds));

            // Enrich posts with author info
            const enrichedPosts = posts.map(post => {
                const author = authors.get(post.userId) || {};
                return {
                    ...post,
                    author: {
                        id: post.userId,
                        userName: author.userName || 'Unknown User',
                        avatar: author.avatar || ''
                    }
                };
            });

            // Apply location filtering if coordinates provided
            let filteredPosts = enrichedPosts;
            if (latitude && longitude) {
                filteredPosts = enrichedPosts.filter(post => {
                    if (!post.location) return false;
                    const distance = getDistance(
                        parseFloat(latitude),
                        parseFloat(longitude),
                        post.location.latitude,
                        post.location.longitude
                    );
                    return distance <= 10; // 10km radius
                });
            }

            return {
                posts: filteredPosts,
                lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id || null
            };
        } catch (error) {
            logger.error('Error in getListPosts service:', error);
            throw error.code ? error : createError('9999', 'Exception error');
        }
    }

    async getAuthorsInfo(authorIds) {
        const authorsMap = new Map();

        if (authorIds.length === 0) return authorsMap;

        const chunks = [];
        for (let i = 0; i < authorIds.length; i += 10) {
            chunks.push(authorIds.slice(i, i + 10));
        }

        await Promise.all(chunks.map(async chunk => {
            const snapshot = await db.collection(collections.users)
                .where('__name__', 'in', chunk)
                .get();

            snapshot.docs.forEach(doc => {
                authorsMap.set(doc.id, doc.data());
            });
        }));

        return authorsMap;
    }

    // Helper method to cache posts list
    async cachePostsList(userId, posts) {
        try {
            const cacheKey = `user:${userId}:posts:list`;
            await redis.setex(cacheKey, 300, JSON.stringify(posts)); // Cache for 5 minutes
        } catch (error) {
            logger.warn('Failed to cache posts list:', error);
            // Continue execution even if caching fails
        }
    }
}

export default new PostService();
