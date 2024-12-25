import Post from '../models/Post.js';
import admin from 'firebase-admin';
import { getBoundingBox, getDistance } from '../utils/geoUtils.js';
import { collections, createDocument, getDocument, updateDocument } from '../config/database.js';
import { db } from '../config/firebase.js';
import createError from '../utils/customError.js';
import logger from '../utils/logger.js';

class PostService {
    async createPost(userId, content, images) {
        try {
            const postData = new Post({ userId, content, images }).toJSON();
            const postId = await createDocument(collections.posts, postData);
            return postId;
        } catch (error) {
            logger.error('Error in createPost service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getPost(postId) {
        try {
            const post = await getDocument(collections.posts, postId);
            return post ? new Post(post) : null;
        } catch (error) {
            logger.error('Error in getPost service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async updatePost(postId, userId, content, images) {
        try {
            const existingPost = await this.getPost(postId);
            if (!existingPost || existingPost.userId !== userId) {
                throw createError('9992', 'Post not found or unauthorized');
            }

            const updatedPost = new Post({
                ...existingPost,
                content,
                images,
                updatedAt: new Date(),
            }).toJSON();

            await updateDocument(collections.posts, postId, updatedPost);
            return updatedPost;
        } catch (error) {
            logger.error('Error in updatePost service:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }

    async deletePost(postId) {
        try {
            await db.runTransaction(async (transaction) => {
                const postRef = db.collection(collections.posts).doc(postId);
                const postDoc = await transaction.get(postRef);

                if (!postDoc.exists) {
                    throw createError('9992', 'The requested post does not exist.');
                }

                // Delete associated comments and likes
                const commentsQuery = postRef.collection('comments');
                const likesQuery = db.collection(collections.likes).where('postId', '==', postId);

                const [commentsSnapshot, likesSnapshot] = await Promise.all([
                    transaction.get(commentsQuery),
                    transaction.get(likesQuery),
                ]);

                commentsSnapshot.docs.forEach((doc) => {
                    transaction.delete(doc.ref);
                });

                likesSnapshot.docs.forEach((doc) => {
                    transaction.delete(doc.ref);
                });

                transaction.delete(postRef);
            });
        } catch (error) {
            logger.error('Error in deletePost service:', error);
            throw createError('9999', 'Exception error');
        }
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
        try {
            const isLiked = await this.checkUserLike(postId, userId);
            await db.runTransaction(async (transaction) => {
                const postRef = db.collection(collections.posts).doc(postId);
                const likeRef = db.collection(collections.likes).doc(`${postId}_${userId}`);

                if (isLiked) {
                    transaction.update(postRef, { likes: admin.firestore.FieldValue.increment(-1) });
                    transaction.delete(likeRef);
                } else {
                    transaction.update(postRef, { likes: admin.firestore.FieldValue.increment(1) });
                    transaction.set(likeRef, { userId, postId, createdAt: new Date() });
                }
            });
        } catch (error) {
            logger.error('Error in toggleLike service:', error);
            throw createError('9999', 'Exception error');
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

    async getComments(postId, limit = 20, startAfterDoc = null) {
        try {
            let query = db.collection(collections.comments)
                .where('postId', '==', postId)
                .orderBy('createdAt', 'desc')
                .limit(limit);

            if (startAfterDoc) {
                query = query.startAfter(startAfterDoc);
            }

            const snapshot = await query.get();

            const comments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

            return {
                comments,
                lastVisible,
            };
        } catch (error) {
            logger.error('Error in getComments service:', error);
            throw createError('9999', 'Exception error');
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
                .orderBy('createdAt', 'desc')
                .limit(limit);

            if (inCampaign === '1' && campaignId) {
                query = query.where('campaignId', '==', campaignId);
            }

            if (latitude && longitude) {
                const radiusKm = 10;
                const bounds = getBoundingBox(latitude, longitude, radiusKm);
                query = query.where('location.latitude', '>=', bounds.minLat)
                    .where('location.latitude', '<=', bounds.maxLat);
            }

            if (lastVisible) {
                query = query.startAfter(lastVisible);
            }

            const snapshot = await query.get();

            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            const authorIds = [...new Set(posts.map(post => post.userId))];
            const authorDocs = await db.collection(collections.users).where('__name__', 'in', authorIds).get();
            const authorMap = new Map(authorDocs.docs.map(doc => [doc.id, doc.data()]));

            const likeChecks = posts.map(post => this.checkUserLike(post.id, userId));
            const likeResults = await Promise.all(likeChecks);
            const newLastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

            const postsWithDetails = posts.map((post, index) => {
                let postWithDetails = {
                    ...post,
                    isLiked: likeResults[index],
                    author: {
                        id: post.userId,
                        ...authorMap.get(post.userId),
                    },
                };

                if (latitude && longitude && post.location) {
                    const distance = getDistance(
                        latitude,
                        longitude,
                        post.location.latitude,
                        post.location.longitude
                    );
                    if (distance <= 10) {
                        postWithDetails.distance = distance.toFixed(2);
                    } else {
                        return null;
                    }
                }

                return postWithDetails;
            }).filter(Boolean);

            return {
                posts: postsWithDetails,
                lastVisible: newLastVisible,
            };
        } catch (error) {
            logger.error('Error in getListPosts service:', error);
            throw createError('9999', 'Exception error');
        }
    }
}

export default new PostService();
