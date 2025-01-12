import { Server } from 'socket.io';
import logger from './utils/logger.js';
import { authenticateSocket } from './middleware/socketAuth.js';
import chatService from './services/chatService.js';
import redis from './utils/redis.js';

let io = null;
const { cache } = redis;

export function initSocketIO(server) {
    try {
        io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true,
                allowedHeaders: ['Authorization', 'Content-Type'],
            },
            pingTimeout: 30000,
            pingInterval: 25000,
            connectTimeout: 45000,
            transports: ['websocket', 'polling']
        });

        // Socket-level error handling
        io.engine.on('connection_error', (err) => {
            logger.error('Socket.io connection error:', err);
        });

        // Middleware for socket authentication
        io.use(authenticateSocket);

        io.on('connection', (socket) => {
            logger.info(`Socket connected: ${socket.id}, user: ${socket.userId}`);

            // Handle socket errors
            socket.on('error', (error) => {
                logger.error(`Socket error for ${socket.id}:`, error);
                socket.emit('error', { message: 'Internal server error' });
            });

            // Send initial connection success
            socket.emit('connect_success', {
                message: 'Successfully connected to chat server'
            });

            // Handle room management
            socket.on('subscribe', (rooms) => {
                try {
                    if (Array.isArray(rooms)) {
                        rooms.forEach(room => socket.join(room));
                        logger.info(`User ${socket.userId} subscribed to rooms:`, rooms);
                    }
                } catch (error) {
                    logger.error('Subscribe error:', error);
                    socket.emit('connection_error', { message: 'Failed to subscribe to rooms' });
                }
            });

            socket.on('unsubscribe', (rooms) => {
                try {
                    if (Array.isArray(rooms)) {
                        rooms.forEach(room => socket.leave(room));
                        logger.info(`User ${socket.userId} unsubscribed from rooms:`, rooms);
                    }
                } catch (error) {
                    logger.error('Unsubscribe error:', error);
                    socket.emit('connection_error', { message: 'Failed to unsubscribe from rooms' });
                }
            });

            // Handle joinchat event:
            // client sends { partnerId, conversationId } in data
            socket.on('joinchat', async (data) => {
                try {
                    const { partnerId, conversationId } = data;
                    let roomName = await chatService.getConversationRoomName(socket.userId, partnerId, conversationId);
                    socket.join(roomName);
                    logger.info(`User ${socket.userId} joined room ${roomName}`);
                } catch (error) {
                    logger.error('joinchat error:', error);
                    socket.emit('connection_error', { message: 'Could not join chat' });
                }
            });

            // Handle send event: { message, conversationId/partnerId }
            socket.on('send', async (data) => {
                try {
                    const { partnerId, conversationId, message } = data;

                    logger.debug('Received message event:', {
                        socketId: socket.id,
                        userId: socket.userId,
                        partnerId,
                        conversationId,
                        messageLength: message?.length
                    });

                    if (!message) {
                        throw new Error('Message is required');
                    }

                    // Get or validate conversation ID
                    let targetConversationId = conversationId;
                    if (!targetConversationId && !partnerId) {
                        throw new Error('Either conversationId or partnerId is required');
                    }

                    try {
                        // Save message using chat service
                        const savedMessage = await chatService.sendMessage(
                            socket.userId,
                            partnerId,
                            targetConversationId,
                            message
                        );

                        logger.debug('Message saved successfully:', {
                            messageId: savedMessage.messageId,
                            conversationId: targetConversationId
                        });

                        // Get room name for socket communication
                        const roomName = await chatService.getConversationRoomName(
                            socket.userId,
                            partnerId,
                            targetConversationId
                        );

                        // Broadcast message to room
                        io.to(roomName).emit('onmessage', {
                            message: savedMessage,
                            timestamp: new Date().toISOString()
                        });

                        // Send confirmation to sender
                        socket.emit('message_sent', {
                            status: 'success',
                            messageId: savedMessage.messageId,
                            conversationId: targetConversationId,
                            timestamp: new Date().toISOString()
                        });

                    } catch (dbError) {
                        logger.error('Database operation failed:', {
                            error: dbError.message,
                            stack: dbError.stack,
                            userId: socket.userId
                        });
                        
                        socket.emit('message_error', {
                            error: 'Failed to save message',
                            code: 'DB_ERROR'
                        });
                        
                        throw dbError;
                    }

                } catch (error) {
                    logger.error('Error in send event:', {
                        error: error.message,
                        stack: error.stack,
                        userId: socket.userId
                    });

                    // Gửi thông báo lỗi về client
                    socket.emit('message_error', {
                        error: error.message,
                        code: error.code || 'UNKNOWN_ERROR'
                    });
                }
            });

            socket.on('connect_success', () => {
                logger.info('Client connected successfully:', {
                    socketId: socket.id,
                    userId: socket.userId
                });
            });

            // Handle deletemessage event: { messageId, conversationId/partnerId }
            socket.on('deletemessage', async (data) => {
                try {
                    const { messageId, partnerId, conversationId } = data;
                    if (!messageId || (!partnerId && !conversationId)) {
                        throw new Error('Invalid delete message data');
                    }

                    const deleted = await chatService.deleteMessage(socket.userId, partnerId, conversationId, messageId);

                    if (deleted) {
                        let roomName = await chatService.getConversationRoomName(socket.userId, partnerId, conversationId);
                        io.to(roomName).emit('deletemessage', { messageId });
                    } else {
                        socket.emit('connection_error', { message: 'Message not deleted' });
                    }
                } catch (error) {
                    logger.error('Error on deletemessage:', error);
                    socket.emit('connection_error', { message: 'Could not delete message' });
                }
            });

            socket.on('available', () => {
                logger.info(`User ${socket.userId} still connected`);
                // Handle presence logic if needed
            });

            socket.on('disconnect', async (reason) => {
                logger.info(`Socket disconnected: ${socket.id}, user: ${socket.userId}, reason: ${reason}`);

                try {
                    // Cleanup connection count
                    const currentConnections = await cache.get(`socket_ip:${socket.clientIp}`);
                    if (currentConnections > 0) {
                        await cache.set(`socket_ip:${socket.clientIp}`, currentConnections - 1, 3600);
                    }

                    // Notify other users
                    socket.rooms.forEach(room => {
                        if (room !== socket.id) {
                            socket.to(room).emit('user_disconnected', {
                                userId: socket.userId,
                                timestamp: new Date()
                            });
                        }
                    });
                } catch (error) {
                    logger.error('Error in disconnect handler:', error);
                }
            });
        });

        // Handle server shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received - closing Socket.IO server');
            closeSocketServer();
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received - closing Socket.IO server');
            closeSocketServer();
        });

        return io;
    } catch (error) {
        logger.error('Failed to initialize socket server:', error);
        throw error;
    }
}

export function closeSocketServer() {
    if (io) {
        try {
            io.close(() => {
                logger.info('Socket.IO server closed');
            });
        } catch (error) {
            logger.error('Error closing Socket.IO server:', error);
        }
    }
}

export function getIO() {
    if (!io) {
        logger.error('Socket.IO not initialized');
        throw new Error('Socket.IO not initialized');
    }
    return io;
}
