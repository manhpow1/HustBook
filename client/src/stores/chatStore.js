import { defineStore } from 'pinia';
import apiService from '../services/api';
import { useToast } from '@/components/ui/toast';
import { useUserStore } from './userStore';
import { socket } from '@/services/socket';
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
        initSocket() {
            const userStore = useUserStore();
            if (!this.isSocketInitialized && userStore.isLoggedIn) {
                this.socket = socket;
                
                this.socket.on('onmessage', (data) => {
                    const { message } = data;
                    if (message.sender.id !== userStore.userData?.userId) {
                        this.addMessage(message);
                        this.unreadCount++;
                    }
                });

                this.socket.on('deletemessage', (data) => {
                    const { messageId } = data;
                    this.removeMessage(messageId);
                });

                this.isSocketInitialized = true;
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
                const response = await apiService.getConversations(); // GET /conversations
                if (response.data.code === '1000') {
                    this.conversations = response.data.data;
                    this.unreadCount = parseInt(response.data.numNewMessage, 10);
                } else {
                    throw new Error(response.data.message || 'Failed to load conversations');
                }
            } catch (error) {
                toast(error.message, 'error');
            } finally {
                this.loadingConversations = false;
            }
        },

        async fetchMessages(conversationId, index = 0, count = 20) {
            this.loadingMessages = true;
            const { toast } = useToast();
            try {
                this.selectedConversationId = conversationId;
                const response = await apiService.getConversationMessages(conversationId, { index, count });
                if (response.data.code === '1000') {
                    this.messages = response.data.data;
                } else {
                    throw new Error(response.data.message || 'Failed to load messages');
                }
            } catch (error) {
                toast(error.message, 'error');
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
            if (!this.socket || !conversationId || !message) return;
            
            this.sendingMessage = true;

            try {
                // Emit the message through socket
                this.socket.emit('message', {
                    conversationId,
                    message,
                    userId: userStore.userData?.userId
                });

                // Create temporary message for optimistic update
                const tempMessage = {
                    message,
                    messageId: 'temp_' + Date.now(),
                    unread: '0',
                    created: new Date().toISOString(),
                    sender: {
                        id: userStore.userData?.userId,
                        userName: userStore.userData?.userName,
                        avatar: userStore.userData?.avatar
                    },
                    isBlocked: '0'
                };

                this.addMessage(tempMessage);
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
        }
    }
});
