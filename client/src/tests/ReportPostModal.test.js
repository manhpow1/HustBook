import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axiosInstance from '../services/axiosInstance';
import ReportPostModal from '../components/post/ReportPostModal.vue';
import { useNotificationStore } from '../stores/notificationStore';
import { createRouter, createWebHistory } from 'vue-router';
import { createI18n } from 'vue-i18n';
import { createPinia, setActivePinia } from 'pinia';
import { handleError } from '../utils/errorHandler';

// Mock errorHandler with additional debug
vi.mock('../utils/errorHandler', () => ({
    handleError: vi.fn(async (error, router) => {
        console.log('[DEBUG] handleError called with:', error);
        if (error.response?.status === 401) {
            console.log('[DEBUG] Calling router.push("/login").');
            await router.push('/login');
        }
    }),
}));

// Mock API service
vi.mock('../services/api', () => ({
    default: {
        reportPost: vi.fn(),
    },
}));

let router, i18n, pinia, mockAxios;

beforeAll(() => {
    i18n = createI18n({
        locale: 'en',
        messages: {
            en: {
                reportPost: 'Report Post',
                selectReason: 'Select a Reason',
                selectReasonPlaceholder: 'Please select a reason',
                cancel: 'Cancel',
                reasonOptions: {
                    spam: 'Spam',
                    inappropriateContent: 'Inappropriate Content',
                    harassment: 'Harassment',
                    hateSpeech: 'Hate Speech',
                    violence: 'Violence',
                    other: 'Other',
                },
                submitReport: 'Submit Report',
                submitting: 'Submitting...',
                reportSubmittedSuccess: 'Report submitted successfully.',
                databaseError: 'Unable to connect to the database. Please try again later.',
                postNotFound: 'The post you are looking for does not exist.', // Added this line
            },
        },
    });

    pinia = createPinia();
    setActivePinia(pinia);

    router = createRouter({
        history: createWebHistory(),
        routes: [
            { path: '/', component: { template: '<div>Home</div>' } },
            { path: '/login', component: { template: '<div>Login</div>' } },
        ],
    });

    vi.spyOn(router, 'push').mockImplementation((path) => {
        console.log(`[DEBUG] router.push called with: ${path}`);
        return Promise.resolve();
    });
});

describe('ReportPostModal.vue', () => {
    let wrapper, notificationStore, apiService;

    beforeEach(async () => {
        mockAxios = new MockAdapter(axiosInstance);
        notificationStore = useNotificationStore();
        vi.spyOn(notificationStore, 'showNotification').mockImplementation(() => { });
        apiService = (await import('../services/api')).default;

        wrapper = mount(ReportPostModal, {
            global: {
                plugins: [i18n, pinia, router],
                mocks: { $router: router }, // Ensure router injection
            },
            props: { postId: 123 },
        });

        await flushPromises();
    });

    afterEach(() => {
        vi.clearAllMocks();
        mockAxios.resetHandlers();
        wrapper.unmount();
    });

    it('Submits the report successfully (case 1)', async () => {
        apiService.reportPost.mockResolvedValueOnce({ data: { code: '1000' } });

        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Report submitted successfully.',
            'success'
        );
    });

    it('Submits the report successfully (case 1)', async () => {
        apiService.reportPost.mockResolvedValueOnce({ data: { code: '1000' } });

        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Report submitted successfully.',
            'success'
        );
    });

    it('Redirects to login on invalid session token (case 2)', async () => {
        const error = { response: { status: 401, data: { code: 9998 } } };
        apiService.reportPost.mockRejectedValueOnce(error);

        console.log('[DEBUG] Triggering report submission with invalid session.');
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();  // Ensure async tasks are completed.

        // Confirm handleError was called
        expect(handleError).toHaveBeenCalledWith(error, router);

        // Ensure router.push('/login') was called
        console.log('[DEBUG] Checking router.push("/login") call.');
        const pushCalls = router.push.mock.calls;
        console.log('[DEBUG] router.push call history:', pushCalls);

        expect(pushCalls).toEqual([['/login']]);
    });

    it('Handles locked post error and removes post (case 3)', async () => {
        const error = { response: { status: 423, data: { code: 1010 } } };
        apiService.reportPost.mockRejectedValueOnce(error);

        console.log('[DEBUG] Triggering report submission with locked post.');
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        // Check if 'post-removed' event was emitted
        expect(wrapper.emitted()).toHaveProperty('post-removed');
    });

    it('Redirects to login on account lockout (case 4)', async () => {
        const error = { response: { status: 401, data: { code: 9995 } } };
        apiService.reportPost.mockRejectedValueOnce(error);

        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        expect(handleError).toHaveBeenCalledWith(error, router);
        expect(router.push).toHaveBeenCalledWith('/login');
    });

    it('Handles database error gracefully (case 5)', async () => {
        const error = { response: { status: 500, data: { code: 1001 } } };
        apiService.reportPost.mockRejectedValueOnce(error);

        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        console.log('[DEBUG] Checking handleError call for database error.');
        expect(handleError).toHaveBeenCalledWith(error, router);

        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Unable to connect to the database. Please try again later.',
            'error'
        );
    });

    it('Notifies when the post does not exist (case 6)', async () => {
        const error = { response: { status: 404, data: { code: 9992 } } };
        apiService.reportPost.mockRejectedValueOnce(error);

        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        console.log('[DEBUG] Checking handleError call for post not found.');
        expect(handleError).toHaveBeenCalledWith(error, router);

        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'The post you are looking for does not exist.',
            'error'
        );
    });

    it('Handles network error gracefully (case 7)', async () => {
        const error = new Error('Network Error');
        apiService.reportPost.mockRejectedValueOnce(error);

        console.log('[DEBUG] Simulating network error.');
        await wrapper.find('#reason').setValue('spam');
        await wrapper.find('form').trigger('submit.prevent');
        await flushPromises();

        // Check if correct network error message is shown
        expect(notificationStore.showNotification).toHaveBeenCalledWith('Network Error', 'error');
    });
});