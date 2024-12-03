class User {
    constructor(data) {
        this.id = data.uid;
        this.username = data.username || '';
        this.phoneNumber = data.phoneNumber;
        this.email = data.email || '';
        this.avatar = data.avatar || '';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.isVerified = data.isVerified || false;
        this.isBlocked = data.isBlocked || false;
        this.deviceTokens = data.deviceTokens || [];
        this.deviceIds = data.deviceIds || [];
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
            deviceTokens: this.deviceTokens,
            deviceIds: this.deviceIds,
            tokenVersion: this.tokenVersion,
        };
    }

    async blockUser(targetUserId) {
        try {
            await db.collection(collections.blockedUsers).doc(`${this.id}_${targetUserId}`).set({
                blockerId: this.id,
                blockedId: targetUserId,
                blockedAt: new Date().toISOString(),
            });
            this.isBlocked = true;
        } catch (error) {
            throw new Error('Failed to block user.');
        }
    }

    async unblockUser(targetUserId) {
        try {
            await db.collection(collections.blockedUsers).doc(`${this.id}_${targetUserId}`).delete();
            this.isBlocked = false;
        } catch (error) {
            throw new Error('Failed to unblock user.');
        }
    }

    async isUserBlocked(targetUserId) {
        try {
            const doc = await db.collection(collections.blockedUsers).doc(`${this.id}_${targetUserId}`).get();
            return doc.exists;
        } catch (error) {
            throw new Error('Failed to check block status.');
        }
    }
}

module.exports = User;