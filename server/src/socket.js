const { Server } = require('socket.io');
const logger = require('./utils/logger');
const { authenticateSocket } = require('./middleware/socketAuth');
const chatService = require('./services/chatService');

let io = null;

function initSocketIO(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
            allowedHeaders: ['Authorization']
        },
        pingTimeout: 10000,
        pingInterval: 25000
    });

    // Middleware for socket authentication
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}, user: ${socket.userId}`);

        // Send initial connection success
        socket.emit('connect_success', { 
            message: 'Successfully connected to chat server'
        });

        // Handle room management
        socket.on('subscribe', (rooms) => {
            if (Array.isArray(rooms)) {
                rooms.forEach(room => socket.join(room));
                logger.info(`User ${socket.userId} subscribed to rooms:`, rooms);
            }
        });

        socket.on('unsubscribe', (rooms) => {
            if (Array.isArray(rooms)) {
                rooms.forEach(room => socket.leave(room));
                logger.info(`User ${socket.userId} unsubscribed from rooms:`, rooms);
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
                // Save message to DB via chatService
                const savedMessage = await chatService.sendMessage(socket.userId, partnerId, conversationId, message);

                // Emit 'onmessage' to room or directly to partner
                let roomName = await chatService.getConversationRoomName(socket.userId, partnerId, conversationId);
                io.to(roomName).emit('onmessage', { message: savedMessage });

            } catch (error) {
                logger.error('Error on send:', error);
                socket.emit('connection_error', { message: 'Could not send message' });
            }
        });

        // Handle deletemessage event: { messageId, conversationId/partnerId }
        socket.on('deletemessage', async (data) => {
            try {
                const { messageId, partnerId, conversationId } = data;
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

        socket.on('disconnect', (reason) => {
            logger.info(`Socket disconnected: ${socket.id}, user: ${socket.userId}, reason: ${reason}`);
            
            // Notify relevant rooms about user disconnection
            const rooms = Array.from(socket.rooms);
            rooms.forEach(room => {
                if (room !== socket.id) { // Skip default room
                    io.to(room).emit('user_disconnected', {
                        userId: socket.userId,
                        timestamp: new Date()
                    });
                }
            });
        });
    });
}

function getIO() {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
}

module.exports = {
    initSocketIO,
    getIO
};
