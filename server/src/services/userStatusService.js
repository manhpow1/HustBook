import { createError } from '../utils/customError.js';
import notificationService from './notificationService.js';
import userService from './userService.js';
// If you have a message service, import it as well.
// For now, we assume a method getUnreadMessagesCount exists in userService or a related service.

class userStatusService {
    async getUserStatus(userId) {
        const user = await userService.getUserById(userId);
        if (!user) {
            throw createError('9995', 'User not found.');
        }

        // Check if user is blocked or active
        const userActive = user.isBlocked ? '0' : '1';

        // Get unread notifications count
        const unreadNotifications = await notificationService.getUnreadNotificationsCount(userId);

        // Get unread messages count (implement this method in userService or another service)
        const unreadMessages = await this.getUnreadMessagesCount(userId);

        return {
            User: {
                userId: user.userId,
                active: userActive
            },
            badge: unreadNotifications.toString(),
            unread_message: unreadMessages.toString(),
            now: new Date().toISOString()
        };
    }

    async getUnreadMessagesCount(userId) {
        // Implement logic to get the number of unread messages.
        // Placeholder implementation:
        return 0;
    }
}

export default new userStatusService();