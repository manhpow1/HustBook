const { collections, queryDocuments } = require('../config/database');
const logger = require('../utils/logger');

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

module.exports = {
    getRequestedFriends
};