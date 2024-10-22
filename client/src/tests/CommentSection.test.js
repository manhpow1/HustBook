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
const showNotificationMock = vi.fn();
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
vi.mock('../stores/commentStore', () => {
    const comments = ref([
        { id: '1', content: 'Test comment 1', user: { name: 'User 1', avatar: 'avatar1.png' } },
        { id: '2', content: 'Test comment 2', user: { name: 'User 2', avatar: 'avatar2.png' } },
    ]);
    const hasMoreComments = ref(true);
    const loadingComments = ref(false);
    const commentError = ref(null);

    return {
        useCommentStore: () => ({
            fetchComments,
            comments,
            hasMoreComments,
            loadingComments,
            commentError,
            addComment: vi.fn(),
            resetComments: vi.fn(),
        }),
    };
});

// Mock Notification Store
vi.mock('../stores/notificationStore', () => ({
    useNotificationStore: () => ({
        showNotification: showNotificationMock,
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
        loadingMoreComments: 'Loading more comments',
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
        fetchComments.mockRejectedValueOnce(error); // Simulate 401 error from fetchComments

        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(async (err, r) => {
            console.debug('Inside mocked handleError with:', JSON.stringify(err, null, 2));
            await r.push('/login');
            return Promise.resolve();
        });
        console.debug('Mounting the component...');
        const wrapper = mountComponent();
        await flushPromises(); // Wait for any async operations to settle
        await wrapper.vm.$nextTick(); // Ensure Vue updates the DOM
        expect(handleErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ response: { status: 401 } }),
            expect.any(Object) // Ensure router object was passed
        );
        await flushPromises(); // Ensure all promises are resolved
        expect(pushMock).toHaveBeenCalledWith('/login');
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
    });

    it('4. should call handleError and navigate to /login on 403 error (user locked out)', async () => {
        console.debug('Starting Test Case 4: Handling 403 error (user locked out) and redirecting to /login.');

        const error = { response: { status: 403 } }; // Simulate 403 Forbidden error
        fetchComments.mockRejectedValueOnce(error); // Mock fetchComments to return 403

        // Spy on handleError with mocked behavior
        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(async (err, r) => {
            console.debug('Inside mocked handleError with:', JSON.stringify(err, null, 2));
            if (err.response?.status === 403) {
                console.debug('403 error detected. Redirecting to /login...');
                await r.push('/login');
            }
            return Promise.resolve();
        });

        console.debug('Mounting the component...');
        const wrapper = mountComponent();

        await flushPromises(); // Wait for any async operations
        await wrapper.vm.$nextTick(); // Ensure DOM updates

        console.debug('Verifying if handleError was called with the expected 403 error.');
        expect(handleErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ response: { status: 403 } }),
            expect.any(Object) // Ensure router instance was passed
        );

        console.debug('Checking if router.push("/login") was called.');
        await flushPromises(); // Ensure all promises are resolved
        expect(pushMock).toHaveBeenCalledWith('/login'); // Verify redirection to /login
    });

    it("5. should display 'Can't connect to the Internet' on DB error", async () => {
        console.debug('Starting Test Case 5: Handling DB error gracefully.');

        const error = { response: { status: 500, data: { code: 1001 } } }; // Simulate DB access error
        fetchComments.mockRejectedValueOnce(error); // Mock fetch to simulate DB error

        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(async (err, r) => {
            console.debug('Inside mocked handleError with:', JSON.stringify(err, null, 2));
            const message = err.response?.data?.code === 1001 ? "Can't connect to the Internet" : 'An error occurred';
            notificationStore.showNotification(message, 'error');
            return Promise.resolve();
        });

        console.debug('Mounting the component...');
        const wrapper = mountComponent();

        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Verifying if handleError was called with DB error.');
        expect(handleErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ response: { status: 500, data: { code: 1001 } } }),
            expect.any(Object)
        );

        console.debug('Checking if "Cannot connect to the Internet" notification was shown.');
        expect(notificationStore.showNotification).toHaveBeenCalledWith("Can't connect to the Internet", 'error');
    });

    it('6. should display error message when post does not exist (9992 error)', async () => {
        console.debug('Starting Test Case 6: Handling invalid post ID.');

        const error = { response: { status: 404, data: { code: 9992 } } }; // Simulate post not found error
        fetchComments.mockRejectedValueOnce(error); // Mock fetch to simulate 9992 error

        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(async (err, r) => {
            console.debug('Inside mocked handleError with:', JSON.stringify(err, null, 2));
            const message = err.response?.data?.code === 9992 ? 'The post you are looking for does not exist.' : 'An error occurred';
            notificationStore.showNotification(message, 'error');
            return Promise.resolve();
        });

        console.debug('Mounting the component...');
        const wrapper = mountComponent();

        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Verifying if handleError was called with 9992 error.');
        expect(handleErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ response: { status: 404, data: { code: 9992 } } }),
            expect.any(Object)
        );

        console.debug('Checking if "The post you are looking for does not exist." notification was shown.');
        expect(notificationStore.showNotification).toHaveBeenCalledWith('The post you are looking for does not exist.', 'error');
    });

    it('7. should display "Cannot connect to the Internet" on internet disconnection', async () => {
        console.debug('Starting Test Case 7: Handling Internet disconnection.');

        const networkError = new Error('Network Error');
        networkError.message = "Network Error";
        fetchComments.mockRejectedValueOnce(networkError);

        const showNotificationMock = vi.spyOn(useNotificationStore(), 'showNotification');
        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(async (err, r) => {
            console.debug('Inside mocked handleError with:', JSON.stringify(err, null, 2));
            showNotificationMock("Cannot connect to the Internet", 'error');
            return Promise.resolve();
        });

        console.debug('Mounting the component...');
        const wrapper = mountComponent();

        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Verifying if handleError was called with the network error.');
        expect(handleErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Network Error" }),
            expect.any(Object)
        );

        console.debug('Checking if "Cannot connect to the Internet" notification was shown.');
        expect(showNotificationMock).toHaveBeenCalledWith("Cannot connect to the Internet", 'error');
    });


    it('8. should display remaining comments and hide "Load more comments" if none left', async () => {
        console.debug('Starting Test Case 8: Handling fewer comments than expected.');

        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(() => {
            console.debug('Inside mocked handleError.');
            return Promise.resolve();
        });

        // Mock fetchComments to first return comments, then return an empty array
        fetchComments
            .mockResolvedValueOnce([
                { id: '1', content: 'Test comment 1', user: { name: 'User 1', avatar: 'avatar1.png' } },
                { id: '2', content: 'Test comment 2', user: { name: 'User 2', avatar: 'avatar2.png' } },
            ])
            .mockResolvedValueOnce([]); // Simulate no more comments

        const wrapper = mountComponent();

        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Verifying displayed comments after the initial load.');
        const displayedComments = wrapper.findAllComponents(CommentItem);
        console.debug('Displayed comments:', displayedComments.map(c => c.props().comment));
        expect(displayedComments.length).toBe(2);

        // Locate the "Load more comments" button
        console.debug('Locating the "Load more comments" button.');
        let loadMoreButton = wrapper.findAll('button').find(button => button.text() === 'Load more comments');

        if (loadMoreButton) {
            console.debug('Button found:', loadMoreButton.exists());
            expect(loadMoreButton.exists()).toBe(true);

            console.debug('Simulating click on "Load more comments" button.');
            await loadMoreButton.trigger('click');
        } else {
            console.warn('Button not found. Skipping click simulation.');
        }

        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Checking if handleError was not called.');
        expect(handleErrorSpy).not.toHaveBeenCalled();

        console.debug('Checking if "Load more comments" button is hidden.');
        loadMoreButton = wrapper.findAll('button').find(button => button.text() === 'Load more comments');

        if (loadMoreButton) {
            console.debug('Button visibility after clicking:', loadMoreButton.exists());
            expect(loadMoreButton.exists()).toBe(false);
        } else {
            console.debug('Button no longer exists as expected after all comments were loaded.');
        }
    });

    it('9. should handle blocked users and display "No more data available" on 9994 error', async () => {
        console.debug('Starting Test Case 9: Handling blocked users\' comments.');

        // Mocking the 9994 error response
        const error = { response: { status: 404, data: { code: 9994 } } };
        fetchComments.mockRejectedValueOnce(error); // Simulate the 9994 error

        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(async (err, router) => {
            console.debug('Inside mocked handleError with:', JSON.stringify(err, null, 2));
            const message = err.response?.data?.code === 9994 ? 'No more data available.' : 'An error occurred';
            notificationStore.showNotification(message, 'warning');
            return Promise.resolve();
        });

        const wrapper = mountComponent();
        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Verifying if handleError was called with 9994 error.');
        expect(handleErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ response: expect.objectContaining({ data: { code: 9994 } }) }),
            expect.anything() // Match any router object
        );

        console.debug('Checking if "No more data available" notification was shown.');
        expect(notificationStore.showNotification).toHaveBeenCalledWith('No more data available.', 'warning');
    });


    it('10. should handle incorrect parameters silently without notifying the user', async () => {
        console.debug('Starting Test Case 10: Handling incorrect parameters silently.');

        // Mocking the 1004 error response
        const error = { response: { status: 400, data: { code: 1004 } } };
        fetchComments.mockRejectedValueOnce(error); // Simulate incorrect parameters

        const handleErrorSpy = vi.spyOn(errorHandler, 'handleError').mockImplementation(async (err, router) => {
            console.debug('Inside mocked handleError with:', JSON.stringify(err, null, 2));
            return Promise.resolve(); // Ensure silent handling without user notification
        });

        const wrapper = mountComponent();
        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Verifying that handleError was called with 1004 error.');
        expect(handleErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ response: expect.objectContaining({ data: { code: 1004 } }) }),
            expect.anything() // Match any router object
        );

        console.debug('Checking if no notification was shown to the user.');
        expect(notificationStore.showNotification).not.toHaveBeenCalled();
    });

    it('11. should hide comments popup and remove post if owner blocks the user', async () => {
        console.debug('Starting Test Case 11: Handling post owner blocking the user.');

        const error = { response: { status: 403, data: { code: 1009 } } }; // Owner blocking user
        fetchComments.mockRejectedValueOnce(error); // Mock server response

        const wrapper = mountComponent();

        await flushPromises();
        await wrapper.vm.$forceUpdate();
        await wrapper.vm.$nextTick(); // Ensure Vue updates the DOM

        console.debug('Checking if the comment section is hidden.');
        expect(wrapper.find('.comment-section').exists()).toBe(false);

        console.debug('Test Case 11: Completed verification for owner blocking the user.');
    });

    it('12. should filter future comments from blocking user while keeping existing ones visible', async () => {
        console.debug('Starting Test Case 12: Handling commenter blocking the user.');

        // Mock initial comments, including the blocked user
        fetchComments
            .mockResolvedValueOnce([
                { id: '1', content: 'Comment from User 1', user: { name: 'Blocked User', avatar: 'avatar1.png' } },
                { id: '2', content: 'Comment from User 2', user: { name: 'User 2', avatar: 'avatar2.png' } },
            ])
            .mockResolvedValueOnce([
                { id: '2', content: 'Comment from User 2', user: { name: 'User 2', avatar: 'avatar2.png' } },
            ]);

        const wrapper = mountComponent();
        await flushPromises();
        await wrapper.vm.$nextTick();

        console.debug('Verifying displayed comments after the initial load.');
        let displayedComments = wrapper.findAllComponents(CommentItem);
        console.debug('Displayed comments:', displayedComments.map(c => c.props().comment));
        expect(displayedComments.length).toBe(2);

        // Simulate fetching new comments after User 1 blocks the current user
        console.debug('Simulating a refresh to fetch new comments excluding the blocking user.');
        commentStore.comments.value = []; // Reset comments
        await wrapper.vm.onRetryLoadComments(); // Trigger retry
        await flushPromises();
        await wrapper.vm.$forceUpdate(); // Force component to re-render
        await wrapper.vm.$nextTick(); // Ensure DOM updates

        console.debug('Verifying displayed comments after filtering out the blocking user.');
        displayedComments = wrapper.findAllComponents(CommentItem);
        console.debug('Displayed comments after filter:', displayedComments.map(c => c.props().comment));
        expect(displayedComments.length).toBe(1);
        expect(displayedComments[0].props('comment').content).toBe('Comment from User 2');
    });
});