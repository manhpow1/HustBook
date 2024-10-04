class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.phoneNumber = data.phoneNumber;
        this.email = data.email;
        this.avatar = data.avatar;
        this.createdAt = data.createdAt;
        this.isVerified = data.isVerified;
        this.isBlocked = data.isBlocked;
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
            isBlocked: this.isBlocked
        };
    }
}

module.exports = User;