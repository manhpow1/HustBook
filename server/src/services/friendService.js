import { collections, queryDocuments, getDocument } from '../config/database.js';
import { db } from '../config/firebase.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';

class FriendService {
    async getRequestedFriends(userId, index, count) {
        try {
            const friendRequestsRef = db.collection(collections.friendRequests)
                .where('recipientId', '==', userId)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .offset(index)
                .limit(count);

            const snapshot = await friendRequestsRef.get();

            if (snapshot.empty) {
                return { requests: [], total: '0' };
            }

            const senderIds = snapshot.docs.map(doc => doc.data().senderId);

            const userDocs = await Promise.all(
                senderIds.map(id => db.collection(collections.users).doc(id).get())
            );

            // Tạo map cho thông tin người dùng
            const userMap = new Map();
            userDocs.forEach(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    userMap.set(doc.id, {
                        userName: userData.userName || '',
                        avatar: userData.avatar || ''
                    });
                }
            });

            // Format kết quả
            const formattedRequests = snapshot.docs.map(doc => {
                const requestData = doc.data();
                const userData = userMap.get(requestData.senderId) || {};

                return {
                    userId: requestData.senderId,
                    userName: userData.userName || '',
                    avatar: userData.avatar || '',
                    created: requestData.createdAt.toDate().toISOString()
                };
            });

            const totalSnapshot = await db.collection(collections.friendRequests)
                .where('recipientId', '==', userId)
                .where('status', '==', 'pending')
                .count()
                .get();

            return {
                requests: formattedRequests,
                total: totalSnapshot.data().count.toString()
            };

        } catch (error) {
            logger.error('Error in getRequestedFriends service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getFriendsCount(userId) {
        try {
            const friendsRef = db.collection(collections.friends)
                .doc(userId)
                .collection('userFriends');

            const snapshot = await friendsRef.count().get();
            return snapshot.data().count;
        } catch (error) {
            logger.error('Error in getFriendsCount service:', error);
            return 0;
        }
    }

    async getUserFriends(userId, count = 20, index = 0) {
        if (!userId || typeof userId !== 'string') {
            logger.error('Invalid userId provided:', userId);
            throw createError('1004', 'Invalid userId');
        }
        try {
            logger.info('getUserFriends service - Starting with params:', { userId, count, index });
            const friendsRef = db.collection(collections.friends)
                .doc(userId)
                .collection('userFriends')
                .orderBy('created', 'desc')
                .offset(index)
                .limit(count);

            const snapshot = await friendsRef.get();
            
            logger.info('getUserFriends service - Friends snapshot:', {
                empty: snapshot.empty,
                size: snapshot.size
            });

            // Return empty array if no friends
            if (snapshot.empty) {
                return {
                    friends: [],
                    total: '0'
                };
            }

            // Get user documents for each friend
            const userDocs = await Promise.all(
                snapshot.docs.map(doc =>
                    db.collection(collections.users).doc(doc.id).get()
                )
            );

            // Create map of user data
            const userMap = new Map();
            userDocs.forEach(doc => {
                if (doc.exists) {
                    userMap.set(doc.id, {
                        userName: doc.data().userName || ''
                    });
                }
            });

            // Format friends with user data
            const friends = snapshot.docs.map(doc => {
                const friendData = doc.data();
                const userData = userMap.get(doc.id) || {};

                return {
                    userId: doc.id,
                    userName: userData.userName || '',
                    ...friendData
                };
            });

            const totalCountSnapshot = await db.collection(collections.friends)
                .doc(userId)
                .collection('userFriends')
                .get();

            logger.info('getUserFriends service - Final result:', {
                friendsCount: friends.length,
                totalCount: totalCountSnapshot.size,
                friends: friends
            });

            return {
                friends,
                total: totalCountSnapshot.size.toString(),
            };
        } catch (error) {
            logger.error('Error in getUserFriends service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async setAcceptFriend(userId, requesterId, isAccept) {
        try {
            await db.runTransaction(async (transaction) => {
                const friendRequestRef = db.collection(collections.friendRequests)
                    .where('senderId', '==', requesterId)
                    .where('recipientId', '==', userId)
                    .where('status', '==', 'pending')
                    .limit(1);

                const snapshot = await transaction.get(friendRequestRef);

                if (snapshot.empty) {
                    throw createError('1004', 'Friend request not found');
                }

                const requestDoc = snapshot.docs[0];

                if (isAccept === '1') {
                    transaction.update(requestDoc.ref, { status: 'accepted', updatedAt: new Date() });

                    const user1FriendRef = db.collection(collections.friends)
                        .doc(userId)
                        .collection('userFriends')
                        .doc(requesterId);

                    const user2FriendRef = db.collection(collections.friends)
                        .doc(requesterId)
                        .collection('userFriends')
                        .doc(userId);

                    transaction.set(user1FriendRef, {
                        created: new Date(),
                        status: 'active',
                    });

                    transaction.set(user2FriendRef, {
                        created: new Date(),
                        status: 'active',
                    });
                } else {
                    transaction.update(requestDoc.ref, { status: 'rejected', updatedAt: new Date() });
                }
            });
            return true;
        } catch (error) {
            logger.error('Error in setAcceptFriend service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getListSuggestedFriends(userId, index = 0, count = 20) {
        try {
            const userFriendsRef = await db.collection(collections.friends)
                .doc(userId)
                .collection('userFriends')
                .get();

            const userFriendIds = new Set(userFriendsRef.docs.map(doc => doc.id));
            userFriendIds.add(userId);

            const usersRef = await db.collection(collections.users)
                .offset(index)
                .limit(count)
                .get();

            const suggestedFriends = [];
            const mutualFriendsPromises = [];

            for (const userDoc of usersRef.docs) {
                if (!userFriendIds.has(userDoc.id)) {
                    const mutualFriendsPromise = async () => {
                        const theirFriendsRef = await db.collection(collections.friends)
                            .doc(userDoc.id)
                            .collection('userFriends')
                            .get();

                        const theirFriendIds = new Set(theirFriendsRef.docs.map(doc => doc.id));
                        const mutualFriends = [...userFriendIds].filter(id => theirFriendIds.has(id)).length;

                        return {
                            userId: userDoc.id,
                            userData: userDoc.data(),
                            mutualFriends,
                        };
                    };
                    mutualFriendsPromises.push(mutualFriendsPromise());
                }
            }

            const mutualFriendsResults = await Promise.all(mutualFriendsPromises);
            mutualFriendsResults.sort((a, b) => b.mutualFriends - a.mutualFriends);

            for (const result of mutualFriendsResults) {
                suggestedFriends.push({
                    userId: result.userId,
                    userName: result.userData.userName,
                    avatar: result.userData.avatar,
                    same_friends: result.mutualFriends.toString(),
                });
            }

            return {
                list_users: suggestedFriends,
            };
        } catch (error) {
            logger.error('Error in getListSuggestedFriends service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async setRequestFriend(senderId, recipientId) {
        try {
            await db.runTransaction(async (transaction) => {
                const senderRef = db.collection(collections.users).doc(senderId);
                const recipientRef = db.collection(collections.users).doc(recipientId);

                const [senderDoc, recipientDoc] = await Promise.all([
                    transaction.get(senderRef),
                    transaction.get(recipientRef),
                ]);

                if (!senderDoc.exists || !recipientDoc.exists) {
                    throw createError('9995', 'User not found');
                }

                const friendRequestRef = db.collection(collections.friendRequests)
                    .where('senderId', '==', senderId)
                    .where('recipientId', '==', recipientId)
                    .where('status', 'in', ['pending', 'accepted'])
                    .limit(1);

                const existingRequestSnapshot = await transaction.get(friendRequestRef);

                if (!existingRequestSnapshot.empty) {
                    throw createError('1010', 'Friend request already exists');
                }

                const areFriendsRef = db.collection(collections.friends)
                    .doc(senderId)
                    .collection('userFriends')
                    .doc(recipientId);

                const areFriendsDoc = await transaction.get(areFriendsRef);

                if (areFriendsDoc.exists) {
                    throw createError('1010', 'Users are already friends');
                }

                const newRequestRef = db.collection(collections.friendRequests).doc();
                transaction.set(newRequestRef, {
                    senderId,
                    recipientId,
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            });

            // Get count of pending requests
            const pendingRequestsSnapshot = await db.collection(collections.friendRequests)
                .where('recipientId', '==', recipientId)
                .where('status', '==', 'pending')
                .count()
                .get();

            return {
                requested_friends: pendingRequestsSnapshot.data().count.toString(),
            };
        } catch (error) {
            logger.error('Error in setRequestFriend service:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }

    async getListBlocks(userId, index, count) {
        try {
            const userDoc = await getDocument(collections.users, userId);
            if (!userDoc || !userDoc.blockedUsers) {
                return { blocks: [], total: 0 };
            }

            const blockedUserIds = userDoc.blockedUsers || [];
            const paginatedIds = blockedUserIds.slice(index, index + count);

            if (paginatedIds.length === 0) {
                return { blocks: [], total: blockedUserIds.length };
            }

            const blockedUsers = await Promise.all(
                paginatedIds.map(id => getDocument(collections.users, id))
            );

            const blocks = blockedUsers
                .filter(user => user !== null)
                .map(user => ({
                    userId: user.userId,
                    name: user.userName || '',
                    avatar: user.avatar || '',
                }));

            return {
                blocks,
                total: blockedUserIds.length,
            };
        } catch (error) {
            logger.error('Error in getListBlocks service:', error);
            throw createError('9999', 'Exception error');
        }
    }
}

export default new FriendService();
