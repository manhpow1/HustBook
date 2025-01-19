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
            const token = localStorage.getItem('accessToken');
            if (token) return token;

            const cookieToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('accessToken='))
                ?.split('=')[1];
            if (cookieToken) return cookieToken;

            throw new Error('No access token found');
        } catch (error) {
            logger.error('Token retrieval failed:', error.message);
            return null;
        }
    })();

    if (!token) return null;

    // Enhanced socket configuration with security measures
    socket = io(socketUrl, {
        auth: {
            token: `Bearer ${token}`
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        timeout: 10000,
        extraHeaders: {
            Authorization: `Bearer ${token}`
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
            : error.message.includes('Too many connections') 
                ? 'Too many chat connections. Please try again in a few minutes.'
                : 'Chat connection failed';
        
        toast({ type: 'error', message: errorMessage });

        if (error.message.includes('Too many connections')) {
            // For connection limit errors, wait longer before retry
            setTimeout(() => {
                handleReconnect();
            }, 60000); // Wait 1 minute before retry
        } else {
            handleReconnect();
        }
    });

    socket.on('disconnect', (reason) => {
        logger.warn('Socket disconnected:', reason);
        if (reason === 'io server disconnect' || reason === 'transport close') {
            setTimeout(() => {
                socket.connect();
            }, 1000);
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
            
            // If this is for the current conversation, mark as read
            if (data.message.conversationId === chatStore.selectedConversationId) {
                chatStore.markAsRead();
            }
        } catch (error) {
            logger.error('Error handling incoming message:', error);
            toast({ type: 'error', message: 'Error displaying new message' });
        }
    });

    socket.on('message_sent', (data) => {
        try {
            const chatStore = useChatStore();
            // Update temp message status
            const message = chatStore.messages.find(m => m.status === 'sending');
            if (message) {
                message.status = 'sent';
                message.messageId = data.messageId; // Update with real ID from server
            }
        } catch (error) {
            logger.error('Error handling message sent confirmation:', error);
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

    socket.on('message_sent', (data) => {
        logger.debug('Message sent confirmation received:', {
            messageId: data.messageId,
            conversationId: data.conversationId
        });

        // Có thể cập nhật UI hoặc store để xác nhận tin nhắn đã được gửi
        const chatStore = useChatStore();
        chatStore.confirmMessageSent(data.messageId);
    });

    socket.on('message_error', (error) => {
        logger.error('Message error received:', error);

        const chatStore = useChatStore();
        // Xử lý lỗi và có thể hiển thị thông báo cho người dùng
        chatStore.handleMessageError(error);
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
    socket.emit('join_room', { partnerId, conversationId }, (error) => {
        if (error) {
            logger.error('Error joining chat:', error);
            throw error;
        }
    });
}

export async function sendMessage(partnerId, conversationId, message) {
    if (!socket?.connected) {
        socket?.connect();

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);

            socket.once('connect', () => {
                clearTimeout(timeout);
                resolve();
            });
        });
    }

    return new Promise((resolve, reject) => {
        socket.emit('send', { partnerId, conversationId, message }, (error) => {
            if (error) {
                logger.error('Error sending message:', error);
                reject(error);
            } else {
                resolve();
            }
        });
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
