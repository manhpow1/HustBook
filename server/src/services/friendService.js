const { collections, queryDocuments, getDocument, createDocument, deleteDocument } = require('../config/database');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');
const db = require('../config/firebase');

const getRequestedFriends = async (userId, index, count) => {
    try {
        const friendRequests = await queryDocuments(collections.friendRequests, (ref) =>
            ref.where('recipientId', '==', userId)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .offset(index)
                .limit(count)
        );

        if (!friendRequests.length) {
            return { requests: [], total: '0' };
        }

        const senderIds = friendRequests.map(request => request.senderId);
        const senderUsers = await queryDocuments(collections.users, (ref) =>
            ref.where('__name__', 'in', senderIds)
        );

        const userMap = new Map(senderUsers.map(user => [user.id, user]));

        const formattedRequests = friendRequests.map(request => ({
            id: request.senderId,
            username: userMap.get(request.senderId)?.username || '',
            avatar: userMap.get(request.senderId)?.avatar || '',
            created: request.createdAt.toISOString(),
        }));

        const totalRequests = await queryDocuments(collections.friendRequests, (ref) =>
            ref.where('recipientId', '==', userId)
                .where('status', '==', 'pending')
        );

        return {
            requests: formattedRequests,
            total: totalRequests.length.toString(),
        };
    } catch (error) {
        logger.error('Error in getRequestedFriends service:', error);
        throw createError('9999', 'Exception error');
    }
};

const getUserFriends = async (userId, limit = 20, startAfterDoc = null) => {
    try {
        let friendsRef = db.collection(collections.friends).doc(userId).collection('userFriends')
            .orderBy('created', 'desc')
            .limit(limit);

        if (startAfterDoc) {
            friendsRef = friendsRef.startAfter(startAfterDoc);
        }

        const snapshot = await friendsRef.get();

        const friends = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return {
            friends,
            lastVisible,
        };
    } catch (error) {
        logger.error('Error in getUserFriends service:', error);
        throw createError('9999', 'Exception error');
    }
};

const setAcceptFriend = async (userId, requesterId, isAccept) => {
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
};

const getListSuggestedFriends = async (userId, index = 0, count = 20) => {
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
                        id: userDoc.id,
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
                user_id: result.id,
                username: result.userData.username,
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
};

const setRequestFriend = async (senderId, recipientId) => {
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

        // After transaction, count pending requests
        const pendingRequests = await queryDocuments(collections.friendRequests, (ref) =>
            ref.where('recipientId', '==', recipientId)
                .where('status', '==', 'pending')
        );

        return {
            requested_friends: pendingRequests.length.toString(),
        };
    } catch (error) {
        logger.error('Error in setRequestFriend service:', error);
        if (error.code) {
            throw error;
        }
        throw createError('9999', 'Exception error');
    }
};

const getListBlocks = async (userId, index, count) => {
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
                id: user.id,
                name: user.username || '',
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
};

module.exports = {
    getRequestedFriends,
    getUserFriends,
    setAcceptFriend,
    getListSuggestedFriends,
    setRequestFriend,
    getListBlocks,
};