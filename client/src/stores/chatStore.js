import { defineStore } from 'pinia';
import apiService from '../services/api';
import { useToast } from '../composables/useToast';
import { useUserStore } from './userStore';

export const useChatStore = defineStore('chat', {
    state: () => ({
        conversations: [],
        selectedConversationId: null,
        messages: [],
        loadingConversations: false,
        loadingMessages: false,
        unreadCount: 0,
    }),
    actions: {
        async fetchConversations() {
            this.loadingConversations = true;
            const { showToast } = useToast();
            try {
                const response = await apiService.getConversations(); // GET /conversations
                if (response.data.code === '1000') {
                    this.conversations = response.data.data;
                    this.unreadCount = parseInt(response.data.numNewMessage, 10);
                } else {
                    throw new Error(response.data.message || 'Failed to load conversations');
                }
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                this.loadingConversations = false;
            }
        },

        async fetchMessages(conversationId, index = 0, count = 20) {
            this.loadingMessages = true;
            const { showToast } = useToast();
            try {
                this.selectedConversationId = conversationId;
                const response = await apiService.getConversationMessages(conversationId, { index, count });
                if (response.data.code === '1000') {
                    this.messages = response.data.data;
                } else {
                    throw new Error(response.data.message || 'Failed to load messages');
                }
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                this.loadingMessages = false;
            }
        },

        addMessage(message) {
            // Add or update a message in the message list
            const exists = this.messages.find(m => m.message_id === message.message_id);
            if (!exists) {
                this.messages.push(message);
            } else {
                // Optional: update existing message if needed
            }
        },

        removeMessage(messageId) {
            this.messages = this.messages.filter(m => m.message_id !== messageId);
        },

        async sendMessage(content) {
            // Sending message is via socket.io in this scenario:
            // On the server side, after sending message via socket,
            // Server emits 'onmessage' event that we handle in addMessage().
            // Here, we just handle optimistic update if necessary.
            const tempId = 'temp_' + Date.now();
            const userStore = useUserStore();
            const pendingMessage = {
                message: content,
                message_id: tempId,
                unread: '0',
                created: new Date().toISOString(),
                sender: { id: userStore.uid, username: userStore.username, avatar: userStore.avatar },
                is_blocked: '0'
            };
            this.messages.push(pendingMessage);

            // The actual sending via socket is handled in the component using getSocket().
            // Once 'onmessage' event returns from server, we get the real message_id.
            // On 'onmessage', we can remove this temp message if needed or just accept the new one.
        },

        async markAsRead() {
            if (!this.selectedConversationId) return;
            const { showToast } = useToast();
            try {
                const response = await apiService.setReadMessage(this.selectedConversationId);
                if (response.data.code === '1000') {
                    // Mark messages as read locally
                    this.messages = this.messages.map(msg => ({ ...msg, unread: '0' }));
                } else {
                    throw new Error(response.data.message || 'Failed to mark messages as read');
                }
            } catch (error) {
                showToast(error.message, 'error');
            }
        },

        async deleteMessage(messageId) {
            if (!this.selectedConversationId) return;
            const { showToast } = useToast();
            try {
                const response = await apiService.deleteMessage(this.selectedConversationId, messageId);
                if (response.data.code === '1000') {
                    this.removeMessage(messageId);
                } else {
                    throw new Error(response.data.message || 'Failed to delete message');
                }
            } catch (error) {
                showToast(error.message, 'error');
            }
        },

        async deleteConversation() {
            if (!this.selectedConversationId) return;
            const { showToast } = useToast();
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
                showToast(error.message, 'error');
            }
        }
    }
});