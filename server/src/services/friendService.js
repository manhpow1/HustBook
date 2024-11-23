const { collections, queryDocuments, getDocument, } = require('../config/database');
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

        const mutualFriendsPromises = senderIds.map(async (senderId) => {
            const [senderFriends, userFriends] = await Promise.all([
                queryDocuments(collections.friendRequests, (ref) =>
                    ref.where('senderId', '==', senderId)
                        .where('status', '==', 'accepted')
                ),
                queryDocuments(collections.friendRequests, (ref) =>
                    ref.where('senderId', '==', userId)
                        .where('status', '==', 'accepted')
                )
            ]);

            const senderFriendIds = new Set(senderFriends.map(fr => fr.recipientId));
            const userFriendIds = new Set(userFriends.map(fr => fr.recipientId));

            const mutualFriends = [...senderFriendIds].filter(id => userFriendIds.has(id));

            return {
                senderId,
                mutualCount: mutualFriends.length
            };
        });

        const mutualFriendsResults = await Promise.all(mutualFriendsPromises);
        const mutualFriendsMap = new Map(mutualFriendsResults.map(result => [result.senderId, result.mutualCount]));

        const formattedRequests = friendRequests.map(request => ({
            id: request.senderId,
            username: userMap.get(request.senderId)?.username || '',
            avatar: userMap.get(request.senderId)?.avatar || '',
            same_friends: mutualFriendsMap.get(request.senderId)?.toString() || '0',
            created: request.createdAt.toISOString(),
        }));

        const totalRequests = await queryDocuments(collections.friendRequests, (ref) =>
            ref.where('recipientId', '==', userId)
                .where('status', '==', 'pending')
        );

        return {
            requests: formattedRequests,
            total: totalRequests.length.toString()
        };
    } catch (error) {
        logger.error('Error in getRequestedFriends service:', error);
        throw error;
    }
};

const getUserFriends = async (userId, index, count) => {
    try {
        const friendsRef = db.collection(collections.friends).doc(userId).collection('userFriends');
        const snapshot = await friendsRef.orderBy('created', 'desc').offset(index).limit(count).get();

        const friends = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                username: data.username,
                avatar: data.avatar,
                same_friends: data.sameFriends,
                created: data.created.toDate().toISOString()
            };
        });

        const totalSnapshot = await friendsRef.get();
        const total = totalSnapshot.size;

        return { friends, total };
    } catch (error) {
        logger.error('Error in getUserFriends service:', error);
        throw error;
    }
};

const setAcceptFriend = async (userId, requesterId, isAccept) => {
    try {
        const friendRequestRef = db.collection(collections.friendRequests)
            .where('senderId', '==', requesterId)
            .where('recipientId', '==', userId)
            .where('status', '==', 'pending')
            .limit(1);

        const snapshot = await friendRequestRef.get();

        if (snapshot.empty) {
            throw new Error('Friend request not found');
        }

        const requestDoc = snapshot.docs[0];
        const batch = db.batch();

        if (isAccept === '1') {
            // Accept friend request
            batch.update(requestDoc.ref, { status: 'accepted', updatedAt: new Date() });

            // Create mutual friend connections
            const user1FriendRef = db.collection(collections.friends)
                .doc(userId)
                .collection('userFriends')
                .doc(requesterId);

            const user2FriendRef = db.collection(collections.friends)
                .doc(requesterId)
                .collection('userFriends')
                .doc(userId);

            batch.set(user1FriendRef, {
                created: new Date(),
                status: 'active'
            });

            batch.set(user2FriendRef, {
                created: new Date(),
                status: 'active'
            });
        } else {
            // Reject friend request
            batch.update(requestDoc.ref, { status: 'rejected', updatedAt: new Date() });
        }

        await batch.commit();
        return true;
    } catch (error) {
        logger.error('Error in setAcceptFriend service:', error);
        throw error;
    }
};

const getListSuggestedFriends = async (userId, index = 0, count = 20) => {
    try {
        // Get current user's friends
        const userFriendsRef = await db.collection(collections.friends)
            .doc(userId)
            .collection('userFriends')
            .get();

        const userFriendIds = new Set(userFriendsRef.docs.map(doc => doc.id));
        userFriendIds.add(userId); // Add current user to excluded list

        // Get all users except current user and their friends
        const usersRef = await db.collection(collections.users)
            .offset(index)
            .limit(count)
            .get();

        const suggestedFriends = [];
        const mutualFriendsPromises = [];

        for (const userDoc of usersRef.docs) {
            if (!userFriendIds.has(userDoc.id)) {
                // For each potential friend, get their friends
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
                        mutualFriends
                    };
                };

                mutualFriendsPromises.push(mutualFriendsPromise());
            }
        }

        const mutualFriendsResults = await Promise.all(mutualFriendsPromises);

        // Sort by number of mutual friends
        mutualFriendsResults.sort((a, b) => b.mutualFriends - a.mutualFriends);

        // Format the response
        for (const result of mutualFriendsResults) {
            suggestedFriends.push({
                user_id: result.id,
                username: result.userData.username,
                avatar: result.userData.avatar,
                same_friends: result.mutualFriends.toString()
            });
        }

        return {
            list_users: suggestedFriends
        };
    } catch (error) {
        logger.error('Error in getListSuggestedFriends service:', error);
        throw error;
    }
};

const setRequestFriend = async (senderId, recipientId) => {
    try {
        // Check if users exist
        const [sender, recipient] = await Promise.all([
            getDocument(collections.users, senderId),
            getDocument(collections.users, recipientId)
        ]);

        if (!sender || !recipient) {
            throw new Error('User not found');
        }

        // Check if there's an existing friend request
        const existingRequest = await queryDocuments(collections.friendRequests, (ref) =>
            ref.where('senderId', '==', senderId)
                .where('recipientId', '==', recipientId)
                .where('status', 'in', ['pending', 'accepted'])
                .limit(1)
        );

        if (existingRequest.length > 0) {
            throw new Error('Friend request already exists');
        }

        // Check if they are already friends
        const areFriends = await queryDocuments(collections.friends, (ref) =>
            ref.doc(senderId).collection('userFriends').doc(recipientId).get()
        );

        if (areFriends.exists) {
            throw new Error('Users are already friends');
        }

        // Create friend request
        const friendRequestData = {
            senderId,
            recipientId,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await createDocument(collections.friendRequests, friendRequestData);

        // Get count of pending requests
        const pendingRequests = await queryDocuments(collections.friendRequests, (ref) =>
            ref.where('recipientId', '==', recipientId)
                .where('status', '==', 'pending')
        );

        return {
            requested_friends: pendingRequests.length.toString()
        };
    } catch (error) {
        logger.error('Error in setRequestFriend service:', error);
        throw error;
    }
};

module.exports = {
    getRequestedFriends,
    getUserFriends,
    setAcceptFriend,
    getListSuggestedFriends,
    setRequestFriend,
};