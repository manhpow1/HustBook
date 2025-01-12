class Conversation {
    constructor({ conversationId, partnerId, partnerUsername = '', partnerAvatar = '', lastMessage = {}, unreadCount = 0 }) {
        this.conversationId = conversationId;
        this.Partner = {
            userId: partnerId,
            userName: partnerUsername,
            avatar: partnerAvatar
        };
        this.LastMessage = lastMessage ? {
            message: lastMessage.message || '',
            created: lastMessage.created || '',
            unread: lastMessage.unread || '0'
        } : null;
        this.unreadCount = unreadCount;
    }

    toJSON() {
        return {
            conversationId: this.conversationId,
            Partner: this.Partner,
            LastMessage: this.LastMessage,
            unreadCount: this.unreadCount
        };
    }
}

export default Conversation;