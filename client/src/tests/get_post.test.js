import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PostDetail from '../components/post/PostDetail.vue'
import apiService from '../services/api'
import { useUserState } from '../store/user-state'
import { useRouter, useRoute, createRouter, createWebHistory } from 'vue-router'
// Mock vue-router
const mockRouter = {
    push: vi.fn(),
    beforeEach: vi.fn(),
    afterEach: vi.fn()
}

const mockRoute = {
    params: { id: '123' }
}

vi.mock('vue-router', () => ({
    useRouter: vi.fn(() => mockRouter),
    useRoute: vi.fn(() => mockRoute),
    createRouter: vi.fn(() => mockRouter),
    createWebHistory: vi.fn()
}))

vi.mock('../services/api')
vi.mock('../store/user-state')
vi.mock('@vueuse/core', () => ({
    useIntersectionObserver: vi.fn((el, callback) => {
        callback([{ isIntersecting: true }])
        return { stop: vi.fn() }
    })
}))

describe('PostDetail Component', () => {
    let wrapper
    let i18n

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()

        // Setup i18n
        i18n = createI18n({
            legacy: false,
            locale: 'en',
            messages: {
                en: {
                    postNotFound: 'Post not found',
                    invalidSession: 'Invalid session',
                    errorLoadingPost: 'Error loading post',
                    postNotAvailable: 'Post is not available',
                    retry: 'Retry',
                    comment: 'Comment',
                    comments: 'Comments',
                    share: 'Share',
                    writeComment: 'Write a comment',
                    postComment: 'Post Comment',
                    like: 'Like',
                    likes: 'Likes',
                    unlike: 'Unlike',
                    edit: 'Edit',
                    delete: 'Delete',
                    cancel: 'Cancel',
                    save: 'Save',
                    confirmDelete: 'Confirm Delete',
                    deleteWarning: 'Are you sure you want to delete this comment?',
                    editComment: 'Edit comment',
                    editCommentPlaceholder: 'Edit your comment here',
                    saveEditError: 'Failed to save edit. Please try again.',
                    deleteError: 'Failed to delete comment. Please try again.',
                    likeError: 'Failed to update like status. Please try again.',
                    errorFetchingComments: 'Failed to load comments. Please try again.',
                }
            }
        })

        // Mock user state
        vi.mocked(useUserState).mockReturnValue({
            token: { value: 'valid-token' },
            isLoggedIn: { value: true }
        })

        // Mount component
        wrapper = mount(PostDetail, {
            global: {
                plugins: [i18n],
                stubs: {
                    RecycleScroller: true,
                    MarkdownEditor: true
                }
            },
            props: {
                darkMode: false
            }
        })

        // Mock apiService.getComments
        vi.mocked(apiService.getComments).mockResolvedValue({
            data: {
                data: [] // or mock some comments if needed
            }
        })
    })

    it('1. Successfully fetches and displays post with correct login session code and post id', async () => {
        const mockPost = {
            id: '123',
            described: 'Test post content',
            created: '2023-01-01T00:00:00Z',
            like: '10',
            comment: '5',
            is_liked: '0',
            image: [{ id: 'img1', url: 'image1.jpg' }, { id: 'img2', url: 'image2.jpg' }],
            video: [],
            author: { id: 'author1', name: 'John Doe', avatar: 'avatar.jpg' },
            state: 'normal',
            is_blocked: '0',
            can_edit: '1',
            banned: '0',
            can_comment: '1'
        }

        vi.mocked(apiService.getPost).mockResolvedValue({
            data: {
                code: '1000',
                data: mockPost
            }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.vm.post).toEqual({
            ...mockPost,
            image: mockPost.image.map(img => ({ ...img, isVisible: false }))
        })
        expect(wrapper.vm.error).toBeNull()
        expect(wrapper.vm.loading).toBe(false)
    })

    it('2. Redirects to login page when login session code is incorrect', async () => {
        vi.mocked(apiService.getPost).mockRejectedValue({
            response: { status: 401, data: { code: '9998', message: 'Token is invalid' } }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(mockRouter.push).toHaveBeenCalledWith('/login')
        expect(wrapper.vm.error).toBe(i18n.global.t('invalidSession'))
    })

    it('3. Handles locked post due to community standards violation', async () => {
        vi.mocked(apiService.getPost).mockResolvedValue({
            data: { code: '9992', message: 'Post is not available' }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.vm.error).toBe(i18n.global.t('postNotAvailable'))
    })

    it('4. Handles scenario when user is blocked by post author', async () => {
        vi.mocked(apiService.getPost).mockResolvedValue({
            data: { code: '9993', message: 'You are not allowed to see this post' }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.vm.error).toBe(i18n.global.t('postNotAvailable'))
    })

    it('5. Handles error in post content field', async () => {
        const mockPost = {
            id: '123',
            described: null,  // Simulating an error in the content field
            created: '2023-01-01T00:00:00Z',
            like: '10',
            comment: '5',
            is_liked: '0',
            image: [],
            video: [],
            author: { id: 'author1', name: 'John Doe', avatar: 'avatar.jpg' },
            state: 'normal',
            is_blocked: '0',
            can_edit: '1',
            banned: '0',
            can_comment: '1'
        }

        vi.mocked(apiService.getPost).mockResolvedValue({
            data: {
                code: '1000',
                data: mockPost
            }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.vm.post.described).toBe('')
    })

    it('6. Displays post with errors in like, comment, or is_liked fields', async () => {
        const mockPost = {
            id: '123',
            described: 'Test post content',
            created: '2023-01-01T00:00:00Z',
            like: 'invalid',
            comment: 'invalid',
            is_liked: 'invalid',
            image: [],
            video: [],
            author: { id: 'author1', name: 'John Doe', avatar: 'avatar.jpg' },
            state: 'normal',
            is_blocked: '0',
            can_edit: '1',
            banned: '0',
            can_comment: '1'
        }

        vi.mocked(apiService.getPost).mockResolvedValue({
            data: {
                code: '1000',
                data: mockPost
            }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.vm.post.like).toBe('0')
        expect(wrapper.vm.post.comment).toBe('0')
        expect(wrapper.vm.post.is_liked).toBe('0')
    })

    it('7. Does not display comment box when can_comment field is "0" or invalid', async () => {
        const mockPost = {
            id: '123',
            described: 'Test post content',
            created: '2023-01-01T00:00:00Z',
            like: '10',
            comment: '5',
            is_liked: '0',
            image: [],
            video: [],
            author: { id: 'author1', name: 'John Doe', avatar: 'avatar.jpg' },
            state: 'normal',
            is_blocked: '0',
            can_edit: '1',
            banned: '0',
            can_comment: '0'
        }

        vi.mocked(apiService.getPost).mockResolvedValue({
            data: {
                code: '1000',
                data: mockPost
            }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.find('.comment-box').exists()).toBe(false)
    })

    it('8. Handles error in author id field', async () => {
        const mockPost = {
            id: '123',
            described: 'Test post content',
            created: '2023-01-01T00:00:00Z',
            like: '10',
            comment: '5',
            is_liked: '0',
            image: [],
            video: [],
            author: { id: null, name: 'John Doe', avatar: 'avatar.jpg' },
            state: 'normal',
            is_blocked: '0',
            can_edit: '1',
            banned: '0',
            can_comment: '1'
        }

        vi.mocked(apiService.getPost).mockResolvedValue({
            data: {
                code: '1000',
                data: mockPost
            }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.vm.post.author.id).toBe('')
    })

    it('9. Displays default values for missing author name or avatar', async () => {
        const mockPost = {
            id: '123',
            described: 'Test post content',
            created: '2023-01-01T00:00:00Z',
            like: '10',
            comment: '5',
            is_liked: '0',
            image: [],
            video: [],
            author: { id: 'author1', name: null, avatar: null },
            state: 'normal',
            is_blocked: '0',
            can_edit: '1',
            banned: '0',
            can_comment: '1'
        }

        vi.mocked(apiService.getPost).mockResolvedValue({
            data: {
                code: '1000',
                data: mockPost
            }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.vm.post.author.name).toBe('Unknown')
        expect(wrapper.vm.post.author.avatar).toBe('/path/to/default/avatar.jpg')
    })

    it('10. Handles incorrect post id', async () => {
        vi.mocked(apiService.getPost).mockRejectedValue({
            response: { status: 404, data: { code: '9992', message: 'Post not found' } }
        })

        await wrapper.vm.fetchPost()
        await flushPromises()

        expect(wrapper.vm.error).toBe(i18n.global.t('postNotFound'))
        expect(mockRouter.push).toHaveBeenCalledWith('/')
    })
})