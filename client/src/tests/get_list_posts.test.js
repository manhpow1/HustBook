import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import { usePostStore } from '../stores/postStore'
import { useUserStore } from '../stores/userStore'
import { useNotificationStore } from '../stores/notificationStore'
import apiService from '../services/api'
import Login from '../components/auth/Login.vue'
import pinia from '../pinia'

// Mock API service
vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(),
        setAuthHeaders: vi.fn(),
        getListPosts: vi.fn(), // We'll control this mock in individual tests
    },
}))

setActivePinia(pinia)

// Create a test router instance
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: Home },
        { path: '/login', component: Login },
    ],
})

describe('get_list_posts API', () => {
    let postStore
    let userStore
    let notificationStore

    beforeEach(() => {
        postStore = usePostStore();
        userStore = useUserStore();
        notificationStore = useNotificationStore();

        // Set user to simulate logged-in state
        userStore.setUser({ id: 'test-user-id', name: 'Test User' });

        // Reset post store values
        postStore.posts = [];
        postStore.lastId = '';
        postStore.hasMorePosts = true;
        postStore.error = null;
        postStore.loading = false;

        vi.clearAllMocks();
    });

    it('1. should fetch posts successfully with valid session and parameters', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        {
                            id: '1',
                            content: 'Test post',
                            userId: 'test-user-id',
                            author: { id: 'test-user-id', name: 'Test User' },
                            like: 10,
                            comment: 5,
                            is_liked: '1',
                            can_comment: '1',
                            image: [], // Assuming no images
                            video: '', // Assuming no video
                            in_campaign: '0',
                            campaign_id: '',
                        },
                    ],
                    last_id: '1',
                    new_items: '1',
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        expect(postStore.posts).toHaveLength(1);
        expect(postStore.posts[0].id).toBe('1');
        expect(postStore.error).toBeNull();
    });

    it('2. should redirect to login page with invalid session', async () => {
        const mockError = {
            response: {
                data: {
                    code: 9998,
                    message: 'Token is invalid',
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockRejectedValueOnce(mockError);

        const routerPushSpy = vi.spyOn(router, 'push');
        const notificationSpy = vi.spyOn(notificationStore, 'showNotification');

        await postStore.fetchPosts({}, router);
        await flushPromises();

        // Assertions
        expect(userStore.isLoggedIn).toBe(false);
        expect(routerPushSpy).toHaveBeenCalledWith('/login');
        expect(notificationSpy).toHaveBeenCalledWith('Token is invalid.', 'error');
    });

    it('3. should handle no more posts gracefully', async () => {
        const mockResponse = {
            data: {
                code: '9994',
                message: 'No data or end of list data.',
                data: { posts: [] },
            },
        }
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse)

        await postStore.fetchPosts()
        expect(postStore.hasMorePosts).toBe(false)
    })

    it('4. should handle user block and logout', async () => {
        const mockError = {
            response: {
                data: {
                    code: '9995', // Error code as a string
                    message: 'User is not validated.',
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockRejectedValueOnce(mockError);
        const routerPushSpy = vi.spyOn(router, 'push');
        const notificationSpy = vi.spyOn(notificationStore, 'showNotification');

        await postStore.fetchPosts({}, router);
        await flushPromises();

        expect(userStore.isLoggedIn).toBe(false);
        expect(routerPushSpy).toHaveBeenCalledWith('/login');
        expect(notificationSpy).toHaveBeenCalledWith('User is not validated.', 'error');
    });

    it('5. should handle posts with invalid content', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        {
                            id: '1',
                            content: 'Valid post',
                            userId: 'test-user-id',
                            author: { id: 'test-user-id', name: 'Test User' },
                            like: 5,
                            comment: 2,
                            is_liked: '1',
                            can_comment: '1',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                        {
                            id: '2',
                            content: null, // Invalid content
                            userId: 'test-user-id',
                            author: { id: 'test-user-id', name: 'Test User' },
                            like: 3,
                            comment: 1,
                            is_liked: '0',
                            can_comment: '1',
                            image: [], // No media
                            video: '', // No media
                            in_campaign: '0',
                            campaign_id: '',
                        },
                    ],
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object));
        expect(postStore.posts).toHaveLength(1); // Only the valid post should be included
        expect(postStore.posts[0].id).toBe('1');
        expect(postStore.posts.some((post) => post.id === '2')).toBe(false);
    });

    it('6. should handle posts with invalid like, comment, or is_liked fields', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        {
                            id: '1',
                            content: 'Post 1',
                            userId: '1',
                            author: { id: '1', name: 'Author 1' },
                            like: 'invalid', // Invalid like
                            comment: 5,
                            is_liked: '1',
                            can_comment: '1',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                        {
                            id: '2',
                            content: 'Post 2',
                            userId: '2',
                            author: { id: '2', name: 'Author 2' },
                            like: 10,
                            comment: 'invalid', // Invalid comment
                            is_liked: '0',
                            can_comment: '1',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                        {
                            id: '3',
                            content: 'Post 3',
                            userId: '3',
                            author: { id: '3', name: 'Author 3' },
                            like: 15,
                            comment: 8,
                            is_liked: 'invalid', // Invalid is_liked
                            can_comment: '1',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                    ],
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object));
        expect(postStore.posts).toHaveLength(3);

        // Validate corrections made by the validation function
        expect(postStore.posts[0].like).toBe(0); // Invalid 'like' corrected to 0
        expect(postStore.posts[1].comment).toBe(0); // Invalid 'comment' corrected to 0
        expect(postStore.posts[2].is_liked).toBe('0'); // Invalid 'is_liked' corrected to '0'
    });

    it('7. should handle posts with invalid can_comment field', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        {
                            id: '1',
                            content: 'Post 1',
                            userId: '1',
                            author: { id: '1', name: 'Author 1' },
                            can_comment: '0',
                            like: 5,
                            comment: 2,
                            is_liked: '1',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                        {
                            id: '2',
                            content: 'Post 2',
                            userId: '2',
                            author: { id: '2', name: 'Author 2' },
                            can_comment: 'invalid', // Invalid can_comment
                            like: 3,
                            comment: 1,
                            is_liked: '0',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                    ],
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object));
        expect(postStore.posts).toHaveLength(2);

        // Validate correction of 'can_comment' field
        expect(postStore.posts[0].can_comment).toBe('0'); // Valid value remains unchanged
        expect(postStore.posts[1].can_comment).toBe('0'); // Invalid value corrected to '0'
    });

    it('8. should handle posts with invalid author id', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        {
                            id: '1',
                            content: 'Post 1',
                            userId: '1',
                            author: { id: '1', name: 'John' },
                            like: 10,
                            comment: 5,
                            is_liked: '1',
                            can_comment: '1',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                        {
                            id: '2',
                            content: 'Post 2',
                            userId: null, // Invalid userId
                            author: { id: null, name: 'Jane' }, // Invalid author id
                            like: 7,
                            comment: 3,
                            is_liked: '0',
                            can_comment: '1',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                        {
                            id: '3',
                            content: 'Post 3',
                            userId: '3',
                            author: { id: '3', name: 'Bob' },
                            like: 5,
                            comment: 2,
                            is_liked: '1',
                            can_comment: '1',
                            image: [],
                            video: '',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                    ],
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object));
        expect(postStore.posts).toHaveLength(2); // Post with invalid author should be filtered out
        expect(postStore.posts.some((post) => post.id === '2')).toBe(false);
    });

    it('9. should handle posts with invalid content and media fields', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        {
                            id: '1',
                            content: 'Valid post',
                            userId: '1',
                            author: { id: '1', name: 'Author 1' },
                            image: ['valid_image.jpg'],
                            video: '',
                            like: 5,
                            comment: 2,
                            is_liked: '1',
                            can_comment: '1',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                        {
                            id: '2',
                            content: null, // Invalid content
                            userId: '2',
                            author: { id: '2', name: 'Author 2' },
                            image: [], // No media
                            video: '', // No media
                            like: 3,
                            comment: 1,
                            is_liked: '0',
                            can_comment: '1',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                        {
                            id: '3',
                            content: '', // Empty content
                            userId: '3',
                            author: { id: '3', name: 'Author 3' },
                            image: [],
                            video: 'valid_video.mp4', // Valid video
                            like: 7,
                            comment: 3,
                            is_liked: '1',
                            can_comment: '1',
                            in_campaign: '0',
                            campaign_id: '',
                        },
                    ],
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object));
        expect(postStore.posts).toHaveLength(2); // Post with invalid content and media should be filtered out
        expect(postStore.posts.some((post) => post.id === '2')).toBe(false);
    });

    it('10. should handle posts with either invalid described or media fields', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        // Post 1: Invalid content, valid image
                        {
                            id: '1',
                            content: null,
                            userId: '1',
                            author: { id: '1', name: 'Author 1' },
                            image: ['image1.jpg'],
                            video: '',
                            like: 5,
                            comment: 2,
                            is_liked: '1',
                            can_comment: '1',
                        },
                        // Post 2: Valid content, no media
                        {
                            id: '2',
                            content: 'Valid content',
                            userId: '2',
                            author: { id: '2', name: 'Author 2' },
                            image: [],
                            video: '',
                            like: 3,
                            comment: 1,
                            is_liked: '0',
                            can_comment: '1',
                        },
                        // Post 3: Invalid content, valid video
                        {
                            id: '3',
                            content: null,
                            userId: '3',
                            author: { id: '3', name: 'Author 3' },
                            image: [],
                            video: 'video1.mp4',
                            like: 7,
                            comment: 3,
                            is_liked: '1',
                            can_comment: '1',
                        },
                    ],
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object));
        expect(postStore.posts).toHaveLength(3); // All posts should be included
    });

    it('11. should handle posts with inappropriate content cover error', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        // Valid post
                        {
                            id: '1',
                            content: 'This is a valid post',
                            userId: 'user1',
                            author: { id: 'user1', name: 'User One' },
                            like: 5,
                            comment: 2,
                            is_liked: '1',
                            can_comment: '1',
                            image: [],
                            video: '',
                        },
                        // Post with inappropriate content
                        {
                            id: '2',
                            content: 'This post contains bitch',
                            userId: 'user2',
                            author: { id: 'user2', name: 'User Two' },
                            like: 3,
                            comment: 1,
                            is_liked: '0',
                            can_comment: '1',
                            image: [],
                            video: '',
                        },
                    ],
                },
            },
        };

        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object));
        expect(postStore.posts).toHaveLength(1); // Only the valid post should be included
        expect(postStore.posts[0].id).toBe('1');
        expect(postStore.error).toBeNull();
    });

    it('12. should handle posts with invalid campaign fields', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        // Post 1: Valid campaign fields
                        {
                            id: '1',
                            content: 'Post 1',
                            userId: '1',
                            author: { id: '1', name: 'Author 1' },
                            in_campaign: '1',
                            campaign_id: 'campaign123',
                            like: 5,
                            comment: 2,
                            is_liked: '1',
                            can_comment: '1',
                            image: [],
                            video: '',
                        },
                        // Post 2: Invalid 'in_campaign' field
                        {
                            id: '2',
                            content: 'Post 2',
                            userId: '2',
                            author: { id: '2', name: 'Author 2' },
                            in_campaign: 'invalid', // Invalid value
                            campaign_id: 'campaign456',
                            like: 3,
                            comment: 1,
                            is_liked: '0',
                            can_comment: '1',
                            image: [],
                            video: '',
                        },
                        // Post 3: 'in_campaign' is '1' but 'campaign_id' is missing
                        {
                            id: '3',
                            content: 'Post 3',
                            userId: '3',
                            author: { id: '3', name: 'Author 3' },
                            in_campaign: '1',
                            campaign_id: null, // Invalid 'campaign_id'
                            like: 7,
                            comment: 3,
                            is_liked: '1',
                            can_comment: '1',
                            image: [],
                            video: '',
                        },
                    ],
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockResolvedValue(mockResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object));
        expect(postStore.posts).toHaveLength(3);

        // Validate corrections made by the validation function
        expect(postStore.posts[1].in_campaign).toBe('0'); // Invalid 'in_campaign' corrected to '0'
        expect(postStore.posts[2].campaign_id).toBe(''); // Invalid 'campaign_id' set to empty string
    });

    it('13. should handle invalid last_id parameter', async () => {
        const mockErrorResponse = {
            response: {
                data: {
                    code: '1004',
                    message: 'Parameter value is invalid',
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockRejectedValue(mockErrorResponse);

        await postStore.fetchPosts();
        await flushPromises();

        expect(postStore.error).toBe('Parameter value is invalid');
        expect(postStore.posts).toHaveLength(0);
    });

    it('14. should handle invalid index or count parameters', async () => {
        const mockError = {
            response: {
                data: {
                    code: '1004',
                    message: 'Parameter value is invalid',
                },
            },
        }
        vi.mocked(apiService.getListPosts).mockRejectedValue(mockError)

        await postStore.fetchPosts()
        await flushPromises()

        expect(apiService.getListPosts).toHaveBeenCalledWith(expect.any(Object))
        expect(postStore.error).toBe('Parameter value is invalid')
        expect(postStore.posts).toHaveLength(0)
    })


    it('15. should use last known coordinates when location parameters are invalid', async () => {
        // Set last known coordinates
        postStore.setLastKnownCoordinates({ latitude: 10, longitude: 20 });

        // Call fetchPosts with invalid location parameters
        await postStore.fetchPosts({ latitude: NaN, longitude: NaN });
        await flushPromises();

        expect(apiService.getListPosts).toHaveBeenCalledWith(
            expect.objectContaining({
                latitude: 10,
                longitude: 20,
            })
        );
    });

    it('16. should redirect to login page when user_id is invalid', async () => {
        const mockErrorResponse = {
            response: {
                data: {
                    code: '9998',
                    message: 'Token is invalid.', // Ensure this matches your getErrorMessage mapping
                },
            },
        };
        vi.mocked(apiService.getListPosts).mockRejectedValue(mockErrorResponse);

        // Set up spies
        const routerPushSpy = vi.spyOn(router, 'push');
        const notificationSpy = vi.spyOn(notificationStore, 'showNotification');

        // Pass the router to fetchPosts
        await postStore.fetchPosts({}, router);
        await flushPromises();

        expect(userStore.isLoggedIn).toBe(false);
        expect(routerPushSpy).toHaveBeenCalledWith('/login');
        expect(notificationSpy).toHaveBeenCalledWith('Token is invalid.', 'error'); // Update expected message
    });
    
})
