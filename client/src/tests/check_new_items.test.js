import { setActivePinia, createPinia } from 'pinia';
import { useNotificationStore } from '../stores/notificationStore';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import apiService from '../services/api';
import { handleError } from '../utils/errorHandler';
import router from '../router';

vi.mock('../services/api');
vi.mock('../utils/errorHandler', () => ({
    handleError: vi.fn().mockResolvedValue(),
}));
vi.mock('../router', () => ({
    default: {
        push: vi.fn(),
    },
}));

describe('notificationStore', () => {
    let notificationStore;

    beforeEach(() => {
        setActivePinia(createPinia());
        notificationStore = useNotificationStore();
        vi.clearAllMocks();
    });

    it('Test case 1: User passes correct last_id and category_id in correct format', async () => {
        apiService.checkNewItems.mockResolvedValue({
            code: '1000',
            data: {
                new_items: '5'
            }
        });

        await notificationStore.checkNewItems('123', '1');

        expect(notificationStore.newItemsCount).toBe(5);
        expect(notificationStore.error).toBeNull();
    });

    it('Test case 2: User sends incorrect last_id or category_id', async () => {
        process.env.NODE_ENV = 'production';

        apiService.checkNewItems.mockResolvedValue({
            code: '1002',
            message: 'Parameter is not enough'
        });

        await notificationStore.checkNewItems(null, '1');

        expect(notificationStore.error).toBe('Parameter is not enough');
        expect(notificationStore.newItemsCount).toBe(0);
        expect(handleError).not.toHaveBeenCalled();

        process.env.NODE_ENV = 'development';

        await notificationStore.checkNewItems(null, '1');

        expect(notificationStore.error).toBe('Parameter is not enough');
        expect(notificationStore.newItemsCount).toBe(0);
        expect(handleError).toHaveBeenCalled();
    });

    it('Test case 3: User passes valid parameters but the returned new_items value is invalid', async () => {
        apiService.checkNewItems.mockResolvedValue({
            code: '1000',
            data: {
                new_items: null
            }
        });

        await notificationStore.checkNewItems('123', '1');

        expect(notificationStore.newItemsCount).toBe(0);
        expect(notificationStore.error).toBeNull();
    });

    it('Test case 4: User passes valid parameters but user is not on the home screen', async () => {
        // Since route handling is outside the store, we can only ensure checkNewItems works
        apiService.checkNewItems.mockResolvedValue({
            code: '1000',
            data: {
                new_items: '2'
            }
        });

        await notificationStore.checkNewItems('123', '1');

        expect(notificationStore.newItemsCount).toBe(2);
        expect(notificationStore.error).toBeNull();
    });

    it('Test case 5: User passes valid parameters but user has been pushed to login page', async () => {
        apiService.checkNewItems.mockResolvedValue({
            code: '9998',
            message: 'Token is invalid'
        });

        await notificationStore.checkNewItems('123', '1');

        expect(notificationStore.newItemsCount).toBe(0);
        expect(notificationStore.error).toBe('Token is invalid');
        expect(handleError).toHaveBeenCalled();
    });

    it('Test case 6: Server error occurs while fetching new_items', async () => {
        const serverError = new Error('Server error');
        apiService.checkNewItems.mockRejectedValue(serverError);

        await notificationStore.checkNewItems('123', '1');

        expect(notificationStore.newItemsCount).toBe(0);
        expect(notificationStore.error).toBe('Failed to check for new items');
        expect(handleError).toHaveBeenCalledWith(serverError, router);
    });

    it('Test case 7: Network is disconnected during checking process', async () => {
        const networkError = new Error('Network Error');
        apiService.checkNewItems.mockRejectedValue(networkError);

        await notificationStore.checkNewItems('123', '1');

        expect(notificationStore.newItemsCount).toBe(0);
        expect(notificationStore.error).toBe('Failed to check for new items');
        expect(handleError).toHaveBeenCalledWith(networkError, router);
    });
});
