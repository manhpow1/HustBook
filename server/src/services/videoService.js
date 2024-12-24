const { collections } = require('../config/database');
const { db } = require('../config/firebase');
const { getBoundingBox, getDistance } = require('../utils/geoUtils');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

class videoService {
    async getListVideos({
        userId,
        inCampaign,
        campaignId,
        latitude,
        longitude,
        lastId,
        index,
        count,
    }) {
        try {
            let query = db.collection(collections.posts)
                .where('type', '==', 'video')
                .orderBy('createdAt', 'desc');

            if (inCampaign === '1' && campaignId) {
                query = query.where('campaignId', '==', campaignId);
            }

            if (latitude && longitude) {
                const radiusKm = 10;
                const box = getBoundingBox(latitude, longitude, radiusKm);

                query = query.where('location.latitude', '>=', box.minLat)
                    .where('location.latitude', '<=', box.maxLat);
            }

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
                if (latitude && longitude && data.location) {
                    const distance = getDistance(latitude, longitude, data.location.latitude, data.location.longitude);
                    if (distance > 10) continue;
                }
                posts.push({
                    id: doc.id,
                    name: data.name,
                    video: {
                        url: data.videoUrl,
                        thumb: data.thumbnailUrl,
                    },
                    described: data.description,
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

module.exports = new videoService();
