import { collections, queryDocuments, createDocument } from '../config/database.js';
import { db } from '../config/firebase.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';

class SearchService {
    async searchPosts(userId, searchWords, index, count) {
        try {
            logger.debug('Search service received:', {
                userId,
                searchWords,
                index,
                count
            });
    
            // Đảm bảo searchWords là array
            const keywords = Array.isArray(searchWords) ? searchWords : [searchWords];
            logger.debug('Processing keywords:', keywords);
    
            // Tạo query dựa trên số từ khóa
            let query = db.collection(collections.posts);
    
            if (keywords.length > 1) {
                logger.debug('Using array-contains-any for multiple keywords');
                query = query.where('contentLowerCase', 'array-contains-any', keywords);
            } else if (keywords.length === 1) {
                logger.debug('Using array-contains for single keyword');
                query = query.where('contentLowerCase', 'array-contains', keywords[0]);
            }
    
            // Thêm sắp xếp và phân trang
            query = query
                .orderBy('createdAt', 'desc')
                .offset(parseInt(index))
                .limit(parseInt(count));
    
            logger.debug('Executing Firestore query...');
            const postsSnapshot = await query.get();
            
            const matchingPosts = postsSnapshot.docs.map(doc => {
                const post = doc.data();
                logger.debug('Found matching post:', {
                    postId: post.postId,
                    contentLowerCase: post.contentLowerCase
                });
    
                // Kiểm tra exact match bằng cách so sánh với array gốc
                const isExactMatch = keywords.every(word => 
                    post.contentLowerCase.includes(word)
                );
    
                return {
                    postId: post.postId,
                    image: post.images?.[0] || '',
                    video: post.video || '',
                    likes: post.likes?.toString() || '0',
                    comment: post.comments?.toString() || '0',
                    isLiked: post.isLiked ? '1' : '0',
                    author: {
                        userId: post.userId,
                        userName: encodeURIComponent(post.userName || ''),
                        avatar: post.avatar || ''
                    },
                    content: encodeURIComponent(post.content || ''),
                    created: post.createdAt?.toDate?.() || new Date(),
                    isExactMatch
                };
            });
    
            // Lưu search history
            await createDocument(collections.savedSearches, {
                userId,
                keyword: keywords.join(' '),
                created: new Date(),
            });
    
            logger.debug('Final results:', {
                totalFound: matchingPosts.length,
                hasExactMatch: matchingPosts.some(p => p.isExactMatch)
            });
    
            return matchingPosts;
    
        } catch (error) {
            console.error('Search service error:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async searchUsers(currentUserId, keyword, index, count) {
        try {
            const normalizedKeyword = decodeURIComponent(keyword.trim()).toLowerCase();

            // Get all users and filter client-side for more flexible matching
            const usersQuery = db.collection(collections.users)
                .orderBy('userName')
                .offset(index)
                .limit(count);

            // Get blocked users in parallel
            const [usersSnapshot, blockedUsersSnapshot] = await Promise.all([
                usersQuery.get(),
                db.collection(collections.blocks)
                    .where('userId', '==', currentUserId)
                    .get()
            ]);

            const blockedUserIds = new Set(
                blockedUsersSnapshot.docs.map(doc => doc.data().blockedUserId)
            );

            const matchingUsers = usersSnapshot.docs
                .filter(doc => {
                    const userId = doc.id;
                    const userData = doc.data();
                    // Filter out blocked users and current user
                    if (blockedUserIds.has(userId) || userId === currentUserId) {
                        return false;
                    }
                    // Check if username contains the search term (case-insensitive)
                    const userName = decodeURIComponent(userData.userName || '').toLowerCase();
                    return userName.includes(normalizedKeyword);
                })
                .map(doc => {
                    const userData = doc.data();
                    return {
                        userId: doc.id,
                        userName: userData.userName || '',
                        userNameLowerCase: decodeURIComponent(userData.userName || '').toLowerCase().split(' '),
                        avatar: userData.avatar || '',
                        same_friends: userData.mutualFriendsCount || 0
                    };
                });

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
