// src/tests/set_comment.test.js

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import CommentSection from '../components/post/CommentSection.vue'; // Adjust the path as needed
import { useCommentStore } from '../stores/commentStore';
import { useUserStore } from '../stores/userStore';
import { useNotificationStore } from '../stores/notificationStore';
import apiService from '../services/api'; // Ensure this is the correct path and default export
import i18n from './i18n'; // Ensure the correct path
import { createRouter, createMemoryHistory } from 'vue-router';

describe('CommentSection.vue', () => {
    // Declare variables with 'let' to allow reassignment
    let wrapper,
        commentStore,
        userStore,
        notificationStore,
        router,
        mockPush,
        scrollTopSpy,
        querySelectorSpy,
        mockScroller,
        addCommentMock,
        getCommentsMock,
        newComment; // Ensure this is declared

    // Factory function to mount the component
    const mountComponent = () => {
        // Mock Vue Router's push method
        mockPush = vi.fn().mockResolvedValue(true);

        // Create a mock router instance with /login route
        router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } }, // Define /login route
                { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
                // ... other routes if needed
            ],
        });
        router.push = mockPush;

        // Define a fixed timestamp
        const fixedDate = '2024-10-23T10:53:34.382Z';

        // Define the new comment with the fixed timestamp
        newComment = {
            id: 'comment123',
            content: 'This is a test comment.',
            user: { id: 'user123', name: 'Test User' },
            createdAt: fixedDate,
        };

        // Create a testing Pinia instance with correct initialState for ref properties
        const pinia = createTestingPinia({
            initialState: {
                comment: {
                    comments: [], // Correctly initialize ref
                    commentError: null,
                    hasMoreComments: false,
                    loadingComments: false,
                },
                user: {
                    user: { id: 'user123', name: 'Test User' },
                    token: 'valid-token',
                    deviceToken: 'device-token',
                    isLoggedIn: true,
                },
                notification: {},
            },
            stubActions: false, // Allow actions to run normally
        });

        // Access the stores
        commentStore = useCommentStore();
        userStore = useUserStore();
        notificationStore = useNotificationStore();

        // Create a spy for scrollTop to verify scrollToBottom is called
        scrollTopSpy = vi.fn();

        // Mock the scroller element with necessary properties and methods
        mockScroller = {
            scrollHeight: 1000,
            clientHeight: 500,
            scrollTop: 0,
            addEventListener: vi.fn(),
            set scrollTop(value) {
                scrollTopSpy(value);
            },
        };

        // Spy on document.querySelector to return mockScroller when '.scroller' is queried
        querySelectorSpy = vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
            if (selector === '.scroller') {
                return mockScroller;
            }
            return null;
        });

        // Mount the component with necessary plugins and stubs
        wrapper = mount(CommentSection, {
            global: {
                plugins: [pinia, i18n, router],
                stubs: {
                    MarkdownEditor: {
                        name: 'MarkdownEditor',
                        template:
                            '<textarea v-model="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
                        props: ['modelValue'],
                    },
                    RecycleScroller: {
                        name: 'RecycleScroller',
                        template: '<div><slot></slot></div>',
                    },
                    CommentItem: {
                        name: 'CommentItem',
                        template: '<div class="comment-item">{{ comment.content }}</div>',
                        props: ['comment'],
                    },
                    ErrorMessage: {
                        name: 'ErrorMessage',
                        template: '<div class="error-message">{{ message }}</div>',
                        props: ['message'],
                    },
                    LoaderIcon: {
                        name: 'LoaderIcon',
                        template: '<div class="loader-icon"></div>',
                    },
                    MessageSquareIcon: {
                        name: 'MessageSquareIcon',
                        template: '<div class="message-square-icon"></div>',
                    },
                },
            },
            props: {
                postId: 'post123',
            },
        });

        return {
            wrapper,
            commentStore,
            userStore,
            notificationStore,
            router,
            mockPush,
            scrollTopSpy,
            querySelectorSpy,
            mockScroller,
            addCommentMock, // Not set here
            getCommentsMock, // Not set here
            newComment, // Return newComment for assertions
        };
    };

    afterEach(() => {
        // Restore all mocks after each test
        querySelectorSpy?.mockRestore();
        vi.resetAllMocks();
    });

    it('successfully adds a comment, displays it, and scrolls to bottom', async () => {
        // Arrange
        const newCommentContent = 'This is a test comment.';
        const existingComment = {
            id: 'existingComment1',
            content: 'Existing comment',
            user: { id: 'user456', name: 'Existing User' },
            createdAt: '2024-10-23T10:50:00.000Z'
        };

        // Mock apiService.getComments to return existing comments on mount
        getCommentsMock = vi.spyOn(apiService, 'getComments').mockResolvedValueOnce({
            data: [existingComment],
        });

        // Mock apiService.addComment to resolve with newComment
        addCommentMock = vi.spyOn(apiService, 'addComment').mockResolvedValueOnce({
            data: newComment,
        });

        // Now mount the component after setting up mocks
        ({
            wrapper,
            commentStore,
            userStore,
            notificationStore,
            router,
            mockPush,
            scrollTopSpy,
            querySelectorSpy,
            mockScroller,
            addCommentMock,
            getCommentsMock,
            newComment,
        } = mountComponent());

        // Wait for the initial fetch to complete
        await flushPromises();

        // Act
        // Find the MarkdownEditor component and set its value
        const markdownEditor = wrapper.findComponent({ name: 'MarkdownEditor' });
        expect(markdownEditor.exists()).toBe(true); // Ensure the component is found

        await markdownEditor.setValue(newCommentContent);

        // Find and click the add comment button
        const addButton = wrapper.find('button[aria-label="Post Comment"]');
        expect(addButton.exists()).toBe(true); // Ensure the button is found

        await addButton.trigger('click.prevent');

        // Wait for all promises to resolve
        await flushPromises();

        // Assert
        // Check that the apiService.addComment was called with correct parameters
        expect(apiService.addComment).toHaveBeenCalledWith('post123', newCommentContent);

        // Check that the comment was added to the store's comments
        expect(commentStore.comments.value).toContainEqual(newComment); // Use .value to access the array

        // More specific assertions:
        expect(commentStore.comments.value).toHaveLength(2);
        expect(commentStore.comments.value[0]).toMatchObject({
            id: 'comment123',
            content: 'This is a test comment.',
            user: { id: 'user123', name: 'Test User' },
            createdAt: '2024-10-23T10:53:34.382Z'
        });
        expect(commentStore.comments.value[1]).toMatchObject({
            id: 'existingComment1',
            content: 'Existing comment',
            user: { id: 'user456', name: 'Existing User' },
            createdAt: '2024-10-23T10:50:00.000Z'
        });

        // Check that the new comment is rendered in the DOM
        const renderedComments = wrapper.findAll('.comment-item');
        expect(renderedComments).toHaveLength(2);
        expect(renderedComments[0].text()).toBe(newCommentContent);
        expect(renderedComments[1].text()).toBe(existingComment.content);

        // Check that the comment input is cleared after submission
        expect(markdownEditor.emitted()['update:modelValue'][0]).toEqual(['']);

        // Check that scrollToBottom was called by verifying scrollTop was set to scrollHeight
        expect(scrollTopSpy).toHaveBeenCalledWith(mockScroller.scrollHeight);

        // Check that a success notification is displayed
        expect(notificationStore.showNotification).toHaveBeenCalledWith('Comment added', 'success');

        // Ensure that document.querySelector was called with '.scroller'
        expect(querySelectorSpy).toHaveBeenCalledWith('.scroller');
    });

    it('redirects to login when adding a comment with invalid session token', async () => {
        // Arrange
        const invalidToken = 'invalid-token';
        const newCommentContent = 'This comment should fail.';
        const errorResponse = {
            response: {
                status: 401,
                data: { code: 1009 }, // Updated from 1008 to 1009
            },
        };

        // Update the userStore to reflect an invalid session
        userStore.token = invalidToken;
        userStore.user = null; // Simulate user not logged in
        userStore.isLoggedIn = false;

        // Mock apiService.getComments to return existing comments to prevent 'No comments found'
        getCommentsMock = vi.spyOn(apiService, 'getComments').mockResolvedValueOnce({
            data: [
                {
                    id: 'existingComment1',
                    content: 'Existing comment',
                    user: { id: 'user456', name: 'Existing User' },
                    createdAt: '2024-10-23T10:50:00.000Z'
                }
            ],
        });

        // Mock the apiService.addComment to reject with errorResponse
        addCommentMock = vi.spyOn(apiService, 'addComment').mockRejectedValueOnce(errorResponse);

        // Spy on notificationStore.showNotification BEFORE mounting the component
        const showNotificationSpy = vi.spyOn(notificationStore, 'showNotification');

        // Now mount the component after setting up mocks
        ({
            wrapper,
            commentStore,
            userStore,
            notificationStore,
            router,
            mockPush,
            scrollTopSpy,
            querySelectorSpy,
            mockScroller,
            addCommentMock,
            getCommentsMock,
            newComment,
        } = mountComponent());

        // Wait for the initial fetch to complete
        await flushPromises();

        // Act
        // Find the MarkdownEditor component and set its value
        const markdownEditor = wrapper.findComponent({ name: 'MarkdownEditor' });
        expect(markdownEditor.exists()).toBe(true); // Ensure the component is found

        await markdownEditor.setValue(newCommentContent);

        // Find and click the add comment button
        const addButton = wrapper.find('button[aria-label="Post Comment"]');
        expect(addButton.exists()).toBe(true); // Ensure the button is found

        await addButton.trigger('click.prevent');

        // Wait for all promises to resolve
        await flushPromises();

        // Assert
        // Check that the apiService.addComment was called with correct parameters
        expect(apiService.addComment).toHaveBeenCalledWith('post123', newCommentContent);

        // Check that the notificationStore.showNotification was called with the session expired message
        expect(showNotificationSpy).toHaveBeenCalledWith(
            'You do not have permission to access this resource.',
            'error'
        );

        // Check that the router was redirected to the login page
        expect(mockPush).toHaveBeenCalledWith('/login');

        // Check that the comment was not added to the store
        expect(commentStore.comments.value).not.toContainEqual(expect.objectContaining({ content: newCommentContent }));

        // Ensure that document.querySelector was called with '.scroller'
        expect(querySelectorSpy).toHaveBeenCalledWith('.scroller');
    });

    // Additional test cases can reuse the same setup
});
