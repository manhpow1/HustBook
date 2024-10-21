import { mount, RouterLinkStub } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createI18n } from 'vue-i18n';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory, useRouter } from 'vue-router';
import { ref } from 'vue';
import CommentSection from '../components/post/CommentSection.vue';
import CommentItem from '../components/shared/CommentItem.vue';
import { useCommentStore } from '../stores/commentStore';
import { useNotificationStore } from '../stores/notificationStore';
import flushPromises from 'flush-promises';
import * as errorHandler from '../utils/errorHandler';

// Mock setup
const pushMock = vi.fn();
const fetchComments = vi.fn();
let commentStore;
let notificationStore;
let handleErrorSpy;

vi.mock('vue-router', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useRouter: () => ({
            push: pushMock, // Mock the push method
        }),
    };
});

// Router Setup
const routes = [
    { path: '/login', name: 'Login', component: { template: '<div />' } },
    { path: '/', name: 'Home', component: { template: '<div />' } },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Mock Comment Store
vi.mock('../stores/commentStore', () => ({
    useCommentStore: () => ({
        fetchComments,
        comments: ref([
            { id: '1', content: 'Test comment 1', user: { name: 'User 1', avatar: 'avatar1.png' } },
            { id: '2', content: 'Test comment 2', user: { name: 'User 2', avatar: 'avatar2.png' } },
        ]),
        addComment: vi.fn(),
        resetComments: vi.fn(),
    }),
}));

// i18n setup
const messages = {
    en: {
        writeComment: 'Write a comment',
        characterCount: 'Characters remaining: {count}',
        postComment: 'Post Comment',
        comment: 'Comment',
        comments: 'Comments',
        loadMoreComments: 'Load more comments',
        commentAdded: 'Comment added',
        errorAddingComment: 'Error adding comment',
        beFirstToComment: 'Be the first to comment',
        retryAction: 'Retry Action',
        retry: 'Retry',
        noInternetConnection: 'Unable to connect to the Internet',
        postNotFound: 'The post does not exist',
        like: 'Like',
        likes: 'Likes',
        edit: 'Edit',
        delete: 'Delete',
    },
};

const i18n = createI18n({
    locale: 'en',
    messages,
});

const mountComponent = () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(CommentSection, {
        props: { postId: 'post123' },
        global: {
            plugins: [pinia, router, i18n],
            stubs: {
                RouterLink: RouterLinkStub,
            },
        },
    });
};

describe('CommentSection.vue', () => {
    beforeEach(() => {
        // Initialize stores and spies before each test
        const pinia = createPinia();
        setActivePinia(pinia);
        commentStore = useCommentStore();
        notificationStore = useNotificationStore();
        handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(() => Promise.resolve());

        vi.clearAllMocks();
        commentStore.fetchComments.mockReset();
        commentStore.addComment.mockReset();
    });

    it('1. should retrieve and display comments successfully', async () => {
        fetchComments.mockResolvedValueOnce([
            { id: '1', content: 'Test comment 1', user: { name: 'User 1', avatar: 'avatar1.png' } },
            { id: '2', content: 'Test comment 2', user: { name: 'User 2', avatar: 'avatar2.png' } },
        ]);

        const wrapper = mountComponent();

        await flushPromises();
        await wrapper.vm.$nextTick();

        const commentItems = wrapper.findAllComponents(CommentItem);

        console.debug('Number of comment items:', commentItems.length);

        expect(commentItems.length).toBe(2);
        expect(commentItems[0].props('comment').content).toBe('Test comment 1');
        expect(commentItems[1].props('comment').content).toBe('Test comment 2');
    });

    it('2. should call handleError and navigate to /login on 401 error', async () => {
        const error = { response: { status: 401 } };
        fetchComments.mockRejectedValueOnce(error);

        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(async (err, r) => {
            console.debug('Inside mocked handleError with:', err, r);
            await r.push('/login');
            return Promise.resolve();
        });

        const wrapper = mountComponent();

        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Verifying if handleError was called with:', error);
        expect(handleErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ response: { status: 401 } }),
            expect.any(Object)
        );

        console.debug('Checking if router.push("/login") was called.');
        await flushPromises();
        expect(pushMock).toHaveBeenCalledWith('/login');

        console.debug('Test passed: router.push("/login") was called after 401 error.');
    });

    it('3. should hide the post on receiving 1010 error', async () => {
        console.debug('Setting up test for 1010 error.');

        // Mock the fetchComments to reject with a 1010 error
        commentStore.fetchComments.mockRejectedValueOnce({
            response: { data: { code: 1010 } }
        });

        console.debug('Mounting the component...');
        const wrapper = mountComponent();

        await flushPromises();
        await wrapper.vm.$nextTick(); // Ensure Vue updates the DOM

        console.debug('Checking if the comment section exists.');
        const commentSectionExists = wrapper.find('.comment-section').exists();
        console.debug('Comment section exists:', commentSectionExists);

        // Updated assertion
        expect(commentSectionExists).toBe(false);
        console.debug('Test passed: Comment section is hidden on 1010 error.');
    });
});