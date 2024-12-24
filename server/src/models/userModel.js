import { initializeFirebase } from '../config/firebase';
import { collections, arrayUnion, arrayRemove } from '../config/database';
import { createError } from '../utils/customError';
import logger from '../utils/logger';
import redis from '../utils/redis';

class User {
    constructor(data) {
        this.id = data.uid;
        this.userName = data.userName || null;
        this.phoneNumber = data.phoneNumber;
        this.avatar = data.avatar || null;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.isVerified = data.isVerified || false;
        this.isBlocked = data.isBlocked || false;
        this.online = data.online || false;
        this.tokenVersion = data.tokenVersion || 0;
        this.isAdmin = data.isAdmin || false;
        this.deviceIds = data.deviceIds || [];
        this.tokenFamily = data.tokenFamily;
        this.deviceDetails = data.deviceDetails || [];
        this.password = data.password;
        this.passwordHistory = data.passwordHistory || [];
        this.lastPasswordChange = data.lastPasswordChange;
        this.verificationCode = data.verificationCode;
        this.verificationCodeExpiration = data.verificationCodeExpiration;
        this.verificationAttempts = data.verificationAttempts || 0;
    }

    toJSON() {
        return {
            id: this.id,
            ...(this.userName && { userName: this.userName }),
            phoneNumber: this.phoneNumber,
            avatar: this.avatar,
            createdAt: this.createdAt,
            isVerified: this.isVerified,
            isBlocked: this.isBlocked,
            online: this.online,
            isAdmin: this.isAdmin,
            deviceIds: this.deviceIds,
            tokenFamily: this.tokenFamily
        };
    }

    async getUserRef() {
        const { db } = await initializeFirebase();
        return db.collection(collections.users).doc(this.id);
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

                await redis.setKey(`user:${this.id}:devices`,
                    JSON.stringify([...this.deviceIds, deviceId]));

                this.deviceIds.push(deviceId);
                logger.info(`Added device ${deviceId} for user ${this.id}`);
            } catch (error) {
                logger.error(`Error adding device for user ${this.id}:`, error);
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

            const updatedDevices = this.deviceIds.filter(id => id !== deviceId);
            await redis.setKey(`user:${this.id}:devices`,
                JSON.stringify(updatedDevices));

            this.deviceIds = updatedDevices;
            logger.info(`Removed device ${deviceId} for user ${this.id}`);
        } catch (error) {
            logger.error(`Error removing device for user ${this.id}:`, error);
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

            await redis.deleteKey(`user:${this.id}`);
            logger.info(`User ${this.id} blocked user ${targetUserId}`);
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

            await userRef.update({
                blockedUsers: arrayRemove(targetUserId),
                updatedAt: new Date().toISOString()
            });

            await redis.deleteKey(`user:${this.id}`);
            logger.info(`User ${this.id} unblocked user ${targetUserId}`);
        } catch (error) {
            logger.error(`Error unblocking user ${targetUserId} by user ${this.id}:`, error);
            throw createError('9999', 'Exception error while unblocking user.');
        }
    }

    async save() {
        const userRef = await this.getUserRef();
        const userData = this.toJSON();
        // Loại bỏ các trường undefined hoặc null
        const cleanedData = Object.fromEntries(
            Object.entries(userData).filter(([_, v]) => v != null)
        );
        await userRef.set(cleanedData, { merge: true });
    }
}

export default User;