import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CommentSection from '../components/post/CommentSection.vue';
import { createTestingPinia } from '@pinia/testing';
import { useCommentStore } from '../stores/commentStore';
import { createRouter, createMemoryHistory } from 'vue-router';
import apiService from '../services/api';
import { storeToRefs, setActivePinia } from 'pinia';
import i18n from './i18n';
import { usePostStore } from '../stores/postStore';
import { useNotificationStore } from '../stores/notificationStore';

// Mock the apiService
vi.mock('../services/api');

describe('CommentSection.vue', () => {
    let router;
    let wrapper;
    let pinia;

    beforeEach(() => {
        router = createRouter({
            history: createMemoryHistory('/'),
            routes: [
                { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
                { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
            ],
        });

        // Mock router.push
        vi.spyOn(router, 'push');

        // Mock apiService.getComments to return an empty array
        apiService.getComments.mockResolvedValue({ data: [] });

        // Create a Pinia instance
        pinia = createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
        });

        // Set the active Pinia instance
        setActivePinia(pinia);

        const notificationStore = useNotificationStore();

        // Spy on showNotification
        vi.spyOn(notificationStore, 'showNotification');


        wrapper = mount(CommentSection, {
            props: {
                postId: 'post1',
            },
            global: {
                plugins: [
                    router,
                    pinia, // Pass the same Pinia instance to the component
                    i18n,  // Install i18n plugin
                ],
                stubs: {
                    // Updated the MarkdownEditor stub for Vue 3 with v-model handling
                    MarkdownEditor: {
                        props: ['modelValue'],
                        emits: ['update:modelValue'],
                        template: `
                        <textarea
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
                v-bind="$attrs"
                ></textarea>
            `,
                    },
                    CommentItem: true,
                    ErrorMessage: true,
                    RecycleScroller: true,
                    TransitionGroup: true,
                    LoaderIcon: true,
                    MessageSquareIcon: true,
                },
            },
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('1. adds a comment successfully when session token is valid', async () => {
        // Mock the API response for adding a comment
        apiService.addComment.mockResolvedValue({
            data: {
                id: '123',
                content: 'Test comment',
                user: { id: 'user1', name: 'Test User' },
            },
        });

        const commentStore = useCommentStore();
        const { comments } = storeToRefs(commentStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });

        // Wait for component to render and promises to resolve
        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');

        await wrapper.vm.$nextTick(); // Ensure DOM updates are applied

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true); // Confirm the button exists

        await addButton.trigger('click');
        await flushPromises(); // Wait for all promises

        console.debug('Comments in store after adding comment:', comments.value);

        expect(comments.value).toHaveLength(1);
        expect(comments.value[0].content).toBe('Test comment');
    });

    it('2.redirects to login when session token is invalid', async () => {
        // Mock the API response for an invalid session token
        const errorResponse = {
            response: {
                status: 401,
                data: {
                    code: 9998, // Error code for invalid or expired session token
                    message: 'Your session has expired. Please log in again.',
                },
            },
        };

        apiService.addComment.mockRejectedValue(errorResponse);

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');

        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();

        // Check that an error notification was shown
        expect(notificationStore.showNotification).toHaveBeenNthCalledWith(
            2,
            'Token is invalid.',
            'error'
        );

        // Verify the user was redirected to the login page
        expect(router.push).toHaveBeenCalledWith('/login');

        // Confirm the comment was not added to the store
        expect(comments.value).toHaveLength(0);
    });

    it('3.handles post being locked before submitting a comment', async () => {
        // Mock the API response for a locked post
        const errorResponse = {
            response: {
                status: 403,
                data: {
                    code: 1010, // Error code for post being locked
                    message: 'This post has been locked and cannot be commented on.',
                },
            },
        };

        apiService.addComment.mockRejectedValue(errorResponse);

        const commentStore = useCommentStore();
        const postStore = usePostStore(); // Import and use postStore
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);
        const { currentPost } = storeToRefs(postStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });

        // Mock the postStore's removePost method
        const removePostSpy = vi.spyOn(postStore, 'removePost').mockImplementation(() => {
            // Simulate removing the current post
            currentPost.value = null;
        });

        // Set up the current post
        currentPost.value = {
            id: 'post1',
            content: 'Sample post content',
            // ... other post properties
        };

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');

        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();

        // Check that an error notification was shown
        expect(notificationStore.showNotification).toHaveBeenNthCalledWith(
            2,
            'This action has already been performed by you.',
            'error'
        );

        // Verify that postStore.removePost was called with the correct postId
        expect(removePostSpy).toHaveBeenCalledWith('post1');

        // Ensure that currentPost is set to null, indicating the post is removed
        expect(currentPost.value).toBeNull();

        // Ensure the comment was not added
        expect(comments.value).toHaveLength(0);
    });

    it('4.redirects to login when user account is locked', async () => {
        // Mock the API response for a locked user account
        const errorResponse = {
            response: {
                status: 403,
                data: {
                    code: 9999, // Error code for account being locked
                    message: 'Your account has been locked. Please contact support.',
                },
            },
        };

        apiService.addComment.mockRejectedValue(errorResponse);

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');

        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();

        // Check that an error notification was shown
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'An unexpected error occurred. Please try again later.',
            'error'
        );

        // Verify the user was redirected to the login page
        expect(router.push).toHaveBeenCalledWith('/login');

        // Confirm the comment was not added to the store
        expect(comments.value).toHaveLength(0);
    });

    it('5. displays "Cannot connect to the Internet" when the system cannot insert comment due to DB error', async () => {
        // Mock the API response for a database error
        const errorResponse = {
            response: {
                status: 500,
                data: {
                    code: 1001, // Error code for database error
                    message: 'Cannot connect to the database.',
                },
            },
        };

        apiService.addComment.mockRejectedValue(errorResponse);

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');

        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();

        // Check that an error notification was shown
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Cannot connect to the Internet.',
            'error'
        );

        // Confirm the comment was not added
        expect(comments.value).toHaveLength(0);
    });

    it('6. displays error when the post does not exist', async () => {
        // Mock the API response for a non-existent post
        const errorResponse = {
            response: {
                status: 404,
                data: {
                    code: 9992, // Error code for post not found
                    message: 'Post does not exist.',
                },
            },
        };

        apiService.addComment.mockRejectedValue(errorResponse);

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');

        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();

        // Check that an error notification was shown
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Post does not exist.',
            'error'
        );

        // Confirm the comment was not added
        expect(comments.value).toHaveLength(0);
    });

    it('7. displays "Cannot connect to the Internet" when the Internet connection is interrupted', async () => {
        // Mock the API call to fail with a network error
        const networkError = new Error('Network Error');
        networkError.code = 'ECONNABORTED';

        apiService.addComment.mockRejectedValue(networkError);

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');

        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();

        // Check that an error notification was shown
        expect(notificationStore.showNotification).toHaveBeenCalledWith(
            'Cannot connect to the Internet.',
            'error'
        );

        // Confirm the comment was not added
        expect(comments.value).toHaveLength(0);
    });

    it('8. displays additional comments and automatically scrolls to the last comment', async () => {
        // Mock the API response for adding a comment
        apiService.addComment.mockResolvedValue({
            data: {
                id: '123',
                content: 'Test comment',
                user: { id: 'user1', name: 'Test User' },
            },
        });

        const scrollerMock = {
            scrollTop: 0,
            scrollHeight: 1000,
        };

        const querySelectorSpy = vi.spyOn(document, 'querySelector').mockReturnValue(scrollerMock);

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Mock initial comments
        comments.value = [
            {
                id: '124',
                content: 'Another new comment',
                user: { id: 'user2', name: 'Another User' },
            },
            {
                id: '125',
                content: 'Yet another new comment',
                user: { id: 'user3', name: 'Yet Another User' },
            },
        ];

        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => {
            comments.value = [];
        });

        // Spy on scrollToBottom
        const scrollToBottomSpy = vi.spyOn(wrapper.vm, 'scrollToBottom').mockImplementation(() => { });

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');

        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();


        // Verify that the comment was added to the comments list
        expect(comments.value).toHaveLength(3);
        expect(comments.value[0].content).toBe('Test comment');
        expect(comments.value[1].content).toBe('Another new comment');
        expect(comments.value[2].content).toBe('Yet another new comment');

        // Verify that scrollToBottom was called
        expect(scrollerMock.scrollTop).toBe(scrollerMock.scrollHeight);
        querySelectorSpy.mockRestore();
    });

    it('9. handles blocked users in comments returned by the API after adding a comment', async () => {
        // Mock the API response for adding a comment
        const newComment = {
            id: '126',
            content: 'Test comment',
            user: { id: 'user1', name: 'Test User' },
        };

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Existing comments including a blocked user's comment
        comments.value = [
            {
                id: '123',
                content: 'Existing comment 1',
                user: { id: 'user2', name: 'User Two' },
            },
            {
                id: '127',
                content: 'Blocked user comment',
                user: { id: 'blockedUser1', name: 'Blocked User' },
            },
        ];

        // Initially filter out blocked user's comments
        comments.value = comments.value.filter(comment => comment.user.id !== 'blockedUser1');

        // Mock `addComment` to simulate adding the new comment
        vi.spyOn(commentStore, 'addComment').mockImplementation(async (postId, content) => {
            // Simulate adding the comment
            const newComment = {
                id: '126',
                content,
                user: { id: 'user1', name: 'Test User' },
            };

            // Update comments.value, maintaining filtering
            comments.value.push(newComment);
        });

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');
        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();

        // Verify that the comment was added to the comments list
        expect(comments.value).toHaveLength(2);
        expect(comments.value[0].content).toBe('Existing comment 1');
        expect(comments.value[1].content).toBe('Test comment');

        // Ensure that blocked comments are not included
        const blockedComments = comments.value.filter(comment => comment.user.id === 'blockedUser1');
        expect(blockedComments).toHaveLength(0);

        // Verify that no error notification is shown
        expect(notificationStore.showNotification).not.toHaveBeenCalledWith(
            expect.any(String),
            'error'
        );
    });

    it('10. silently handles server error when parameters are incorrect or comment content is empty', async () => {
        // Mock the API response for an invalid parameter error
        const errorResponse = {
            response: {
                status: 400,
                data: {
                    code: 1002, // Error code for parameter is not enough
                    message: 'Parameter is not enough.',
                },
            },
        };

        apiService.addComment.mockRejectedValue(errorResponse);

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });

        await flushPromises();

        const textarea = wrapper.find('textarea');
        // Set empty comment content or incorrect parameters
        await textarea.setValue(''); // Empty content
        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        // Attempt to click the add button
        await addButton.trigger('click');
        await flushPromises();

        // Check that the application does not show an error notification
        expect(notificationStore.showNotification).not.toHaveBeenCalledWith(
            expect.any(String),
            'error'
        );

        // Ensure the comment was not added
        expect(comments.value).toHaveLength(0);

        // Optionally, verify that the input remains as is
        expect(textarea.element.value).toBe('');
    });

    it('11. handles being blocked by post owner during comment submission', async () => {
        // Mock the API response for being blocked
        const errorResponse = {
            response: {
                status: 403,
                data: {
                    code: 1009, // Error code for not access
                    message: 'You do not have permission to access this resource.',
                },
            },
        };

        apiService.addComment.mockRejectedValue(errorResponse);

        const commentStore = useCommentStore();
        const postStore = usePostStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);
        const { currentPost } = storeToRefs(postStore);

        // Mock fetchComments and resetComments
        vi.spyOn(commentStore, 'fetchComments').mockResolvedValue([]);
        vi.spyOn(commentStore, 'resetComments').mockImplementation(() => { });
        const removePostSpy = vi.spyOn(postStore, 'removePost');

        await flushPromises();

        const textarea = wrapper.find('textarea');
        await textarea.setValue('Test comment');
        await wrapper.vm.$nextTick();

        const addButton = wrapper.find('button[data-testid="add-comment-button"]');
        expect(addButton.exists()).toBe(true);

        await addButton.trigger('click');
        await flushPromises();

        // Verify that the comment section is hidden
        expect(wrapper.find('.comment-section').exists()).toBe(false);

        // Verify that the post was removed from the store
        expect(removePostSpy).toHaveBeenCalledWith('post1');
        expect(currentPost.value).toBeNull();

        // Ensure the comment was not added
        expect(comments.value).toHaveLength(0);

        // Verify that no error notification is shown (since the application handles it)
        expect(notificationStore.showNotification).not.toHaveBeenCalledWith(
            expect.any(String),
            'error'
        );
    });

    it('12. handles being blocked by another commenter during comment submission', async () => {
        // Mock the API response for adding a comment
        const newComment = {
            id: '126',
            content: 'Test comment',
            user: { id: 'user1', name: 'Test User' },
        };
        apiService.addComment.mockResolvedValue({
            data: newComment,
        });

        const commentStore = useCommentStore();
        const notificationStore = useNotificationStore();
        const { comments } = storeToRefs(commentStore);

        // Existing comments including the user who will block the current user
        comments.value = [
            newComment,
            {
                id: '123',
                content: 'Existing comment 1',
                user: { id: 'user2', name: 'User Two' },
            },
            // The comment from 'blockingUser' is omitted
        ];

        // Mock fetchComments to return comments excluding the blocking user's comments
        vi.spyOn(commentStore, 'addComment').mockImplementation(async (postId, content) => {
            // Simulate adding the comment
            const newComment = {
                id: '126',
                content,
                user: { id: 'user1', name: 'Test User' },
            };

            await flushPromises();

            const textarea = wrapper.find('textarea');
            await textarea.setValue('Test comment');
            await wrapper.vm.$nextTick();

            const addButton = wrapper.find('button[data-testid="add-comment-button"]');
            expect(addButton.exists()).toBe(true);

            await addButton.trigger('click');
            await flushPromises();

            // Verify that the blocking user's comment is no longer present
            const blockingUserComments = comments.value.filter(comment => comment.user.id === 'blockingUser');
            expect(blockingUserComments).toHaveLength(0);

            // Ensure that other comments remain visible
            expect(comments.value).toHaveLength(2);
            expect(comments.value[0].content).toBe('Test comment');
            expect(comments.value[1].content).toBe('Existing comment 1');

            // Verify that no error notification is shown (since the application handles it)
            expect(notificationStore.showNotification).not.toHaveBeenCalledWith(
                expect.any(String),
                'error'
            );
        });
    });
});
