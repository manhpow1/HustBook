import { io } from 'socket.io-client';
import { useUserStore } from '../stores/userStore';
import { useToast } from '../composables/useToast';

let socket = null;

export function initSocket() {
    const userStore = useUserStore();
    const { showToast } = useToast();

    if (!userStore.isLoggedIn) {
        // No user logged in, no socket connection
        return;
    }

    // Pass token for authentication during handshake
    socket = io(import.meta.env.VITE_APP_SOCKET_URL || 'http://localhost:3000', {
        auth: {
            token: userStore.accessToken,
        },
        transports: ['websocket'],
    });

    socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
    });

    socket.on('connection_error', (data) => {
        showToast(data.message || 'Unable to connect to chat', 'error');
    });

    socket.on('onmessage', (data) => {
        // Message received from server
        // Commit to chat store to update UI
        const { useChatStore } = require('../stores/chatStore');
        const chatStore = useChatStore();
        chatStore.addMessage(data.message);
    });

    socket.on('deletemessage', (data) => {
        // Message deleted event
        const { useChatStore } = require('../stores/chatStore');
        const chatStore = useChatStore();
        chatStore.removeMessage(data.messageId);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
}

export function getSocket() {
    return socket;
}