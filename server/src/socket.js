const { Server } = require('socket.io');
const logger = require('./utils/logger');
const { authenticateSocket } = require('./middleware/socketAuth');
const chatService = require('./services/chatService');

let io = null;

function initSocketIO(server) {
    io = new Server(server, {
        cors: {
            origin: '*', // Adjust accordingly
            methods: ['GET', 'POST']
        }
    });

    // Middleware for socket authentication
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id}, user: ${socket.userId}`);

        // Handle joinchat event:
        // client sends { partner_id, conversation_id } in data
        socket.on('joinchat', async (data) => {
            try {
                const { partner_id, conversation_id } = data;
                let roomName = await chatService.getConversationRoomName(socket.userId, partner_id, conversation_id);
                socket.join(roomName);
                logger.info(`User ${socket.userId} joined room ${roomName}`);
            } catch (error) {
                logger.error('joinchat error:', error);
                socket.emit('connection_error', { message: 'Could not join chat' });
            }
        });

        // Handle send event: { message, conversation_id/partner_id }
        socket.on('send', async (data) => {
            try {
                const { partner_id, conversation_id, message } = data;
                // Save message to DB via chatService
                const savedMessage = await chatService.sendMessage(socket.userId, partner_id, conversation_id, message);

                // Emit 'onmessage' to room or directly to partner
                let roomName = await chatService.getConversationRoomName(socket.userId, partner_id, conversation_id);
                io.to(roomName).emit('onmessage', { message: savedMessage });

            } catch (error) {
                logger.error('Error on send:', error);
                socket.emit('connection_error', { message: 'Could not send message' });
            }
        });

        // Handle deletemessage event: { message_id, conversation_id/partner_id }
        socket.on('deletemessage', async (data) => {
            try {
                const { message_id, partner_id, conversation_id } = data;
                const deleted = await chatService.deleteMessage(socket.userId, partner_id, conversation_id, message_id);

                if (deleted) {
                    let roomName = await chatService.getConversationRoomName(socket.userId, partner_id, conversation_id);
                    io.to(roomName).emit('deletemessage', { message_id });
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

        socket.on('disconnect', () => {
            logger.info(`Socket disconnected: ${socket.id}, user: ${socket.userId}`);
            // Handle presence logic if needed
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