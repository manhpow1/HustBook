class Conversation {
    constructor({ id, partnerId, partnerUsername = '', partnerAvatar = '', lastMessage = {}, unread = false }) {
        this.id = id;
        this.Partner = {
            id: partnerId,
            userName: partnerUsername,
            avatar: partnerAvatar
        };
        this.LastMessage = {
            message: lastMessage.message || '',
            created: lastMessage.created || '',
            unread: unread ? '1' : '0'
        };
    }

    toJSON() {
        return {
            id: this.id,
            Partner: this.Partner,
            LastMessage: this.LastMessage
        };
    }
}

export default Conversation;