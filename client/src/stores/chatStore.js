import { defineStore } from 'pinia';
import apiService from '../services/api';
import { useToast } from '@/components/ui/toast';
import { useUserStore } from './userStore';
import { getSocket, initSocket } from '@/services/socket';
import logger from '@/services/logging';

export const useChatStore = defineStore('chat', {
    state: () => ({
        conversations: [],
        selectedConversationId: null,
        messages: Array(0),
        loadingConversations: false,
        loadingMessages: false,
        unreadCount: 0,
        sendingMessage: false,
        socket: null,
        isSocketInitialized: false,
        currentRoom: null
    }),
    actions: {
        async initSocket() {
            const userStore = useUserStore();
            if (!this.isSocketInitialized && userStore.isLoggedIn) {
                const cleanup = initSocket();
                const socket = getSocket();

                if (!socket) {
                    logger.error('Failed to initialize socket');
                    return;
                }

                // Wait for socket to connect
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Socket connection timeout'));
                    }, 5000);

                    socket.once('connect', () => {
                        clearTimeout(timeout);
                        resolve();
                    });

                    socket.once('connect_error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });

                socket.on('onmessage', (data) => {
                    const { message } = data;
                    if (message.sender.id !== userStore.userData?.userId) {
                        this.addMessage(message);
                        this.unreadCount++;
                    }
                });

                socket.on('deletemessage', (data) => {
                    const { messageId } = data;
                    this.removeMessage(messageId);
                });

                this.isSocketInitialized = true;
                return cleanup;
            }
        },

        async createConversation(partnerId) {
            const { toast } = useToast();
            try {
                const response = await apiService.createConversation(partnerId);
                if (response.data.code === '1000') {
                    return response.data.data.conversationId;
                } else {
                    throw new Error(response.data.message || 'Failed to create conversation');
                }
            } catch (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive"
                });
                throw error;
            }
        },

        async fetchConversations() {
            this.loadingConversations = true;
            const { toast } = useToast();
            try {
                console.debug('Fetching conversations');
                const response = await apiService.getConversations();
                console.debug('Raw server response:', response.data);

                if (response.data.code === '1000' && response.data.data) {
                    this.conversations = Array.isArray(response.data.data.data)
                        ? response.data.data.data.map(conv => ({
                            ...conv,
                            Partner: {
                                ...conv.Partner,
                                userName: conv.Partner.userName || 'Unknown User'
                            }
                        }))
                        : [];

                    this.unreadCount = parseInt(response.data.data.numNewMessage || 0, 10);

                    console.debug('Conversations updated:', {
                        count: this.conversations.length,
                        conversations: this.conversations,
                        firstConversation: this.conversations[0] || null,
                        unreadCount: this.unreadCount
                    });
                } else {
                    throw new Error(response.data.message || 'Failed to load conversations');
                }
            } catch (error) {
                console.error('Failed to fetch conversations:', error);
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive"
                });
            } finally {
                this.loadingConversations = false;
            }
        },

        async fetchMessages(conversationId, options = {}) {
            this.loadingMessages = true;
            const { toast } = useToast();
            try {
                const { index = 0, count = 20 } = options;
                logger.debug('Fetching messages:', { conversationId, index, count });

                const lastMessageId = this.messages.length > 0 ?
                    this.messages[this.messages.length - 1].messageId :
                    null;

                console.debug('Fetching messages:', {
                    conversationId,
                    index,
                    count,
                    lastMessageId
                });

                this.selectedConversationId = conversationId;
                const response = await apiService.getConversationMessages(
                    conversationId,
                    { index, count, lastMessageId }
                );

                console.debug('Messages response:', {
                    code: response.data.code,
                    messageCount: response.data.data?.data?.length || 0
                });

                if (response.data.code === '1000') {
                    logger.debug('Raw messages response:', response.data.data);
                    // Append new messages to existing ones for infinite scroll
                    const newMessages = response.data.data?.data || [];
                    logger.debug('Processing messages:', {
                        count: newMessages.length,
                        firstMessage: newMessages[0],
                        lastMessage: newMessages[newMessages.length - 1]
                    });
                    const processedMessages = newMessages.map(msg => ({
                        messageId: msg.messageId,
                        message: msg.message || msg.text || '', // Handle both message and text fields
                        content: msg.message || msg.text || '', // Add content field for consistency
                        created: msg.created || msg.createdAt || new Date().toISOString(),
                        sender: {
                            id: msg.sender?.userId || msg.senderId,
                            userName: msg.sender?.userName || msg.senderName || 'Unknown User',
                            avatar: msg.sender?.avatar || msg.senderAvatar
                        },
                        status: msg.status || 'sent',
                        unread: msg.unread || '0',
                        conversationId: msg.conversationId
                    }));

                    if (options.append) {
                        this.messages = [...this.messages, ...processedMessages.reverse()];
                    } else {
                        this.messages = processedMessages.reverse();
                    }
                } else {
                    throw new Error(response.data.message || 'Failed to load messages');
                }
            } catch (error) {
                console.error('Failed to fetch messages:', error);
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive"
                });
            } finally {
                this.loadingMessages = false;
            }
        },

        addMessage(message) {
            if (!Array.isArray(this.messages)) {
                this.messages = [];
            }

            // Format message consistently
            const formattedMessage = {
                messageId: message.messageId,
                message: message.message || message.content || '',
                content: message.message || message.content || '',
                created: message.created || message.createdAt || new Date().toISOString(),
                sender: {
                    id: message.sender?.id || message.sender?.userId,
                    userName: message.sender?.userName || 'Unknown User',
                    avatar: message.sender?.avatar
                },
                status: message.status || 'sent',
                unread: message.unread || '0',
                conversationId: message.conversationId
            };

            // Check if message already exists
            const existingIndex = this.messages.findIndex(m => m.messageId === formattedMessage.messageId);
            
            if (existingIndex === -1) {
                // Add new message
                this.messages.push(formattedMessage);
                
                // Update conversation's last message if needed
                const conversation = this.conversations.find(c => c.conversationId === formattedMessage.conversationId);
                if (conversation) {
                    conversation.LastMessage = {
                        message: formattedMessage.message,
                        created: formattedMessage.created,
                        unread: formattedMessage.unread
                    };
                }
            } else {
                // Update existing message
                this.messages[existingIndex] = { ...this.messages[existingIndex], ...formattedMessage };
            }

            // Sort messages by creation date
            this.messages.sort((a, b) => new Date(a.created) - new Date(b.created));
        },

        incrementUnreadCount() {
            this.unreadCount++;
        },

        removeMessage(messageId) {
            this.messages = this.messages.filter(m => m.messageId !== messageId);
        },

        async sendMessage({ conversationId, message }) {
            const { toast } = useToast();
            if (!conversationId || !message) {
                logger.error('Invalid message parameters:', {
                    conversationId,
                    hasMessage: !!message
                });
                return;
            }

            this.sendingMessage = true;
            logger.debug('Preparing to send message:', { conversationId });

            try {
                const userStore = useUserStore();
                const conversation = this.conversations.find(c => c.conversationId === conversationId);
                if (!conversation) {
                    throw new Error('Conversation not found');
                }

                // Create temporary message for optimistic update
                const tempMessage = {
                    messageId: `temp_${Date.now()}`,
                    message: message.trim(),
                    content: message.trim(),
                    created: new Date().toISOString(),
                    sender: {
                        id: userStore.userData?.userId,
                        userName: userStore.userData?.userName || '',
                        avatar: userStore.userData?.avatar || ''
                    },
                    status: 'sending',
                    conversationId,
                    unread: '0'
                };

                // Add message optimistically
                this.addMessage(tempMessage);

                // Ensure socket connection
                let socket = getSocket();
                if (!socket?.connected) {
                    const cleanup = await this.initSocket();
                    socket = getSocket();
                    if (!socket?.connected) {
                        throw new Error('Unable to connect to chat server');
                    }
                }

                // Join correct room if needed
                if (!this.currentRoom || this.currentRoom !== `conversation_${conversationId}`) {
                    socket.emit('join_room', {
                        conversationId,
                        partnerId: conversation.Partner.userId
                    });
                    this.currentRoom = `conversation_${conversationId}`;
                }

                // Send message
                socket.emit('send', {
                    conversationId,
                    message: message.trim(),
                    partnerId: conversation.Partner.userId,
                    timestamp: tempMessage.created
                });

                // Update conversation's last message
                conversation.LastMessage = {
                    message: message.trim(),
                    created: tempMessage.created,
                    unread: '0'
                };

            } catch (error) {
                logger.error('Error sending message:', error);
                // Update message status to error
                const failedMessage = this.messages.find(m => m.status === 'sending');
                if (failedMessage) {
                    failedMessage.status = 'error';
                    failedMessage.error = error.message;
                }
                toast({
                    title: "Error",
                    description: "Failed to send message",
                    variant: "destructive"
                });
            } finally {
                this.sendingMessage = false;
            }
        },

        async markAsRead() {
            if (!this.selectedConversationId) return;
            const { toast } = useToast();
            try {
                const response = await apiService.setReadMessage(this.selectedConversationId);
                if (response.data.code === '1000') {
                    // Mark messages as read locally
                    this.messages = this.messages.map(msg => ({ ...msg, unread: '0' }));
                } else {
                    throw new Error(response.data.message || 'Failed to mark messages as read');
                }
            } catch (error) {
                toast(error.message, 'error');
            }
        },

        async deleteMessage(messageId) {
            if (!this.selectedConversationId) return;
            const { toast } = useToast();
            try {
                const response = await apiService.deleteMessage(this.selectedConversationId, messageId);
                if (response.data.code === '1000') {
                    this.removeMessage(messageId);
                } else {
                    throw new Error(response.data.message || 'Failed to delete message');
                }
            } catch (error) {
                toast(error.message, 'error');
            }
        },

        async deleteConversation() {
            if (!this.selectedConversationId) return;
            const { toast } = useToast();
            try {
                const response = await apiService.deleteConversation(this.selectedConversationId);
                if (response.data.code === '1000') {
                    // Remove conversation from list
                    this.conversations = this.conversations.filter(c => c.id !== this.selectedConversationId);
                    this.selectedConversationId = null;
                    this.messages = [];
                } else {
                    throw new Error(response.data.message || 'Failed to delete conversation');
                }
            } catch (error) {
                toast(error.message, 'error');
            }
        },

        async confirmMessageSent(messageId) {
            // Find and update message status to sent
            const messageIndex = this.messages.findIndex(msg => msg.messageId === messageId);
            if (messageIndex !== -1) {
                this.messages[messageIndex].status = 'sent';
                this.messages[messageIndex].error = null;
            }
        },

        async handleMessageError(error) {
            // Update message status to error
            // Called when message was temporarily added to UI (optimistic update)
            this.messages = this.messages.map(msg => {
                if (msg.status === 'sending') {
                    return {
                        ...msg,
                        status: 'error',
                        error: error.message || 'Failed to send message'
                    };
                }
                return msg;
            });

            // Show error notification to user
            const { toast } = useToast();
            toast({
                title: "Error",
                description: error.message || "Failed to send message",
                variant: "destructive"
            });
        },
    }
});
