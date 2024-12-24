import { collections, arrayRemove } from '../config/database.js';
import { db } from '../config/firebase.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import userService from './userService.js';
import admin from 'firebase-admin';
import { getIO } from '../socket.js';

class ChatService {
    async getConversationRoomName(userId, partnerId, conversationId) {
        if (conversationId) {
            return `conversation_${conversationId}`;
        }
        const participants = [userId, partnerId].sort();
        const convSnapshot = await db.collection(collections.conversations)
            .where('participants', '==', participants)
            .limit(1)
            .get();
        if (convSnapshot.empty) {
            throw createError('9994', 'No data or end of list data');
        }
        const convId = convSnapshot.docs[0].id;
        return `conversation_${convId}`;
    }

    async sendMessage(userId, partnerId, conversationId, text) {
        try {
            let convRef;
            let convId = conversationId;
            if (!convId) {
                const participants = [userId, partnerId].sort();
                const convSnapshot = await db.collection(collections.conversations)
                    .where('participants', '==', participants)
                    .limit(1)
                    .get();
                if (convSnapshot.empty) {
                    const newConvRef = await db.collection(collections.conversations).add({
                        participants,
                        updatedAt: new Date()
                    });
                    convId = newConvRef.id;
                } else {
                    convId = convSnapshot.docs[0].id;
                }
            }

            convRef = db.collection(collections.conversations).doc(convId);

            const msgRef = convRef.collection('messages').doc();
            const msgData = {
                text,
                senderId: userId,
                createdAt: new Date(),
                unreadBy: [partnerId]
            };

            await db.runTransaction(async (transaction) => {
                transaction.set(msgRef, msgData);
                transaction.update(convRef, {
                    lastMessage: {
                        message: text,
                        created: admin.firestore.FieldValue.serverTimestamp(),
                        senderId: userId,
                        unreadBy: [partnerId]
                    },
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });

            const createdMessage = {
                message: text,
                messageId: msgRef.id,
                unread: '1',
                created: new Date().toISOString(),
                sender: { id: userId, userName: '', avatar: '' }
            };

            const io = getIO();
            const roomName = await this.getConversationRoomName(userId, partnerId, convId);
            io.to(roomName).emit('onmessage', { message: createdMessage });

            return createdMessage;
        } catch (error) {
            logger.error('Error in sendMessage:', error);
            throw createError('9999', 'Exception error');
        }
    }

    async _fetchPartnerUsers(userIds) {
        const mapping = new Map();
        if (!userIds.length) return mapping;

        const chunks = [];
        for (let i = 0; i < userIds.length; i += 10) {
            chunks.push(userIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            const usersSnap = await db.collection(collections.users)
                .where('__name__', 'in', chunk)
                .get();
            for (const userDoc of usersSnap.docs) {
                mapping.set(userDoc.id, userDoc.data());
            }
        }

        return mapping;
    }

    async getListConversation(userId, index, count) {
        try {
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

                let lastMessageData = { message: '', created: '', unread: false };
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
                    partneruserName: partnerData.userName || '',
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
                const participants = [userId, partnerId].sort();
                const convSnapshot = await db.collection(collections.conversations)
                    .where('participants', '==', participants)
                    .limit(1)
                    .get();
                if (convSnapshot.empty) {
                    return [];
                }
                convRef = convSnapshot.docs[0].ref;
                partnerIdFinal = partnerId;
            } else {
                throw createError('1002', 'Either "partnerId" or "conversationId" must be provided');
            }

            const isUserBlocked = await userService.isUserBlocked(userId, partnerIdFinal);
            const isBlocked = isUserBlocked ? '1' : '0';

            let messagesQuery = convRef.collection('messages')
                .orderBy('createdAt', 'asc');

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

            const senderIds = new Set();
            messagesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                senderIds.add(data.senderId);
            });

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

                const messageModel = new Message({
                    message: data.text || '',
                    messageId: doc.id,
                    unread: data.unreadBy && data.unreadBy.includes(userId) ? '1' : '0',
                    created: data.createdAt ? data.createdAt.toDate().toISOString() : '',
                    sender: {
                        id: senderId,
                        userName: senderData.userName || '',
                        avatar: senderData.avatar || ''
                    },
                    isBlocked
                });

                if (messageModel.unread === '1') {
                    unreadMessages.push(messageModel.toJSON());
                } else {
                    readMessages.push(messageModel.toJSON());
                }
            }

            return readMessages.concat(unreadMessages);
        } catch (error) {
            logger.error('Error in getConversation service:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }

    async setReadMessage(userId, partnerId, conversationId) {
        try {
            let convRef;
            if (conversationId) {
                const convDoc = await db.collection(collections.conversations).doc(conversationId).get();
                if (!convDoc.exists) {
                    return 0;
                }
                const data = convDoc.data();
                if (!data.participants.includes(userId)) {
                    throw createError('1009', 'Not authorized');
                }
                convRef = convDoc.ref;
            } else if (partnerId) {
                const participants = [userId, partnerId].sort();
                const convSnapshot = await db.collection(collections.conversations)
                    .where('participants', '==', participants)
                    .limit(1)
                    .get();
                if (convSnapshot.empty) {
                    return 0;
                }
                convRef = convSnapshot.docs[0].ref;
            } else {
                throw createError('1002', 'Either "partnerId" or "conversationId" must be provided');
            }

            const messagesSnapshot = await convRef.collection('messages')
                .where('unreadBy', 'array-contains', userId)
                .get();

            if (messagesSnapshot.empty) {
                return 0;
            }

            const batchSize = 500;
            const totalMessages = messagesSnapshot.size;
            let updatedCount = 0;

            for (let i = 0; i < totalMessages; i += batchSize) {
                const batch = db.batch();
                const batchMessages = messagesSnapshot.docs.slice(i, i + batchSize);

                for (const msgDoc of batchMessages) {
                    const msgRef = msgDoc.ref;
                    batch.update(msgRef, {
                        unreadBy: arrayRemove(userId)
                    });
                    updatedCount += 1;
                }

                await batch.commit();
            }

            return updatedCount;
        } catch (error) {
            logger.error('Error in setReadMessage service:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }

    async deleteMessage(userId, partnerId, conversationId, messageId) {
        try {
            let convRef;
            let convId = conversationId;
            if (!convId) {
                const participants = [userId, partnerId].sort();
                const convSnapshot = await db.collection(collections.conversations)
                    .where('participants', '==', participants)
                    .limit(1)
                    .get();
                if (convSnapshot.empty) {
                    throw createError('9994', 'No data or end of list data');
                }
                convId = convSnapshot.docs[0].id;
            }

            convRef = db.collection(collections.conversations).doc(convId);

            const msgRef = convRef.collection('messages').doc(messageId);
            const msgDoc = await msgRef.get();

            if (!msgDoc.exists) {
                throw createError('9994', 'Message not found');
            }

            const messageData = msgDoc.data();
            if (messageData.senderId !== userId) {
                throw createError('1009', 'Not authorized to delete this message');
            }

            await msgRef.delete();

            const io = getIO();
            const roomName = await this.getConversationRoomName(userId, partnerId, convId);
            io.to(roomName).emit('deletemessage', { messageId: messageId });

            return true;
        } catch (error) {
            logger.error('Error in deleteMessage service:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }

    async deleteConversation(userId, partnerId, conversationId) {
        try {
            let convRef;
            let convId = conversationId;
            if (!convId) {
                const participants = [userId, partnerId].sort();
                const convSnapshot = await db.collection(collections.conversations)
                    .where('participants', '==', participants)
                    .limit(1)
                    .get();
                if (convSnapshot.empty) {
                    throw createError('9994', 'No data or end of list data');
                }
                convId = convSnapshot.docs[0].id;
            }

            convRef = db.collection(collections.conversations).doc(convId);

            const convDoc = await convRef.get();
            if (!convDoc.exists) {
                throw createError('9994', 'No data or end of list data');
            }
            const data = convDoc.data();
            if (!data.participants.includes(userId)) {
                throw createError('1009', 'Not authorized');
            }

            await convRef.update({
                participants: admin.firestore.FieldValue.arrayRemove(userId)
            });

            const updatedConvDoc = await convRef.get();
            const updatedData = updatedConvDoc.data();

            if (!updatedData.participants || updatedData.participants.length === 0) {
                await convRef.delete();
            }

            return true;
        } catch (error) {
            logger.error('Error in deleteConversation service:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }
}

export default new ChatService();
