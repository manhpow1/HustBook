import { initializeFirebase } from '../config/firebase';
import logger from '../utils/logger';

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

    async getSettingsRef() {
        let db = await initializeFirebase();
        return db.collection('pushSettings').doc(this.userId);
    }

    async getSettings() {
        try {
            const settingsRef = await this.getSettingsRef();
            const doc = await settingsRef.get();
            if (doc.exists) {
                return doc.data();
            } else {
                // Initialize with default settings if none exist
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
            const settingsRef = await this.getSettingsRef();
            // Filter out invalid keys to prevent unwanted data insertion
            const allowedKeys = Object.keys(DEFAULT_PUSH_SETTINGS);
            const sanitizedSettings = {};
            allowedKeys.forEach((key) => {
                if (settings.hasOwnProperty(key)) {
                    sanitizedSettings[key] = settings[key] === '0' ? '0' : '1'; // Ensure values are '0' or '1'
                }
            });
            // Merge the sanitized settings with existing settings
            await settingsRef.set(sanitizedSettings, { merge: true });
            // Combine existing settings with the new settings for immediate feedback
            const updatedSettings = { ...DEFAULT_PUSH_SETTINGS, ...sanitizedSettings };
            return updatedSettings;
        } catch (error) {
            logger.error(`Failed to update push settings for user ${this.userId}:`, error);
            throw new Error('Failed to update push settings.');
        }
    }
}
