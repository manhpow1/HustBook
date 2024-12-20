import { io } from 'socket.io-client';
import { useUserStore } from '../stores/userStore';
import { useToast } from '../composables/useToast';
import logger from '../services/logging';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export function initSocket() {
    const userStore = useUserStore();
    const { showToast } = useToast();

    if (!userStore.isLoggedIn) {
        return;
    }

    const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const socketOrigin = new URL(socketUrl).origin;

    // Enhanced socket configuration with security measures
    socket = io(socketUrl, {
        auth: {
            token: userStore.accessToken,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        timeout: 10000,
        cors: {
            origin: socketOrigin,
            credentials: true
        }
    });

    // Connection events
    socket.on('connect', () => {
        logger.info('Socket connected:', socket.id);
        reconnectAttempts = 0;
        showToast('Chat connected', 'success');
    });

    socket.on('connect_error', (error) => {
        logger.error('Socket connection error:', error);
        showToast('Chat connection failed', 'error');
        handleReconnect();
    });

    socket.on('disconnect', (reason) => {
        logger.warn('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            // Server initiated disconnect - don't reconnect automatically
            socket.connect();
        }
    });

    socket.on('reconnect_failed', () => {
        logger.error('Socket reconnection failed after', MAX_RECONNECT_ATTEMPTS, 'attempts');
        showToast('Unable to connect to chat. Please refresh the page.', 'error');
    });

    // Chat events
    socket.on('onmessage', (data) => {
        const { useChatStore } = require('../stores/chatStore');
        const chatStore = useChatStore();
        chatStore.addMessage(data.message);
    });

    socket.on('deletemessage', (data) => {
        const { useChatStore } = require('../stores/chatStore');
        const chatStore = useChatStore();
        chatStore.removeMessage(data.messageId);
    });

    // Keep socket connection alive
    const heartbeat = setInterval(() => {
        if (socket && socket.connected) {
            socket.emit('available');
        }
    }, 30000);

    // Cleanup on unmount
    return () => {
        clearInterval(heartbeat);
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    };
}

export function joinChat(partnerId, conversationId) {
    if (!socket?.connected) {
        throw new Error('Socket not connected');
    }
    socket.emit('joinchat', { partnerId, conversationId });
}

export function sendMessage(partnerId, conversationId, message) {
    if (!socket?.connected) {
        throw new Error('Socket not connected');
    }
    socket.emit('send', { partnerId, conversationId, message });
}

export function deleteMessage(messageId, partnerId, conversationId) {
    if (!socket?.connected) {
        throw new Error('Socket not connected');
    }
    socket.emit('deletemessage', { messageId, partnerId, conversationId });
}

function handleReconnect() {
    reconnectAttempts++;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        logger.info('Attempting to reconnect... Attempt:', reconnectAttempts);
    }
}

export function getSocket() {
    return socket;
}

export function isConnected() {
    return socket?.connected || false;
}
