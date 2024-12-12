const { db, collections } = require('../config/database');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const userService = require('./userService');

class ChatService {
    async getListConversation(userId, index, count) {
        try {
            // Query conversations where the user is a participant
            let query = db.collection('conversations')
                .where('participants', 'array-contains', userId)
                .orderBy('updatedAt', 'desc')
                .offset(index)
                .limit(count);

            const snapshot = await query.get();
            const conversationDocs = snapshot.docs;

            if (conversationDocs.length === 0) {
                return { conversations: [], numNewMessage: 0 };
            }

            const partnerIds = [];
            for (const doc of conversationDocs) {
                const data = doc.data();
                const partnerId = data.participants.find(p => p !== userId);
                if (partnerId) partnerIds.push(partnerId);
            }

            // Firestore allows 'in' queries with up to 10 elements
            const uniquePartnerIds = [...new Set(partnerIds)];
            let partnerMapping = new Map();
            if (uniquePartnerIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < uniquePartnerIds.length; i += 10) {
                    chunks.push(uniquePartnerIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const usersSnap = await db.collection(collections.users)
                        .where('__name__', 'in', chunk)
                        .get();

                    for (const userDoc of usersSnap.docs) {
                        partnerMapping.set(userDoc.id, userDoc.data());
                    }
                }
            }

            let numNewMessage = 0;
            const conversations = conversationDocs.map((doc) => {
                const data = doc.data();
                const conversationId = doc.id;
                const partnerId = data.participants.find(p => p !== userId);
                const partnerData = partnerMapping.get(partnerId) || {};

                let lastMessageData = {
                    message: '',
                    created: '',
                    unread: false
                };

                if (data.lastMessage) {
                    const { message, created, unreadBy = [] } = data.lastMessage;
                    lastMessageData.message = message || '';
                    lastMessageData.created = created ? created.toDate().toISOString() : '';
                    lastMessageData.unread = unreadBy.includes(userId);
                    if (lastMessageData.unread) numNewMessage += 1;
                }

                const convo = new Conversation({
                    id: conversationId,
                    partnerId: partnerId,
                    partnerUsername: partnerData.username || '',
                    partnerAvatar: partnerData.avatar || '',
                    lastMessage: {
                        message: lastMessageData.message,
                        created: lastMessageData.created
                    },
                    unread: lastMessageData.unread
                });

                return convo.toJSON();
            });

            return { conversations, numNewMessage };
        } catch (error) {
            logger.error('Error in getListConversation service:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async getConversation(userId, partnerId, conversationId, index, count) {
        try {
            let convRef;
            let partnerIdFinal;
            if (conversationId) {
                // Fetch conversation by ID
                const convDoc = await db.collection('conversations').doc(conversationId).get();
                if (!convDoc.exists) {
                    throw createError('9994', 'No data or end of list data');
                }
                convRef = convDoc.ref;
                const data = convDoc.data();
                if (!data.participants.includes(userId)) {
                    throw createError('1009', 'Not authorized');
                }
                partnerIdFinal = data.participants.find(p => p !== userId);
            } else if (partnerId) {
                // Fetch conversation between userId and partnerId
                partnerIdFinal = partnerId;
                const participants = [userId, partnerId].sort(); // Ensure consistent order
                const convSnapshot = await db.collection('conversations')
                    .where('participants', '==', participants)
                    .limit(1)
                    .get();
                if (convSnapshot.empty) {
                    // No conversation found, return empty data
                    return [];
                }
                convRef = convSnapshot.docs[0].ref;
            } else {
                throw createError('1002', 'Either "partner_id" or "conversation_id" must be provided');
            }

            // Check if partner is blocked
            let isBlocked = '0';
            const isUserBlocked = await userService.isUserBlocked(userId, partnerIdFinal);
            isBlocked = isUserBlocked ? '1' : '0';

            // Fetch messages from convRef
            let messagesQuery = convRef.collection('messages')
                .orderBy('createdAt', 'asc');

            // For pagination, we need to use startAfter or offset
            if (index) {
                messagesQuery = messagesQuery.offset(index);
            }
            if (count) {
                messagesQuery = messagesQuery.limit(count);
            }

            const messagesSnapshot = await messagesQuery.get();

            if (messagesSnapshot.empty) {
                return [];
            }

            const messages = [];
            const senderIds = new Set();
            messagesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                senderIds.add(data.senderId);
            });

            // Fetch sender info
            const senderIdList = Array.from(senderIds);
            const senderDataMap = new Map();
            if (senderIdList.length > 0) {
                const chunks = [];
                for (let i = 0; i < senderIdList.length; i += 10) {
                    chunks.push(senderIdList.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const usersSnap = await db.collection(collections.users)
                        .where('__name__', 'in', chunk)
                        .get();

                    for (const userDoc of usersSnap.docs) {
                        senderDataMap.set(userDoc.id, userDoc.data());
                    }
                }
            }

            const readMessages = [];
            const unreadMessages = [];

            for (const doc of messagesSnapshot.docs) {
                const data = doc.data();
                const senderId = data.senderId;
                const senderData = senderDataMap.get(senderId) || {};

                const message = new Message({
                    message: data.text || '',
                    message_id: doc.id,
                    unread: data.unreadBy && data.unreadBy.includes(userId) ? '1' : '0',
                    created: data.createdAt ? data.createdAt.toDate().toISOString() : '',
                    sender: {
                        id: senderId,
                        username: senderData.username || '',
                        avatar: senderData.avatar || '',
                    },
                    is_blocked: isBlocked,
                });

                if (message.unread === '1') {
                    unreadMessages.push(message.toJSON());
                } else {
                    readMessages.push(message.toJSON());
                }
            }

            // Concatenate read messages first, then unread messages
            const allMessages = readMessages.concat(unreadMessages);

            return allMessages;

        } catch (error) {
            logger.error('Error in getConversation service:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }
}

module.exports = new ChatService();