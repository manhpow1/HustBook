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
        messages: [],
        loadingConversations: false,
        loadingMessages: false,
        unreadCount: 0,
        sendingMessage: false,
        socket: null,
        isSocketInitialized: false
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

        async fetchMessages(conversationId, index = 0, count = 20) {
            this.loadingMessages = true;
            const { toast } = useToast();
            try {
                console.debug('Fetching messages:', { conversationId, index, count });
                this.selectedConversationId = conversationId;
                const response = await apiService.getConversationMessages(conversationId, { index, count });
                console.debug('Messages response:', {
                    code: response.data.code,
                    messageCount: response.data.data?.length || 0
                });
                if (response.data.code === '1000') {
                    this.messages = response.data.data;
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
            // Add or update a message in the message list
            const exists = this.messages.find(m => m.messageId === message.messageId);
            if (!exists) {
                this.messages.push(message);
            } else {
                // Optional: update existing message if needed
            }
        },

        removeMessage(messageId) {
            this.messages = this.messages.filter(m => m.messageId !== messageId);
        },

        async sendMessage({ conversationId, message }) {
            if (!conversationId || !message) {
                logger.error('Invalid message parameters:', { 
                    conversationId, 
                    hasMessage: !!message 
                });
                return;
            }

            const socket = getSocket();
            if (!socket?.connected) {
                logger.warn('Socket not connected, attempting to reconnect...');
                await this.initSocket();
                
                const reconnectedSocket = getSocket();
                if (!reconnectedSocket?.connected) {
                    throw new Error('Failed to establish socket connection');
                }
            }

            this.sendingMessage = true;
            logger.debug('Preparing to send message:', { conversationId });

            try {
                const userStore = useUserStore();
                const messageData = {
                    conversationId,
                    message,
                    userId: userStore.userData?.userId
                };
                
                logger.debug('Emitting socket message:', messageData);
                socket.emit('message', messageData);

                logger.debug('Creating temporary message for optimistic update');
                const tempMessage = {
                    message,
                    messageId: 'temp_' + Date.now(),
                    unread: '0',
                    created: new Date().toISOString(),
                    sender: {
                        id: userStore.userData?.userId,
                        userName: userStore.userData?.userName || '',
                        avatar: userStore.userData?.avatar || ''
                    },
                    isBlocked: '0'
                };

                this.addMessage(tempMessage);
                
                // Update conversation list with new message
                const conversation = this.conversations.find(c => c.conversationId === conversationId);
                if (conversation) {
                    conversation.LastMessage = {
                        message,
                        created: tempMessage.created,
                        unread: '0'
                    };
                }
            } catch (error) {
                logger.error('Error sending message:', error);
                toast({
                    title: "Error",
                    description: "Failed to send message",
                    variant: "destructive"
                });
                throw error;
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
            // Tìm và cập nhật trạng thái tin nhắn thành đã gửi
            const messageIndex = messages.value.findIndex(msg => msg.messageId === messageId);
            if (messageIndex !== -1) {
                messages.value[messageIndex].status = 'sent';
                messages.value[messageIndex].error = null;
            }
        },
    
        async handleMessageError(error) {
            // Cập nhật trạng thái tin nhắn thành lỗi
            // Thường được gọi khi tin nhắn tạm thời đã được thêm vào UI (optimistic update)
            messages.value = messages.value.map(msg => {
                if (msg.status === 'sending') {
                    return {
                        ...msg,
                        status: 'error',
                        error: error.message || 'Failed to send message'
                    };
                }
                return msg;
            });
    
            // Thông báo lỗi cho người dùng
            const { toast } = useToast();
            toast({
                title: "Error",
                description: error.message || "Failed to send message",
                variant: "destructive"
            });
        },
    }
});
