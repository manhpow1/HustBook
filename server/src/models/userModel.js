class User {
    constructor(data) {
        this.id = data.uid;
        this.username = data.username;
        this.phoneNumber = data.phoneNumber;
        this.email = data.email || null;
        this.avatar = data.avatar || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.isVerified = data.isVerified || false;
        this.isBlocked = data.isBlocked || false;
        this.online = data.online || false;
        this.tokenVersion = data.tokenVersion || 0;
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            phoneNumber: this.phoneNumber,
            email: this.email,
            avatar: this.avatar,
            createdAt: this.createdAt,
            isVerified: this.isVerified,
            isBlocked: this.isBlocked,
            online: this.online,
        };
    }

    isUserBlocked() {
        return this.isBlocked;
    }
}

module.exports = User;