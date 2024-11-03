import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { usePostStore } from '../stores/postStore'
import { useUserStore } from '../stores/userStore'
import Home from '../views/Home.vue'
import Login from '../components/auth/Login.vue'
import apiService from '../services/api'
import i18n from './i18n'
import { createRouter, createMemoryHistory } from 'vue-router'

// Mock API service
const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
    },
    // Add other routes if necessary
]

// Create the router instance
const router = createRouter({
    history: createMemoryHistory(),
    routes,
})

// Mock API service
vi.mock('../services/api', () => ({
    default: {
        get: vi.fn(),
        setAuthHeaders: vi.fn(),
        // Include other methods if needed
    },
}))

describe('get_list_posts API', () => {
    let postStore
    let userStore

    beforeEach(() => {
        setActivePinia(createPinia())
        postStore = usePostStore()
        userStore = useUserStore()
        userStore.setLoggedIn(true)
        vi.clearAllMocks()
    })

    it('1. should fetch posts successfully with valid session and parameters', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [{ id: '1', content: 'Test post' }],
                    last_id: '1',
                    new_items: '1',
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(1)
        expect(postStore.error).toBeNull()
    })

    it('2. should redirect to login page with invalid session', async () => {
        const mockResponse = {
            data: {
                code: '9998',
                message: 'Token is invalid',
            },
        }
        vi.mocked(apiService.get).mockRejectedValue(mockResponse)

        const routerPushSpy = vi.spyOn(router, 'push')

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(userStore.isLoggedIn).toBe(false)
        expect(routerPushSpy).toHaveBeenCalledWith('/login')
    })

    it('3. should handle no more posts gracefully', async () => {
        const mockResponse = {
            data: {
                code: '9994',
                message: 'No more posts',
                data: {
                    posts: [],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.hasMorePosts).toBe(false)
        expect(wrapper.find('.no-more-posts-message').exists()).toBe(true)
    })

    it('4. should handle user block and logout', async () => {
        const mockResponse = {
            data: {
                code: '9995',
                message: 'User is blocked',
            },
        }
        vi.mocked(apiService.get).mockRejectedValue(mockResponse)

        const routerPushSpy = vi.spyOn(router, 'push')
        const localStorageClearSpy = vi.spyOn(localStorage, 'clear')
        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(userStore.isLoggedIn).toBe(false)
        expect(routerPushSpy).toHaveBeenCalledWith('/login')
        expect(localStorageClearSpy).toHaveBeenCalled()
    })

    it('5. should handle posts with invalid content', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        { id: '1', content: 'Valid post' },
                        { id: '2', content: null },
                        { id: '3', content: 'Another valid post' },
                    ],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(2)
        expect(postStore.posts.some(post => post.id === '2')).toBe(false)
    })

    it('6. should handle posts with invalid like, comment, or is_liked fields', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        { id: '1', content: 'Post 1', like: 'invalid', comment: 5, is_liked: '1' },
                        { id: '2', content: 'Post 2', like: 10, comment: 'invalid', is_liked: '0' },
                        { id: '3', content: 'Post 3', like: 15, comment: 8, is_liked: 'invalid' },
                    ],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(3)
        expect(postStore.posts[0].like).toBe(0)
        expect(postStore.posts[1].comment).toBe(0)
        expect(postStore.posts[2].is_liked).toBe('0')
    })

    it('7. should handle posts with invalid can_comment field', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        { id: '1', content: 'Post 1', can_comment: '0' },
                        { id: '2', content: 'Post 2', can_comment: 'invalid' },
                    ],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(wrapper.findAll('.comment-input').length).toBe(0)
    })

    it('8. should handle posts with invalid author id', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        { id: '1', content: 'Post 1', author: { id: '1', name: 'John' } },
                        { id: '2', content: 'Post 2', author: { id: null, name: 'Jane' } },
                        { id: '3', content: 'Post 3', author: { id: '3', name: 'Bob' } },
                    ],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })
        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(2)
        expect(postStore.posts.some(post => post.id === '2')).toBe(false)
    })

    it('9. should handle posts with invalid described and media fields', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        { id: '1', described: 'Valid post', image: ['valid_image.jpg'] },
                        { id: '2', described: null, image: null },
                        { id: '3', described: 'Another valid post', video: 'valid_video.mp4' },
                    ],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(2)
        expect(postStore.posts.some(post => post.id === '2')).toBe(false)
    })

    it('10. should handle posts with either invalid described or media fields', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        { id: '1', described: 'Valid post', image: null },
                        { id: '2', described: null, image: ['valid_image.jpg'] },
                        { id: '3', described: 'Another valid post', video: 'valid_video.mp4' },
                    ],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(3)
    })

    it('11. should handle posts with inappropriate content cover error', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        { id: '1', content: 'Valid post', is_inappropriate: false },
                        { id: '2', content: 'Inappropriate post', is_inappropriate: true },
                    ],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(1)
        expect(postStore.posts[0].id).toBe('1')
    })

    it('12. should handle posts with invalid campaign fields', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [
                        { id: '1', content: 'Post 1', in_campaign: '1', campaign_id: '123' },
                        { id: '2', content: 'Post 2', in_campaign: 'invalid', campaign_id: '456' },
                        { id: '3', content: 'Post 3', in_campaign: '1', campaign_id: null },
                    ],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(3)
        expect(postStore.posts[1].in_campaign).toBe('0')
        expect(postStore.posts[2].campaign_id).toBe('')
    })

    it('13. should handle invalid last_id parameter', async () => {
        const mockResponse = {
            data: {
                code: '1004',
                message: 'Parameter value is invalid',
            },
        }
        vi.mocked(apiService.get).mockRejectedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.error).toBe('Parameter value is invalid')
        expect(postStore.posts).toHaveLength(0)
    })

    it('14. should handle invalid index or count parameters', async () => {
        const mockResponse = {
            data: {
                code: '1004',
                message: 'Parameter value is invalid',
            },
        }
        vi.mocked(apiService.get).mockRejectedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.error).toBe('Parameter value is invalid')
        expect(postStore.posts).toHaveLength(0)
    })

    it('15. should use last known coordinates when location parameters are invalid', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [{ id: '1', content: 'Test post' }],
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        // Set last known coordinates
        postStore.setLastKnownCoordinates({ latitude: 10, longitude: 20 })

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', {
            params: expect.objectContaining({
                latitude: 10,
                longitude: 20,
            }),
        })
    })

    it('16. should redirect to login page when user_id is invalid', async () => {
        const mockResponse = {
            data: {
                code: '9998',
                message: 'Invalid user_id',
            },
        }
        vi.mocked(apiService.get).mockRejectedValue(mockResponse)
        const routerPushSpy = vi.spyOn(router, 'push')

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(userStore.isLoggedIn).toBe(false)
        expect(routerPushSpy).toHaveBeenCalledWith('/login')
    })

    it('should handle network errors', async () => {
        vi.mocked(apiService.get).mockRejectedValue(new Error('Network Error'))

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.error).toBe('Network error occurred')
    })

    it('should handle unexpected server errors', async () => {
        const mockResponse = {
            data: {
                code: '5000',
                message: 'Internal Server Error',
            },
        }
        vi.mocked(apiService.get).mockRejectedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.error).toBe('An unexpected error occurred')
    })

    it('should handle empty response data', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {},
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(0)
        expect(postStore.error).toBeNull()
    })

    it('should handle malformed response data', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: 'not an array',
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValue(mockResponse)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        }) 

        await router.isReady()
        await wrapper.vm.$nextTick()

        expect(apiService.get).toHaveBeenCalledWith('/posts/get_list_posts', expect.any(Object))
        expect(postStore.posts).toHaveLength(0)
        expect(postStore.error).toBe('Invalid response format')
    })

    it('should handle pagination correctly', async () => {
        const mockResponse1 = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [{ id: '1', content: 'Post 1' }],
                    last_id: '1',
                    new_items: '1',
                },
            },
        }
        const mockResponse2 = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    posts: [{ id: '2', content: 'Post 2' }],
                    last_id: '2',
                    new_items: '1',
                },
            },
        }
        vi.mocked(apiService.get).mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2)

        const wrapper = mount(Home, {
            global: {
                plugins: [router, i18n, createPinia()],
            },
        })

        await router.isReady()
        await wrapper.vm.$nextTick()
        expect(postStore.posts).toHaveLength(1)
        expect(postStore.lastId).toBe('1')
        await wrapper.vm.loadMorePosts()
        expect(postStore.posts).toHaveLength(2)
        expect(postStore.lastId).toBe('2')
    })
})