import { collections } from '../config/database.js';
import { db } from '../config/firebase.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';

class VideoService {
    async getListVideos({
        userId,
        lastId,
        index,
        count,
    }) {
        try {
            let query = db.collection(collections.posts)
                .where('type', '==', 'video')
                .orderBy('createdAt', 'desc');
            if (lastId) {
                const lastPost = await db.collection(collections.posts).doc(lastId).get();
                if (lastPost.exists) {
                    query = query.startAfter(lastPost);
                }
            }

            if (index > 0) {
                query = query.offset(index);
            }

            const snapshot = await query.limit(count).get();

            const posts = [];
            for (const doc of snapshot.docs) {
                const data = doc.data();
                posts.push({
                    id: doc.id,
                    name: data.name,
                    video: {
                        url: data.videoUrl,
                        thumb: data.thumbnailUrl,
                    },
                    content: data.description,
                    created: data.createdAt.toDate().toISOString(),
                    like: data.likes.toString(),
                    comment: data.comments.toString(),
                    isLiked: data.likedBy && data.likedBy.includes(userId) ? '1' : '0',
                    isBlocked: data.blockedBy && data.blockedBy.includes(userId) ? '1' : '0',
                    canComment: data.canComment ? '1' : '0',
                    canEdit: data.userId === userId ? '1' : '0',
                    banned: data.banned ? '1' : '0',
                    state: data.state,
                    author: {
                        id: data.userId,
                        userName: data.userName,
                        avatar: data.userAvatar,
                    },
                });
            }

            return {
                posts,
                newItems: posts.length,
                lastId: posts.length > 0 ? posts[posts.length - 1].id : null,
            };
        } catch (error) {
            logger.error('Error in getListVideos service:', error);
            throw createError('9999', 'Exception error');
        }
    }
}

export default new VideoService();
