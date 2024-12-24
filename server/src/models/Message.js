class Message {
    constructor({
        message,
        messageId,
        unread,
        created,
        sender,
        isBlocked,
    }) {
        this.message = message;
        this.messageId = messageId;
        this.unread = unread;
        this.created = created;
        this.sender = sender; // { id, userName, avatar }
        if (isBlocked !== undefined) {
            this.isBlocked = isBlocked;
        }
    }

    toJSON() {
        const obj = {
            message: this.message,
            messageId: this.messageId,
            unread: this.unread,
            created: this.created,
            sender: this.sender,
        };
        if (this.isBlocked !== undefined) {
            obj.isBlocked = this.isBlocked;
        }
        return obj;
    }
}

export default Message;