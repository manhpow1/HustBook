import { io } from 'socket.io-client';
import { useUserStore } from '../stores/userStore';
import { useToast } from '@/components/ui/toast';
import { useChatStore } from '../stores/chatStore';
import logger from '../services/logging';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const MAX_RECONNECT_DELAY = 10000; // 10 seconds

export function initSocket() {
    const userStore = useUserStore();
    const { toast } = useToast();

    if (!userStore.isLoggedIn) {
        return null;
    }

    const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const socketOrigin = new URL(socketUrl).origin;

    // More robust token extraction
    const token = (() => {
        try {
            const cookieToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('accessToken='))
                ?.split('=')[1];
            if (cookieToken) return cookieToken;
            // Fallback to localStorage if cookie not found
            const localToken = localStorage.getItem('accessToken');
            if (localToken) return localToken;
            
            throw new Error('No access token found');
        } catch (error) {
            logger.error('Socket initialization failed:', error.message);
            return null;
        }
    })();

    if (!token) return null;

    // Enhanced socket configuration with security measures
    socket = io(socketUrl, {
        auth: {
            token
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

    // Connection events with enhanced error handling
    socket.on('connect', () => {
    logger.info('Socket connected:', socket.id);
    reconnectAttempts = 0;
    toast({ type: 'success', message: 'Chat connected' });
});

socket.on('connect_error', (error) => {
    logger.error('Socket connection error:', error);
    const errorMessage = error.message.includes('authentication failed') 
        ? 'Authentication failed. Please log in again.'
        : 'Chat connection failed';
    toast({ type: 'error', message: errorMessage });
    handleReconnect();
});

    socket.on('disconnect', (reason) => {
        logger.warn('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
            // Server initiated disconnect - don't reconnect automatically
            socket.connect();
        } else if (reason === 'transport close') {
            // Transport issues - attempt reconnect with backoff
            handleReconnect();
        }
    });

    socket.on('reconnect_failed', () => {
    logger.error('Socket reconnection failed after', MAX_RECONNECT_ATTEMPTS, 'attempts');
    toast({ type: 'error', message: 'Unable to connect to chat. Please refresh the page.' });
});

socket.on('onmessage', (data) => {
    try {
        const chatStore = useChatStore();
        chatStore.addMessage(data.message);
    } catch (error) {
        logger.error('Error handling incoming message:', error);
        toast({ type: 'error', message: 'Error displaying new message' });
    }
});

socket.on('deletemessage', (data) => {
    try {
        const chatStore = useChatStore();
        chatStore.removeMessage(data.messageId);
    } catch (error) {
        logger.error('Error handling message deletion:', error);
        toast({ type: 'error', message: 'Error removing message' });
    }
});

    // Keep socket connection alive with error handling
    const heartbeat = setInterval(() => {
        if (socket?.connected) {
            socket.emit('available', null, (error) => {
                if (error) {
                    logger.error('Heartbeat error:', error);
                }
            });
        }
    }, 30000);

    // Enhanced cleanup on unmount
    return () => {
        clearInterval(heartbeat);
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
            socket = null;
        }
    };
}

// Exponential backoff for reconnection
function handleReconnect() {
    reconnectAttempts++;
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
        logger.info(`Attempting to reconnect in ${delay}ms... Attempt: ${reconnectAttempts}`);
        setTimeout(() => {
            socket?.connect();
        }, delay);
    }
}

// Chat operation functions with enhanced error handling
export function joinChat(partnerId, conversationId) {
    if (!socket?.connected) {
        throw new Error('Socket not connected');
    }
    socket.emit('joinchat', { partnerId, conversationId }, (error) => {
        if (error) {
            logger.error('Error joining chat:', error);
            throw error;
        }
    });
}

export function sendMessage(partnerId, conversationId, message) {
    if (!socket?.connected) {
        throw new Error('Socket not connected');
    }
    socket.emit('send', { partnerId, conversationId, message }, (error) => {
        if (error) {
            logger.error('Error sending message:', error);
            throw error;
        }
    });
}

export function deleteMessage(messageId, partnerId, conversationId) {
    if (!socket?.connected) {
        throw new Error('Socket not connected');
    }
    socket.emit('deletemessage', { messageId, partnerId, conversationId }, (error) => {
        if (error) {
            logger.error('Error deleting message:', error);
            throw error;
        }
    });
}

export function getSocket() {
    return socket;
}

export function isConnected() {
    return socket?.connected || false;
}
