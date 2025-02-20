import { db } from '../config/firebase.js';
import { collections, arrayUnion, arrayRemove } from '../config/database.js';
import { createError } from '../utils/customError.js';
import logger from '../utils/logger.js';
import redis from '../utils/redis.js';

class User {
    constructor(data) {
        this.userId = data.userId;
        this.userName = data.userName || null;
        this.userNameLowerCase = data.userNameLowerCase || [];
        this.phoneNumber = data.phoneNumber;
        this.bio = data.bio || null;
        this.address = data.address || null;
        this.city = data.city || null;
        this.country = data.country || null;
        this.avatar = data.avatar || '';
        this.coverPhoto = data.coverPhoto || '';
        this.link = data.link || null;
        this.friendsCount = data.friendsCount || 0;
        this.postsCount = data.postsCount || 0;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.isVerified = data.isVerified || false;
        this.isBlocked = data.isBlocked || false;
        this.online = data.online || false;
        this.lastSeen = data.lastSeen || new Date().toISOString();
        this.tokenVersion = data.tokenVersion || 0;
        this.isAdmin = data.isAdmin || false;
        this.version = data.version || 0;
        this.deviceIds = data.deviceIds || [];
        this.deviceTokens = data.deviceTokens || [];
        this.tokenFamily = data.tokenFamily;
        this.deviceDetails = data.deviceDetails || [];
        this.password = data.password;
        this.passwordHistory = data.passwordHistory || [];
        this.lastPasswordChange = data.lastPasswordChange || new Date().toISOString();
        this.verificationCode = data.verificationCode;
        this.verificationCodeExpiration = data.verificationCodeExpiration;
        this.verificationAttempts = data.verificationAttempts || 0;
        this.uuid = data.uuid;
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    toJSON() {
        return {
            userId: this.userId,
            userName: this.userName,
            userNameLowerCase: this.userNameLowerCase,
            phoneNumber: this.phoneNumber,
            bio: this.bio,
            avatar: this.avatar,
            coverPhoto: this.coverPhoto,
            link: this.link,
            address: this.address,
            city: this.city,
            country: this.country,
            friendsCount: this.friendsCount,
            postsCount: this.postsCount,
            createdAt: this.createdAt,
            isVerified: this.isVerified,
            isBlocked: this.isBlocked,
            online: this.online,
            lastSeen: this.lastSeen,
            isAdmin: this.isAdmin,
            deviceIds: this.deviceIds,
            tokenFamily: this.tokenFamily,
            version: this.version,
        };
    }

    async getUserRef() {
        return db.collection(collections.users).doc(this.userId);
    }

    async addDevice(deviceId) {
        if (this.deviceIds.length >= 5) {
            throw createError('1003', 'Maximum number of devices reached');
        }

        if (!this.deviceIds.includes(deviceId)) {
            try {
                const userRef = await this.getUserRef();
                await userRef.update({
                    deviceIds: arrayUnion(deviceId)
                });

                await redis.setKey(`user:${this.userId}:devices`,
                    JSON.stringify([...this.deviceIds, deviceId]));

                this.deviceIds.push(deviceId);
                logger.info(`Added device ${deviceId} for user ${this.userId}`);
            } catch (error) {
                logger.error(`Error adding device for user ${this.userId}:`, error);
                throw createError('9999', 'Failed to add device');
            }
        }
    }

    async removeDevice(deviceId) {
        try {
            const userRef = await this.getUserRef();
            await userRef.update({
                deviceIds: arrayRemove(deviceId)
            });

            const updatedDevices = this.deviceIds.filter(deviceId => deviceId !== deviceId);
            await redis.setKey(`user:${this.userId}:devices`,
                JSON.stringify(updatedDevices));

            this.deviceIds = updatedDevices;
            logger.info(`Removed device ${deviceId} for user ${this.userId}`);
        } catch (error) {
            logger.error(`Error removing device for user ${this.userId}:`, error);
            throw createError('9999', 'Failed to remove device');
        }
    }

    async blockUser(targetUserId) {
        try {
            const userRef = await this.getUserRef();
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw createError('9995', 'User not found.');
            }

            await userRef.update({
                blockedUsers: arrayUnion(targetUserId),
                updatedAt: new Date().toISOString()
            });

            await redis.cache.del(`user:${this.userId}`)
            logger.info(`User ${this.userId} blocked user ${targetUserId}`);
        } catch (error) {
            logger.error(`Error blocking user ${targetUserId} by user ${this.userId}:`, error);
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

            await userRef.update({
                blockedUsers: arrayRemove(targetUserId),
                updatedAt: new Date().toISOString()
            });

            await redis.cache.del(`user:${this.userId}`);
            logger.info(`User ${this.userId} unblocked user ${targetUserId}`);
        } catch (error) {
            logger.error(`Error unblocking user ${targetUserId} by user ${this.userId}:`, error);
            throw createError('9999', 'Exception error while unblocking user.');
        }
    }

    async save() {
        const userRef = await this.getUserRef();
        const userData = {
            userId: this.userId,
            userName: this.userName,
            userNameLowerCase: this.userNameLowerCase,
            phoneNumber: this.phoneNumber,
            bio: this.bio,
            avatar: this.avatar,
            coverPhoto: this.coverPhoto,
            link: this.link,
            address: this.address,
            city: this.city,
            country: this.country,
            friendsCount: this.friendsCount,
            postsCount: this.postsCount,
            createdAt: this.createdAt,
            isVerified: this.isVerified,
            isBlocked: this.isBlocked,
            online: this.online,
            lastSeen: this.lastSeen,
            tokenVersion: this.tokenVersion,
            isAdmin: this.isAdmin,
            deviceIds: this.deviceIds,
            tokenFamily: this.tokenFamily,
            deviceDetails: this.deviceDetails,
            password: this.password,
            passwordHistory: this.passwordHistory,
            lastPasswordChange: this.lastPasswordChange,
            verificationCode: this.verificationCode,
            verificationCodeExpiration: this.verificationCodeExpiration,
            verificationAttempts: this.verificationAttempts,
            uuid: this.uuid,
            updatedAt: new Date().toISOString()
        };

        // Remove undefined/null values
        const cleanedData = Object.fromEntries(
            Object.entries(userData).filter(([_, v]) => v != null)
        );

        await userRef.set(cleanedData, { merge: true });
        return this;
    }
}

export default User;
