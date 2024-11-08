import { mount } from '@vue/test-utils';
import NewItemsNotification from '../components/notification/NewItemsNotification.vue';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useNotificationStore } from '../stores/notificationStore';
import { usePostStore } from '../stores/postStore';
import apiService from '../services/api';
import { storeToRefs } from 'pinia';

vi.mock('../services/api');

describe('NewItemsNotification.vue', () => {
    let wrapper;
    let notificationStore;
    let postStore;
    let notificationStoreRefs;

    beforeEach(() => {
        wrapper = mount(NewItemsNotification, {
            global: {
                plugins: [
                    createTestingPinia({
                        createSpy: vi.fn,
                        stubActions: false,
                        initialState: {
                            post: {
                                posts: [{ id: '123' }], // Initialize with one post
                                categoryId: '1',
                            },
                            notification: {
                                newItemsCount: 0,
                            },
                        },
                    }),
                ],
            },
        });
        notificationStore = useNotificationStore();
        postStore = usePostStore();

        // Get reactive references
        notificationStoreRefs = storeToRefs(notificationStore);

        // Reset mocks
        vi.clearAllMocks();
    });

    it('Test case 1: Displays notification when newItemsCount > 0', async () => {
        notificationStore.newItemsCount = 5;
        await wrapper.vm.$nextTick();
        expect(wrapper.text()).toContain('5 new items available. Click to refresh.');
    });

    it('Test case 3: Does not break when new_items is invalid', async () => {
        notificationStore.newItemsCount = null;
        await wrapper.vm.$nextTick();
        expect(wrapper.html()).not.toContain('new items available');
    });

    it('Test case 4: Still checks for new items even when user is not on the home screen', async () => {
        const checkForNewItemsSpy = vi.spyOn(wrapper.vm, 'checkForNewItems');

        await wrapper.vm.checkForNewItems();

        expect(checkForNewItemsSpy).toHaveBeenCalled();
    });

    it('Test case 5: User has been redirected to login, should not process returned data', async () => {
        // Mock apiService.checkNewItems to simulate token invalid error
        apiService.checkNewItems.mockResolvedValue({
            code: '9998',
            message: 'Token is invalid',
        });

        await wrapper.vm.checkForNewItems();

        expect(notificationStore.newItemsCount).toBe(0);
        expect(notificationStoreRefs.error.value).toBe('Token is invalid');
    });

    it('Test case 6: Server error occurs while checking for new items', async () => {
        apiService.checkNewItems.mockRejectedValue(new Error('Server error'));

        await wrapper.vm.checkForNewItems();

        expect(notificationStoreRefs.error.value).toBe('Failed to check for new items');
    });

    it('Test case 7: Handles network disconnection', async () => {
        const networkError = new Error('Network Error');
        apiService.checkNewItems.mockRejectedValue(networkError);

        await wrapper.vm.checkForNewItems();

        expect(notificationStoreRefs.error.value).toBe('Failed to check for new items');
    });

    it('Clicking the notification fetches new posts and resets newItemsCount', async () => {
        notificationStoreRefs.newItemsCount.value = 3;
        await wrapper.vm.$nextTick();

        postStore.fetchPosts = vi.fn().mockResolvedValue();
        notificationStore.resetNewItemsCount = vi.fn();

        const notificationDiv = wrapper.find('div[role="alert"]');
        expect(notificationDiv.exists()).toBe(true);

        await notificationDiv.trigger('click');

        expect(postStore.fetchPosts).toHaveBeenCalled();
        expect(notificationStore.resetNewItemsCount).toHaveBeenCalled();
    });
});
