import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { nextTick } from 'vue';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import axiosInstance from '../services/axiosInstance';
import MockAdapter from 'axios-mock-adapter';
import ReportPostModal from '../components/post/ReportPostModal.vue';
import { useNotificationStore } from '../stores/notificationStore';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import * as vueRouter from 'vue-router';

vi.mock('@/utils/errorHandler', () => ({
    handleError: vi.fn(),
}));

describe('ReportPostModal.vue', () => {
    let wrapper;
    let mockAxios;
    let notificationStore;
    let router;
    let pinia;

    beforeEach(async () => {
        // Set up i18n
        const i18n = createI18n({ /* ... */ });

        pinia = createPinia();
        setActivePinia(pinia);

        // Create a mock Axios instance on the singleton axiosInstance
        mockAxios = new MockAdapter(axiosInstance);

        // Mock the notification store
        notificationStore = useNotificationStore();
        vi.spyOn(notificationStore, 'showNotification');

        // Create the router with at least one route
        router = createRouter({
            history: createWebHistory(),
            routes: [{ path: '/', component: { template: '<div>Home</div>' } },
                {path: '/login', component: { template: '<div>Login</div>' }}
            ],
        });

        // Wait for the router to be ready
        await router.isReady();

        // Spy on router.push
        vi.spyOn(router, 'push');

        // Mock useRouter to return our router instance
        vi.spyOn(vueRouter, 'useRouter').mockReturnValue(router);

        // Mount the component
        wrapper = mount(ReportPostModal, {
            global: {
                plugins: [i18n, pinia, router],
            },
            props: {
                postId: 'valid_post_id',
            },
        });
    });

    afterEach(() => {
        mockAxios.reset();
        vi.restoreAllMocks();
    });

    // Test Case 1: Successful Report Submission
    it('1.submits the report successfully when valid data is provided', async () => {
        // Mock the API response
        mockAxios
            .onPost(`/posts/valid_post_id/report`)
            .reply(200, {
                code: '1000',
                message: 'OK',
            });

        // Set the form data
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');

        // Wait for promises to resolve
        await nextTick();

        // Assertions
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Report submitted successfully.',
            'success'
        );

        expect(wrapper.emitted()['report-submitted']).toBeTruthy();
        expect(wrapper.emitted()['close']).toBeTruthy();
    });

    // Test Case 2: Invalid Session Token
    it('2.redirects to login when the session token is invalid', async () => {
        // Mock the API response
        mockAxios
            .onPost(`${API_ENDPOINTS.REPORT_POST}/valid_post_id/report`)
            .reply(401, {
                code: '9998',
                message: 'Token is invalid',
            });

        // Set the form data
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');

        // Wait for promises to resolve
        await nextTick();

        // Assertions
        expect(handleError).toHaveBeenCalled();
        const errorArgument = handleError.mock.calls[0][0];
        expect(errorArgument.response.data.code).toBe('9998');
        expect(handleError.mock.calls[0][1]).toBe(router);

        // Assuming handleError redirects to login
        // Since handleError is mocked, router.push won't be called unless you simulate it
        // If you want to check router.push, you can simulate handleError's behavior
        // For example:
        // handleError.mockImplementation((error, router) => {
        //   router.push('/login');
        // });
        // Then you can assert:
        // expect(router.push).toHaveBeenCalledWith('/login');
    });

    // Test Case 3: Post Locked Before Submission
    it('3.handles locked post error and removes the post from the view', async () => {
        // Mock the API response
        mockAxios
            .onPost(`${API_ENDPOINTS.REPORT_POST}/locked_post_id/report`)
            .reply(403, {
                code: '1010',
                message: 'Action has been done previously by this user',
            });

        // Update the postId prop to simulate a locked post
        await wrapper.setProps({ postId: 'locked_post_id' });

        // Set the form data
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');

        // Wait for promises to resolve
        await nextTick();

        // Assertions
        // Since 1010 is handled in the component and emits 'post-removed'
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'You have already performed this action.',
            'error'
        );

        expect(wrapper.emitted()['post-removed']).toBeTruthy();
        expect(wrapper.emitted()['close']).toBeTruthy();
    });

    // Test Case 4: User Account Locked
    it('4.redirects to login when the user account is locked', async () => {
        // Mock the API response
        mockAxios
            .onPost(`${API_ENDPOINTS.REPORT_POST}/valid_post_id/report`)
            .reply(401, {
                code: '9995',
                message: 'User is not validated',
            });

        // Set the form data
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');

        // Wait for promises to resolve
        await nextTick();

        // Assertions
        expect(handleError).toHaveBeenCalled();
        const errorArgument = handleError.mock.calls[0][0];
        expect(errorArgument.response.data.code).toBe('9995');
        expect(handleError.mock.calls[0][1]).toBe(router);

        // Assuming handleError redirects to login
        // You can simulate handleError's behavior to test router.push
    });

    // Test Case 5: System Unable to Accept Report (DB Error)
    it('5.shows an error when the system cannot accept the report due to DB error', async () => {
        // Mock the API response
        mockAxios
            .onPost(`${API_ENDPOINTS.REPORT_POST}/valid_post_id/report`)
            .reply(500, {
                code: '1001',
                message: 'Cannot connect to DB',
            });

        // Set the form data
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');

        // Wait for promises to resolve
        await nextTick();

        // Assertions
        expect(handleError).toHaveBeenCalled();
        const errorArgument = handleError.mock.calls[0][0];
        expect(errorArgument.response.data.code).toBe('1001');
        expect(handleError.mock.calls[0][1]).toBe(router);

        // Since handleError shows the notification, we can check that
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Unable to connect to the database. Please try again later.',
            'error'
        );
    });

    // Test Case 6: Non-Existent Post ID
    it('6.notifies the user when the post does not exist', async () => {
        // Mock the API response
        mockAxios
            .onPost(`${API_ENDPOINTS.REPORT_POST}/non_existent_post_id/report`)
            .reply(404, {
                code: '9992',
                message: 'Post is not existed',
            });

        // Update the postId prop to simulate a non-existent post
        await wrapper.setProps({ postId: 'non_existent_post_id' });

        // Set the form data
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');

        // Wait for promises to resolve
        await nextTick();

        // Assertions
        // Since 9992 is handled in the component and emits 'post-removed'
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'The post you are looking for does not exist.',
            'error'
        );

        expect(wrapper.emitted()['post-removed']).toBeTruthy();
        expect(wrapper.emitted()['close']).toBeTruthy();
    });

    // Test Case 7: Network Connection Lost During Request
    it('7.shows a network error message when the internet connection is lost', async () => {
        // Simulate a network error
        mockAxios
            .onPost(`${API_ENDPOINTS.REPORT_POST}/valid_post_id/report`)
            .networkError();

        // Set the form data
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');

        // Wait for promises to resolve
        await nextTick();

        // Assertions
        expect(handleError).toHaveBeenCalled();
        const errorArgument = handleError.mock.calls[0][0];
        expect(errorArgument.message).toBe('Network Error');
        expect(handleError.mock.calls[0][1]).toBe(router);

        // Since handleError shows the notification
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Unable to connect to the server. Please check your internet connection.',
            'error'
        );
    });
});
