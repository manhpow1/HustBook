import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DeletePost from '../components/post/DeletePost.vue';
import apiService from '../services/api';
import { createPinia, setActivePinia } from 'pinia';
import { useNotificationStore } from '../stores/notificationStore';
import { createRouter, createWebHistory } from 'vue-router';

// Mock the API service
vi.mock('../services/api');

describe('DeletePost Component', () => {
    let wrapper;
    let mockRouter;
    let showNotificationSpy;
    let pinia;

    beforeEach(() => {
        // Initialize Pinia
        pinia = createPinia();
        setActivePinia(pinia);

        // Set up router with the necessary routes
        mockRouter = createRouter({
            history: createWebHistory(),
            routes: [
                { path: '/', name: 'Home', component: { template: '<div>Home</div>' } }, // Mock Home component
                { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } }, // Mock Login component
            ],
        });

        const pushSpy = vi.spyOn(mockRouter, 'push');

        // Set up notification store spy
        const notificationStore = useNotificationStore();
        showNotificationSpy = vi.spyOn(notificationStore, 'showNotification');

        // Mount the DeletePost component
        wrapper = mount(DeletePost, {
            global: {
                plugins: [pinia, mockRouter],
            },
            props: {
                postId: 'valid-post-id', // Use a valid post ID for testing
            },
        });

        // Mock the router for the component
        wrapper.vm.$router = mockRouter;
        wrapper.vm.$router.push = pushSpy;
    });

    it('1. Successfully deletes post with valid session and post ID', async () => {
        apiService.deletePost.mockResolvedValue({ data: { code: '1000', message: 'OK' } });

        await wrapper.vm.confirmDelete();

        expect(apiService.deletePost).toHaveBeenCalledWith('valid-post-id');
        expect(wrapper.vm.$router.push).toHaveBeenCalledWith({ name: 'Home' });
    });

    it('2. Shows notification and redirects to login with an invalid session token', async () => {
        apiService.deletePost.mockRejectedValue({ response: { status: 401, data: { code: '9998', message: 'Token is invalid' } } });

        await wrapper.vm.confirmDelete();

        expect(showNotificationSpy).toHaveBeenCalledWith('Your session has expired. Please log in again.', 'error');
        expect(wrapper.vm.$router.push).toHaveBeenCalledWith('/login');
    });

    it('3. Shows notification when post is locked due to community standards', async () => {
        apiService.deletePost.mockRejectedValue({ response: { data: { code: '9992', message: 'Post is not available' } } });

        await wrapper.vm.confirmDelete();

        expect(showNotificationSpy).toHaveBeenCalledWith('The post you are looking for does not exist.', 'error');
    });

    it('4. Shows notification and redirects to login when user account is locked', async () => {
        apiService.deletePost.mockRejectedValue({ response: { status: 403, data: { code: '1009', message: 'User account is locked' } } });

        await wrapper.vm.confirmDelete();

        expect(showNotificationSpy).toHaveBeenCalledWith('You do not have permission to access this resource.', 'error');
        expect(wrapper.vm.$router.push).toHaveBeenCalledWith('/login');
    });

    it('5. Shows notification when system is unable to delete post', async () => {
        apiService.deletePost.mockRejectedValue({ response: { status: 500, data: { code: '1001', message: 'Can not connect to DB' } } });

        await wrapper.vm.confirmDelete();

        expect(showNotificationSpy).toHaveBeenCalledWith('Unable to connect to the database. Please try again later.', 'error');
    });

    it('6. Shows notification for invalid post ID', async () => {
        apiService.deletePost.mockRejectedValue({ response: { data: { code: '1004', message: 'Invalid post ID' } } });

        await wrapper.vm.confirmDelete();

        expect(showNotificationSpy).toHaveBeenCalledWith('Invalid input value. Please check your entries.', 'error');
    });

    it('7. Shows network error notification when internet connection is lost', async () => {
        const networkError = new Error('Network Error');
        networkError.request = {};
        apiService.deletePost.mockRejectedValue(networkError);

        await wrapper.vm.confirmDelete();

        expect(showNotificationSpy).toHaveBeenCalledWith('Unable to connect to the server. Please check your internet connection.', 'error');
    });
});
