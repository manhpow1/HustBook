import { db } from '../config/firebase.js';
import logger from '../utils/logger.js';

export const DEFAULT_PUSH_SETTINGS = {
    like_comment: '1',
    from_friends: '1',
    requested_friend: '1',
    suggested_friend: '1',
    birthday: '1',
    video: '1',
    report: '1',
    notification_on: '1',
};

export class PushSettings {
    constructor(userId) {
        if (!userId) {
            throw new Error('User ID is required to manage push settings.');
        }
        this.userId = userId;
    }

    getSettingsRef() {
        return db.collection('pushSettings').doc(this.userId);
    }

    async getSettings() {
        try {
            const settingsRef = this.getSettingsRef();
            const doc = await settingsRef.get();
            if (doc.exists) {
                return doc.data();
            } else {
                await settingsRef.set(DEFAULT_PUSH_SETTINGS);
                return DEFAULT_PUSH_SETTINGS;
            }
        } catch (error) {
            logger.error(`Failed to retrieve push settings for user ${this.userId}:`, error);
            throw new Error('Failed to retrieve push settings.');
        }
    }

    async updateSettings(settings) {
        try {
            if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
                throw new Error('Invalid settings object provided.');
            }

            const settingsRef = this.getSettingsRef();
            const allowedKeys = Object.keys(DEFAULT_PUSH_SETTINGS);
            const sanitizedSettings = {};

            allowedKeys.forEach((key) => {
                if (Object.prototype.hasOwnProperty.call(settings, key)) {
                    sanitizedSettings[key] = settings[key] === '0' ? '0' : '1'; // Ensure values are '0' or '1'
                }
            });

            const updatedSettings = { ...DEFAULT_PUSH_SETTINGS };
            allowedKeys.forEach((key) => {
                if (sanitizedSettings[key] !== undefined) {
                    updatedSettings[key] = sanitizedSettings[key];
                }
            });

            await settingsRef.set(sanitizedSettings, { merge: true });
            return updatedSettings;
        } catch (error) {
            logger.error(`Failed to update push settings for user ${this.userId}:`, error);
            throw new Error('Failed to update push settings.');
        }
    }
}