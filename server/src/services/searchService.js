import { collections, queryDocuments, createDocument } from '../config/database.js';
import { db } from '../config/firebase.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';

class SearchService {
    async searchPosts(userId, keyword, index, count) {
        try {
            const normalizedKeyword = keyword.trim().toLowerCase();

            const query = queryDocuments(collections.posts, (ref) =>
                ref.orderBy('createdAt', 'desc')
                    .offset(parseInt(index))
                    .limit(parseInt(count))
            );

            const posts = await query;

            const matchingPosts = posts.filter(post => {
                const content = post.content?.toLowerCase() || '';
                return content.includes(normalizedKeyword);
            });

            await createDocument(collections.savedSearches, {
                userId,
                keyword,
                created: new Date(),
            });

            return matchingPosts.map(post => ({
                id: post.id,
                image: post.images?.[0] || '',
                video: post.video || '',
                like: post.likes?.toString() || '0',
                comment: post.comments?.toString() || '0',
                isLiked: post.isLiked ? '1' : '0',
                author: {
                    id: post.userId,
                    userName: post.userName || '',
                    avatar: post.avatar || '',
                },
                described: post.content || '',
            }));
        } catch (error) {
            logger.error('Search service error:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async searchUsers(currentUserId, keyword, index, count) {
        try {
            const normalizedKeyword = keyword.trim().toLowerCase();

            // Get blocked users list for current user
            const blockedUsersSnapshot = await db.collection(collections.blocks)
                .where('userId', '==', currentUserId)
                .get();

            const blockedUserIds = new Set(
                blockedUsersSnapshot.docs.map(doc => doc.data().blockedUserId)
            );

            // Query users
            const usersSnapshot = await db.collection(collections.users)
                .orderBy('userName')
                .offset(index)
                .limit(count)
                .get();

            const matchingUsers = [];

            for (const doc of usersSnapshot.docs) {
                const userData = doc.data();
                const userId = doc.id;

                // Skip if user is blocked or is current user
                if (blockedUserIds.has(userId) || userId === currentUserId) {
                    continue;
                }

                // Check if username matches search
                const userName = userData.userName?.toLowerCase() || '';
                if (userName.includes(normalizedKeyword)) {
                    matchingUsers.push({
                        id: userId,
                        userName: userData.userName || '',
                        avatar: userData.avatar || '',
                        same_friends: userData.mutualFriendsCount || 0
                    });
                }
            }

            return matchingUsers;

        } catch (error) {
            logger.error('Search users service error:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getSavedSearches(userId, index, count) {
        try {
            const query = queryDocuments(collections.savedSearches, 'userId', '==', userId);
            const savedSearches = await query;

            // Return empty array if no saved searches found
            if (!savedSearches) {
                return [];
            }

            return savedSearches
                .sort((a, b) => b.created - a.created)
                .slice(index, index + count);
        } catch (error) {
            logger.error('Get saved searches service error:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async deleteSavedSearch(userId, searchId, deleteAll) {
        try {
            if (deleteAll) {
                const savedSearchesSnapshot = await db.collection(collections.savedSearches)
                    .where('userId', '==', userId)
                    .get();

                if (savedSearchesSnapshot.empty) {
                    throw createError('9994', 'No saved searches to delete');
                }

                const batch = db.batch();
                savedSearchesSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            } else {
                const savedSearchRef = db.collection(collections.savedSearches).doc(searchId);
                const savedSearchDoc = await savedSearchRef.get();

                if (!savedSearchDoc.exists || savedSearchDoc.data().userId !== userId) {
                    throw createError('1004', 'Saved search not found or not authorized');
                }
                await savedSearchRef.delete();
            }
        } catch (error) {
            logger.error('Delete saved search service error:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }
}

export default new SearchService();
