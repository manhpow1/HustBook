class Message {
    constructor({
        message,
        messageId,
        unread,
        created,
        sender,
        isBlocked,
        status = 'sent',
        conversationId,
        type = 'text',
        metadata = {},
        replyTo = null,
        reactions = [],
        editHistory = []
    }) {
        // Required fields
        if (!message || typeof message !== 'string') {
            throw new Error('Message content must be a string');
        }
        if (!messageId) {
            throw new Error('Message ID is required');
        }
        if (!sender || !sender.userId) {
            throw new Error('Sender information is required');
        }

        // Core message data
        this.content = message.trim();
        this.message = this.content; // For backwards compatibility
        this.messageId = messageId;
        this.unread = unread || '0';
        this.created = created || new Date().toISOString();
        this.sender = {
            userId: sender.userId,
            userName: sender.userName || 'Unknown User',
            avatar: sender.avatar || ''
        };

        // Message status and type
        this.status = ['sent', 'delivered', 'read', 'failed', 'sending'].includes(status) 
            ? status 
            : 'sent';
        this.type = ['text', 'image', 'file', 'system'].includes(type) 
            ? type 
            : 'text';

        // Optional fields
        if (isBlocked !== undefined) {
            this.isBlocked = isBlocked;
        }
        if (conversationId) {
            this.conversationId = conversationId;
        }
        if (Object.keys(metadata).length > 0) {
            this.metadata = metadata;
        }
        if (replyTo) {
            this.replyTo = replyTo;
        }
        if (reactions.length > 0) {
            this.reactions = reactions;
        }
        if (editHistory.length > 0) {
            this.editHistory = editHistory;
        }
    }

    toJSON() {
        const obj = {
            message: this.message,
            messageId: this.messageId,
            unread: this.unread,
            created: this.created,
            sender: this.sender,
            status: this.status,
            type: this.type
        };

        // Include optional fields only if they exist
        if (this.isBlocked !== undefined) obj.isBlocked = this.isBlocked;
        if (this.conversationId) obj.conversationId = this.conversationId;
        if (this.metadata) obj.metadata = this.metadata;
        if (this.replyTo) obj.replyTo = this.replyTo;
        if (this.reactions) obj.reactions = this.reactions;
        if (this.editHistory) obj.editHistory = this.editHistory;

        return obj;
    }

    // Helper method to update message status
    updateStatus(newStatus) {
        if (['sent', 'delivered', 'read', 'failed', 'sending'].includes(newStatus)) {
            this.status = newStatus;
        }
    }

    // Add a reaction to the message
    addReaction(userId, reaction) {
        if (!this.reactions) {
            this.reactions = [];
        }
        const existingReaction = this.reactions.findIndex(r => r.userId === userId);
        if (existingReaction !== -1) {
            this.reactions[existingReaction].reaction = reaction;
        } else {
            this.reactions.push({ userId, reaction });
        }
    }

    // Remove a reaction from the message
    removeReaction(userId) {
        if (this.reactions) {
            this.reactions = this.reactions.filter(r => r.userId !== userId);
        }
    }

    // Add edit history
    addEditHistory(newContent) {
        if (!this.editHistory) {
            this.editHistory = [];
        }
        this.editHistory.push({
            previousContent: this.message,
            timestamp: new Date().toISOString()
        });
        this.message = newContent.trim();
    }
}

export default Message;
