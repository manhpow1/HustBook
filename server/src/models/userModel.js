const { initializeFirebase } = require('../config/firebase');
const { collections, arrayUnion, arrayRemove } = require('../config/database');
const { createError } = require('../utils/customError');
const logger = require('../utils/logger');

class User {
    constructor(data) {
        this.id = data.uid;
        this.userName = data.userName;
        this.phoneNumber = data.phoneNumber;
        this.avatar = data.avatar || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.isVerified = data.isVerified || false;
        this.isBlocked = data.isBlocked || false;
        this.online = data.online || false;
        this.tokenVersion = data.tokenVersion || 0;
        this.isAdmin = data.isAdmin || false;
    }

    toJSON() {
        return {
            id: this.id,
            userName: this.userName,
            phoneNumber: this.phoneNumber,
            avatar: this.avatar,
            createdAt: this.createdAt,
            isVerified: this.isVerified,
            isBlocked: this.isBlocked,
            online: this.online,
            isAdmin: this.isAdmin,
        };
    }

    async getUserRef() {
        let db = await initializeFirebase();
        return db.collection(collections.users).doc(this.id);
    }

    async blockUser(targetUserId) {
        try {
            const userRef = await this.getUserRef();
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw createError('9995', 'User not found.');
            }

            const userData = userDoc.data();
            const blockedUsers = userData.blockedUsers || [];

            if (!blockedUsers.includes(targetUserId)) {
                await userRef.update({
                    blockedUsers: arrayUnion(targetUserId)
                });
                logger.info(`User ${this.id} blocked user ${targetUserId}`);
            }
        } catch (error) {
            logger.error(`Error blocking user ${targetUserId} by user ${this.id}:`, error);
            throw createError('9999', 'Exception error while blocking user.');
        }
    }

    async unblockUser(targetUserId) {
        try {
            const userRef = await this.getUserRef();
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw createError('9995', 'User not found.');
            }

            const userData = userDoc.data();
            const blockedUsers = userData.blockedUsers || [];

            if (blockedUsers.includes(targetUserId)) {
                await userRef.update({
                    blockedUsers: arrayRemove(targetUserId)
                });
                logger.info(`User ${this.id} unblocked user ${targetUserId}`);
            }
        } catch (error) {
            logger.error(`Error unblocking user ${targetUserId} by user ${this.id}:`, error);
            throw createError('9999', 'Exception error while unblocking user.');
        }
    }
}

module.exports = User;
