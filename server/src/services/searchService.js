import { collections, queryDocuments, createDocument } from '../config/database.js';
import { db } from '../config/firebase.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';

class SearchService {
    async searchPosts(userId, keyword, index, count) {
        try {
            const normalizedKeyword = decodeURIComponent(keyword.trim()).toLowerCase().split(' ');

            // Create compound query to search in contentLowerCase field
            const query = db.collection(collections.posts)
                .where('contentLowerCase', 'array-contains-any', normalizedKeyword)
                .orderBy('createdAt', 'desc')
                .offset(parseInt(index))
                .limit(parseInt(count));

            const postsSnapshot = await query.get();
            const matchingPosts = postsSnapshot.docs.map(doc => doc.data());

            await createDocument(collections.savedSearches, {
                userId,
                keyword,
                created: new Date(),
            });

            return matchingPosts.map(post => ({
                postId: post.postId,
                image: post.images?.[0] || '',
                likes: post.likes?.toString() || '0',
                comment: post.comments?.toString() || '0',
                isLiked: post.isLiked ? '1' : '0',
                author: {
                    userId: post.userId,
                    userName: post.userName || '',
                    avatar: post.avatar || '',
                },
                content: post.content || '',
            }));
        } catch (error) {
            logger.error('Search service error:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async searchUsers(currentUserId, keyword, index, count) {
        try {
            const normalizedKeyword = decodeURIComponent(keyword.trim()).toLowerCase();

            const usersQuery = db.collection(collections.users)
                .where('userNameLowerCase', 'array-contains', normalizedKeyword)
                .offset(index)
                .limit(count);

            const [usersSnapshot, blockedUsersSnapshot] = await Promise.all([
                usersQuery.get(),
                db.collection(collections.blocks)
                    .where('userId', '==', currentUserId)
                    .get()
            ]);

            if (usersSnapshot.empty) {
                throw createError('9994', 'No data or end of list data');
            }

            const blockedUserIds = new Set(
                blockedUsersSnapshot.docs.map(doc => doc.data().blockedUserId)
            );

            const matchingUsers = usersSnapshot.docs
                .filter(doc => {
                    const userId = doc.id;
                    return !blockedUserIds.has(userId) && userId !== currentUserId;
                })
                .map(doc => {
                    const userData = doc.data();
                    return {
                        userId: doc.id,
                        userName: userData.userName || '',
                        avatar: userData.avatar || '',
                        same_friends: userData.mutualFriendsCount || 0
                    };
                });

            if (matchingUsers.length === 0) {
                throw createError('9994', 'No data or end of list data');
            }

            return matchingUsers;

        } catch (error) {
            logger.error('Search users service error:', error);
            if (error.code) {
                throw error;
            }
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
