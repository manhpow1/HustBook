const { db } = require('../config/firebase');

class PushSettings {
    constructor(userId) {
        this.userId = userId;
        this.settingsRef = db.collection('pushSettings').doc(userId);
    }

    // Get push settings for the user
    async getSettings() {
        const doc = await this.settingsRef.get();
        if (doc.exists) {
            return doc.data();
        } else {
            // Return default settings if none exist
            return {
                like_comment: '1',
                from_friends: '1',
                requested_friend: '1',
                suggested_friend: '1',
                birthday: '1',
                video: '1',
                report: '1',
                notification_on: '1',
            };
        }
    }

    // Update push settings for the user
    async updateSettings(settings) {
        const validSettings = {
            like_comment: settings.like_comment || '1',
            from_friends: settings.from_friends || '1',
            requested_friend: settings.requested_friend || '1',
            suggested_friend: settings.suggested_friend || '1',
            birthday: settings.birthday || '1',
            video: settings.video || '1',
            report: settings.report || '1',
            notification_on: settings.notification_on || '1',
        };
        await this.settingsRef.set(validSettings, { merge: true });
        return validSettings;
    }
}

module.exports = PushSettings;