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
    async createConversation(userId, partnerId) {
        try {
            // Check if conversation already exists
            const participants = [userId, partnerId].sort();
            const convSnapshot = await db.collection(collections.conversations)
                .where('participants', '==', participants)
                .limit(1)
                .get();

            if (!convSnapshot.empty) {
                return convSnapshot.docs[0].id;
            }

            // Create new conversation
            const convRef = await db.collection(collections.conversations).add({
                participants,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return convRef.id;
        } catch (error) {
            logger.error('Error in createConversation service:', error);
            throw createError('9999', 'Exception error');
        }
    }
    async getConversationRoomName(userId, partnerId, conversationId) {
        try {
            if (conversationId) {
                const convDoc = await db.collection('conversations')
                    .doc(conversationId)
                    .get();

                if (!convDoc.exists) {
                    throw new Error('Conversation not found');
                }

                const convData = convDoc.data();
                if (!convData.participants.includes(userId)) {
                    throw new Error('Not authorized for this conversation');
                }

                return `conversation_${conversationId}`;
            }

            if (!partnerId) {
                throw new Error('Either conversationId or partnerId is required');
            }

            const participants = [userId, partnerId].sort();
            const convSnapshot = await db.collection('conversations')
                .where('participants', '==', participants)
                .limit(1)
                .get();

            if (convSnapshot.empty) {
                throw new Error('Conversation not found');
            }

            return `conversation_${convSnapshot.docs[0].id}`;
        } catch (error) {
            logger.error('Error getting room name:', error);
            throw error;
        }
    }

    async sendMessage(userId, partnerId, conversationId, text) {
        try {
            let convRef;
            let convId = conversationId;

            // Validate inputs
            if (!text || typeof text !== 'string') {
                throw createError('1002', 'Invalid message format');
            }

            logger.debug('Starting sendMessage:', {
                userId,
                partnerId,
                conversationId,
                messageLength: text.length
            });

            // Get or create conversation
            if (!convId) {
                logger.debug('No conversationId provided, creating/finding conversation');
                const participants = [userId, partnerId].sort();
                const convSnapshot = await db.collection(collections.conversations)
                    .where('participants', '==', participants)
                    .limit(1)
                    .get();

                if (convSnapshot.empty) {
                    logger.debug('Creating new conversation');
                    const newConvRef = await db.collection(collections.conversations).add({
                        participants,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    convId = newConvRef.id;
                } else {
                    convId = convSnapshot.docs[0].id;
                    logger.debug('Found existing conversation:', { convId });
                }
            }

            convRef = db.collection(collections.conversations).doc(convId);

            // Create message
            const msgRef = convRef.collection('messages').doc();
            const now = new Date();
            const msgData = {
                text: text.trim(),
                senderId: userId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                unreadBy: [partnerId],
                status: 'sent',
                conversationId: convId
            };

            logger.debug('Creating message:', {
                messageId: msgRef.id,
                senderId: userId,
                conversationId: convId,
                timestamp: now.toISOString()
            });

            // Get sender info from database
            const senderDoc = await db.collection(collections.users).doc(userId).get();
            const senderInfo = senderDoc.data() || {};

            // Run transaction
            await db.runTransaction(async (transaction) => {
                try {
                    // Verify conversation exists
                    const convDoc = await transaction.get(convRef);
                    if (!convDoc.exists) {
                        throw createError('9994', 'Conversation not found');
                    }

                    // Check if user is participant
                    const convData = convDoc.data();
                    if (!convData.participants.includes(userId)) {
                        throw createError('1009', 'Not authorized to send message in this conversation');
                    }

                    // Save message
                    transaction.set(msgRef, {
                        ...msgData,
                        conversationId: convId // Add reference to conversation
                    });

                    // Update conversation with last message
                    transaction.update(convRef, {
                        lastMessage: {
                            message: text.trim(),
                            created: admin.firestore.FieldValue.serverTimestamp(),
                            senderId: userId,
                            messageId: msgRef.id, // Add message reference
                            unreadBy: [partnerId]
                        },
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    return true;
                } catch (error) {
                    logger.error('Transaction failed:', error);
                    throw error;
                }
            });

            // Verify message was saved
            const savedMsg = await msgRef.get();
            if (!savedMsg.exists) {
                throw createError('9999', 'Failed to save message');
            }

            logger.debug('Message saved successfully:', {
                messageId: msgRef.id,
                conversationId: convId
            });

            // Create response message object
            const createdMessage = {
                message: text.trim(),
                messageId: msgRef.id,
                unread: '1',
                created: now.toISOString(),
                sender: {
                    id: userId,
                    userName: senderInfo.userName || '',
                    avatar: senderInfo.avatar || ''
                },
                status: 'sent'
            };

            // Emit to socket room
            try {
                const io = getIO();
                const roomName = await this.getConversationRoomName(userId, partnerId, convId);
                io.to(roomName).emit('onmessage', {
                    message: createdMessage,
                    timestamp: now.toISOString()
                });
                logger.debug('Message emitted to room:', { roomName, messageId: msgRef.id });
            } catch (socketError) {
                logger.error('Socket emission failed:', socketError);
                // Continue execution even if socket emission fails
            }

            return createdMessage;
        } catch (error) {
            logger.error('Error in sendMessage:', error);
            if (error.code) {
                throw error;
            }
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
            logger.debug('getListConversation service called:', { userId, index, count });
            let query = db.collection(collections.conversations)
                .where('participants', 'array-contains', userId)
                .orderBy('updatedAt', 'desc')
                .offset(index)
                .limit(count);

            const snapshot = await query.get();
            const conversationDocs = snapshot.docs;

            // Log để debug
            logger.debug('Found conversations:', {
                count: conversationDocs.length,
                conversations: conversationDocs.map(doc => ({ id: doc.id, data: doc.data() }))
            });

            if (conversationDocs.length === 0) {
                return { conversations: [], numNewMessage: 0 };
            }

            const partnerIds = conversationDocs.map(doc => {
                const data = doc.data();
                return data.participants.find(p => p !== userId);
            }).filter(Boolean);

            // Log partner IDs
            logger.debug('Partner IDs:', partnerIds);

            const userMap = new Map();
            if (partnerIds.length > 0) {
                const usersSnap = await db.collection(collections.users)
                    .where(admin.firestore.FieldPath.documentId(), 'in', partnerIds)
                    .get();

                usersSnap.docs.forEach(doc => {
                    const userData = doc.data();
                    userMap.set(doc.id, {
                        userId: doc.id,
                        userName: userData.userName || 'Unknown User',
                        avatar: userData.avatar || ''
                    });
                });
            }

            logger.debug('User data mapping:', Object.fromEntries(userMap));

            const conversations = conversationDocs.map(doc => {
                const data = doc.data();
                const partnerId = data.participants.find(p => p !== userId);
                const partnerData = userMap.get(partnerId);

                logger.debug('Processing conversation:', {
                    conversationId: doc.id,
                    partnerId,
                    partnerData
                });

                return {
                    conversationId: doc.id,
                    Partner: {
                        userId: partnerId,
                        userName: partnerData?.userName || 'Unknown User',
                        avatar: partnerData?.avatar || ''
                    },
                    LastMessage: data.lastMessage || {
                        message: '',
                        created: '',
                        unread: '0'
                    },
                    unreadCount: 0
                };
            });

            logger.debug('Final conversations data:', {
                conversations,
                count: conversations.length
            });

            return {
                data: conversations,
                numNewMessage: 0
            };

        } catch (error) {
            logger.error('Error in getListConversation service:', error);
            throw error;
        }
    }

    async getConversationMessage(userId, options) {
        try {
            const { conversationId, partnerId, index = 0, count = 20, lastMessageId } = options;
            let convRef;

            // Get conversation reference
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
            } else if (partnerId) {
                const participants = [userId, partnerId].sort();
                const convSnapshot = await db.collection(collections.conversations)
                    .where('participants', '==', participants)
                    .offset(index)
                    .limit(1)
                    .get();

                if (convSnapshot.empty) {
                    return [];
                }
                convRef = convSnapshot.docs[0].ref;
            } else {
                throw createError('1002', 'Either conversationId or partnerId must be provided');
            }

            // Get conversation data
            const convData = await convRef.get();
            const conversationPartnerId = convData.data().participants.find(p => p !== userId);

            // Check if user is blocked
            const isUserBlocked = await userService.isUserBlocked(userId, conversationPartnerId);
            const isBlocked = isUserBlocked ? '1' : '0';

            // Build query
            let messagesQuery = convRef.collection('messages')
                .orderBy('createdAt', 'desc');

            if (lastMessageId) {
                const lastMessageDoc = await convRef.collection('messages').doc(lastMessageId).get();
                if (lastMessageDoc.exists) {
                    messagesQuery = messagesQuery.startAfter(lastMessageDoc);
                }
            }

            messagesQuery = messagesQuery.limit(count);

            // Execute query and handle empty results
            const messagesSnapshot = await messagesQuery.get();
            logger.debug('Messages query result:', {
                empty: messagesSnapshot.empty,
                size: messagesSnapshot.size,
                path: messagesQuery._queryOptions?.collectionId || 'unknown'
            });

            if (messagesSnapshot.empty) {
                logger.debug('No messages found for conversation');
                return [];
            }

            // Get sender data
            const senderIds = new Set();
            messagesSnapshot.docs.forEach(doc => {
                const data = doc.data();
                senderIds.add(data.senderId);
            });

            const senderDataMap = await this._fetchPartnerUsers(Array.from(senderIds));

            // Process messages with detailed logging
            const messages = [];
            for (const doc of messagesSnapshot.docs) {
                const data = doc.data();
                const senderId = data.senderId;
                const senderData = senderDataMap.get(senderId) || {};

                logger.debug('Processing message:', {
                    messageId: doc.id,
                    senderId,
                    text: data.text?.substring(0, 20) + '...',
                    timestamp: data.createdAt?.toDate()
                });

                try {
                    // Map the message data to match the expected client format
                    const messageModel = new Message({
                        message: data.text || '',  // Use text field for message content
                        messageId: doc.id,
                        unread: data.unreadBy?.includes(userId) ? '1' : '0',
                        created: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
                        sender: {
                            userId: senderId,  // Changed from id to userId to match client expectations
                            userName: senderData.userName || senderData.username || 'Unknown User',
                            avatar: senderData.avatar || null
                        },
                        isBlocked: isBlocked ? '1' : '0',
                        status: data.status || 'sent',
                        conversationId: data.conversationId || conversationId
                    });

                    const processedMessage = messageModel.toJSON();
                    logger.debug('Processed message:', {
                        messageId: processedMessage.messageId,
                        content: processedMessage.message?.substring(0, 20),
                        sender: processedMessage.sender
                    });
                    messages.push(processedMessage);
                } catch (error) {
                    logger.error('Error processing message:', {
                        messageId: doc.id,
                        error: error.message
                    });
                }
            }

            logger.debug('Processed messages:', {
                count: messages.length,
                firstMessageId: messages[0]?.messageId,
                lastMessageId: messages[messages.length - 1]?.messageId
            });

            return messages;
        } catch (error) {
            logger.error('Error in getConversation service:', error);
            if (error.code) {
                throw error;
            }
            throw createError('9999', 'Exception error');
        }
    }

    async setReadMessage(userId, options = {}) {
        try {
            let convRef;
            const { partnerId, conversationId } = options;

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
