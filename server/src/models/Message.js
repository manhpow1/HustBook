class Message {
    constructor({
        message,
        message_id,
        unread,
        created,
        sender,
        is_blocked,
    }) {
        this.message = message;
        this.message_id = message_id;
        this.unread = unread;
        this.created = created;
        this.sender = sender; // { id, username, avatar }
        if (is_blocked !== undefined) {
            this.is_blocked = is_blocked;
        }
    }

    toJSON() {
        const obj = {
            message: this.message,
            message_id: this.message_id,
            unread: this.unread,
            created: this.created,
            sender: this.sender,
        };
        if (this.is_blocked !== undefined) {
            obj.is_blocked = this.is_blocked;
        }
        return obj;
    }
}

module.exports = Message;