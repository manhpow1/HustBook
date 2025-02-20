import Post from '../models/Post.js';
import admin from 'firebase-admin';
import { collections, createDocument, getDocument, updateDocument } from '../config/database.js';
import { db } from '../config/firebase.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';
import redis from '../utils/redis.js';
import { handleImageUpload, deleteFileFromStorage } from '../utils/helpers.js';

class PostService {
    async createPost(userId, content, contentLowerCase, imageFiles) {
        try {
            let processedImageUrls = [];

            if (imageFiles && imageFiles.length > 0) {
                const uploadPromises = imageFiles.map(file =>
                    handleImageUpload(file, `posts/${userId}`, {
                        width: 1920,
                        height: 1080,
                        fit: 'inside'
                    })
                );
                processedImageUrls = await Promise.all(uploadPromises);
            }

            const postId = await createDocument(collections.posts, {});

            const postData = new Post({
                postId,
                userId,
                content,
                contentLowerCase,
                images: processedImageUrls,
                createdAt: new Date(),
                likes: 0,
                comments: 0
            }).toJSON();

            await updateDocument(collections.posts, postId, postData);

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
                postId: postDoc.postId,
                ...postData,
                created: postData.createdAt?.toDate?.()?.toISOString() || null,
                isLiked: likeDoc.exists ? '1' : '0',
                author: {
                    userId: postData.userId,
                    userName: authorData.userName || 'Unknown User',
                    avatar: authorData.avatar || ''
                }
            };
        } catch (error) {
            logger.error('Error in getPost service:', error);
            throw error.code ? error : createError('9999', 'Exception error');
        }
    }

    async updatePost(postId, userId, content, contentLowerCase, images) {
        try {
            // Validate and fetch existing post
            if (!postId || !userId || !content) {
                logger.error('postService.updatePost: Missing required fields', {
                    postId: !!postId,
                    userId: !!userId,
                    content: !!content
                });
                throw createError('1002', 'Missing required fields');
            }

            const existingPost = await this.getPost(postId);
            if (!existingPost) {
                throw createError('9992', 'Post not found');
            }
            
            // Ensure content is properly processed
            const processedContent = String(content).trim();
            if (processedContent.length === 0) {
                throw createError('1002', 'Content cannot be empty after processing');
            }
            
            logger.debug('postService.updatePost: Validation passed', {
                postId,
                userId,
                contentLength: processedContent.length,
                content: processedContent.substring(0, 50) + (processedContent.length > 50 ? '...' : ''),
                imagesCount: images?.length || 0,
                rawContent: content
            });
            if (!existingPost) {
                throw createError('9992', 'Post not found');
            }
            if (existingPost.userId !== userId) {
                throw createError('1009', 'Not authorized to update this post');
            }

            // Process images
            let processedImages = [];
            
            // Parse existingImages from the request if present
            const existingImages = Array.isArray(images) 
                ? images.filter(url => typeof url === 'string' && url.startsWith('http'))
                : [];

            logger.debug('Processing images in updatePost:', {
                totalImages: images?.length || 0,
                existingImages: existingImages.length,
                newImages: images?.filter(img => img?.buffer)?.length || 0
            });

            // Filter out new image files that need processing
            const newImages = Array.isArray(images) 
                ? images.filter(img => img?.buffer && img?.mimetype)
                : [];

            logger.debug('postService.updatePost: Image analysis', {
                postId,
                existingImagesCount: existingImages.length,
                newImagesCount: newImages.length,
                totalImages: existingImages.length + newImages.length
            });

            // Validate total image count
            if (existingImages.length + newImages.length > Post.MAX_IMAGES) {
                throw createError('1008', `Maximum ${Post.MAX_IMAGES} images allowed`);
            }

            // Process new image uploads
            if (newImages.length > 0) {
                try {
                    processedImages = await Promise.all(
                        newImages.map(file => 
                            handleImageUpload(file, `posts/${userId}`, {
                                width: 1920,
                                height: 1080,
                                fit: 'inside'
                            })
                        )
                    );
                    logger.debug('postService.updatePost: Processed new images', {
                        postId,
                        processedCount: processedImages.length
                    });
                } catch (uploadError) {
                    logger.error('postService.updatePost: Image processing failed', uploadError);
                    throw createError('1007', 'Failed to process image uploads');
                }
            }

            // Ensure dates are properly formatted
            const createdAt = existingPost.created ? new Date(existingPost.created) : new Date();

            if (!content || typeof content !== 'string') {
                logger.error('Invalid content received:', { content });
                throw createError('1002', 'Invalid content provided');
            }

            // Create updated post with validation
            const updatedPost = new Post({
                postId,
                userId,
                content: content.trim(),
                contentLowerCase: Array.isArray(contentLowerCase) ? contentLowerCase : content.toLowerCase().split(/\s+/).filter(Boolean),
                images: [...existingImages, ...processedImages],
                createdAt,
                updatedAt: new Date(),
                likes: existingPost.likes || 0,
                comments: existingPost.comments || 0
            });

            // Validate the updated post
            updatedPost.validate();

            // Find images to delete (images in existing post that aren't in existingImages)
            const imagesToDelete = existingPost.images?.filter(
                url => !existingImages.includes(url)
            ) || [];

            // Delete old images that are no longer needed
            if (imagesToDelete.length > 0) {
                try {
                    await Promise.all(
                        imagesToDelete.map(url => deleteFileFromStorage(url))
                    );
                } catch (error) {
                    logger.error('Error deleting old images:', error);
                    // Continue with update even if image deletion fails
                }
            }

            logger.debug('postService.updatePost: Saving to database', {
                postId,
                updatedContent: !!updatedPost.content,
                contentPreview: updatedPost.content.substring(0, 50) + (updatedPost.content.length > 50 ? '...' : ''),
                updatedImages: updatedPost.images.length,
                contentChanged: existingPost.content !== updatedPost.content
            });

            // Update in database
            await updateDocument(collections.posts, postId, updatedPost.toJSON());

            logger.debug('postService.updatePost: Update successful', { postId });

            // Clear cache
            await redis.cache.del(`post:${postId}`);
            await redis.cache.del(`user:${userId}:posts`);
            await redis.cache.del(`posts:recent`);

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
                transaction.get(db.collection(collections.comments).where('postId', '==', postId)),
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
                redis.cache.del(`post:${postId}`),
                redis.cache.del(`user:${post.userId}:posts`),
                redis.cache.del(`post:${postId}:comments`),
                redis.cache.del(`post:${postId}:likes`)
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
                redis.cache.del(`post:${postId}`),
                redis.cache.del(`user:${userId}:likes`),
                redis.cache.del(`post:${postId}:likeCount`)
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
            const commentRef = db.collection(collections.comments).doc();
            await db.runTransaction(async (transaction) => {
                const postRef = db.collection(collections.posts).doc(postId);
                const postDoc = await transaction.get(postRef);

                if (!postDoc.exists) {
                    throw createError('9992', 'Post not found');
                }

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
            return commentRef.id;
        } catch (error) {
            logger.error('Error in addComment service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getUserPostsCount(userId) {
        try {
            const postsRef = db.collection(collections.posts)
                .where('userId', '==', userId);

            const snapshot = await postsRef.count().get();
            return snapshot.data().count;
        } catch (error) {
            logger.error('Error in getUserPostsCount service:', error);
            return 0;
        }
    }

    async getComments(postId, userId, limit = 20, lastVisible = null) {
        try {
            // First verify the post exists
            const postRef = db.collection(collections.posts).doc(postId);
            const postDoc = await postRef.get();

            if (!postDoc.exists) {
                throw createError('9992', 'Post not found');
            }

            // Check cache first
            const cacheKey = `post:${postId}:comments`;
            const cachedComments = await redis.cache.get(cacheKey);

            if (cachedComments) {
                logger.debug('Returning cached comments');
                return {
                    comments: cachedComments,
                    lastVisible: null,
                    totalComments: cachedComments.length
                };
            }

            let query = db.collection(collections.comments)
                .where('postId', '==', postId)
                .orderBy('createdAt', 'desc')
                .limit(limit);

            if (lastVisible) {
                try {
                    const decodedLastVisible = Buffer.from(lastVisible, 'base64').toString('utf-8');
                    const lastDoc = await db.collection(collections.comments).doc(decodedLastVisible).get();
                    if (!lastDoc.exists) {
                        throw createError('1004', 'Invalid pagination token');
                    }
                    query = query.startAfter(lastDoc);
                } catch (error) {
                    logger.error('Error decoding lastVisible token:', error);
                    throw createError('1004', 'Invalid pagination token');
                }
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                return {
                    comments: [],
                    lastVisible: null
                };
            }

            const commentUserIds = new Set();
            const comments = [];

            snapshot.docs.forEach(doc => {
                const commentData = doc.data();
                if (commentData.userId) {
                    commentUserIds.add(commentData.userId);
                }
                comments.push({
                    commentId: doc.id,
                    ...commentData
                });
            });

            // Chỉ thực hiện truy vấn users nếu có userIds
            const userMap = new Map();
            if (commentUserIds.size > 0) {
                const userIdsArray = Array.from(commentUserIds);
                // Xử lý theo từng batch 10 users
                for (let i = 0; i < userIdsArray.length; i += 10) {
                    const batch = userIdsArray.slice(i, i + 10);
                    const userDocs = await db.collection(collections.users)
                        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
                        .get();

                    userDocs.docs.forEach(doc => {
                        const userData = doc.data();
                        userMap.set(doc.id, {
                            userId: doc.id,
                            userName: userData.userName || doc.id.substring(0, 8),
                            avatar: userData.avatar || ''
                        });
                    });
                }
            }

            // Get all unique user IDs from comments
            const userIds = [...new Set(comments.map(comment => comment.userId))];

            // Fetch all user data in one batch
            const userDocs = await Promise.all(
                userIds.map(userId =>
                    db.collection(collections.users).doc(userId).get()
                )
            );

            // Create a map of user data
            const userDataMap = new Map(
                userDocs.map(doc => [
                    doc.id,
                    doc.exists ? doc.data() : null
                ])
            );

            const enrichedComments = comments.map(comment => {
                const userData = userDataMap.get(comment.userId);
                const commentData = {
                    commentId: comment.commentId,
                    content: comment.content,
                    created: comment.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    likes: parseInt(comment.likes || 0),
                    isLiked: Boolean(comment.isLiked),
                    user: {
                        userId: comment.userId,
                        userName: userData?.userName || 'Anonymous User',
                        avatar: userData?.avatar || ''
                    }
                };

                // Validate required fields
                if (!commentData.commentId || !commentData.content || !commentData.user.userId) {
                    logger.warn('Invalid comment data:', { commentId: comment.commentId });
                    return null;
                }

                return commentData;
            }).filter(Boolean); // Remove any invalid comments

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
            await redis.cache.set(cacheKey, comments, 300);
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
                postId: doc.id,
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
        postId,
        lastVisible,
        limit = 20,
    }) {
        try {
            let query = db.collection(collections.posts)
                .orderBy('createdAt', 'desc');

            // Add filters
            if (postId) {
                query = query.where('__name__', '==', postId);
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
                    postId: doc.id,
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
                        userId: post.userId,
                        userName: author.userName || 'Anonymous User',
                        avatar: author.avatar || '',
                        online: author.online || '0'
                    }
                };
            });

            // Apply location filtering if coordinates provided
            let filteredPosts = enrichedPosts;

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
        try {
            const authorsMap = new Map();
            if (!authorIds?.length) return authorsMap;

            // Process in chunks of 10 (Firestore limitation)
            for (let i = 0; i < authorIds.length; i += 10) {
                const chunk = authorIds.slice(i, i + 10);
                if (chunk.length === 0) continue;

                try {
                    const snapshot = await db.collection(collections.users)
                        .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
                        .get();

                    snapshot.docs.forEach(doc => {
                        if (doc.exists) {
                            authorsMap.set(doc.id, {
                                userId: doc.id,
                                userName: doc.data().userName || 'Unknown User',
                                avatar: doc.data().avatar || '',
                                online: doc.data().online || '0'
                            });
                        }
                    });
                } catch (error) {
                    logger.error(`Error fetching author chunk: ${chunk}`, error);
                    // Continue with next chunk even if one fails
                }
            }

            return authorsMap;
        } catch (error) {
            logger.error('Error in getAuthorsInfo:', error);
            throw error;
        }
    }
}

export default new PostService();
