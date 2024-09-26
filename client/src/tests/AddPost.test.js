import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AddPost from '../components/AddPost.vue'
import apiService from '../services/api'
import { useUserState } from '../store/user-state'
import { createRouter, createMemoryHistory } from 'vue-router'
import UnsavedChangesModal from '../components/UnsavedChangesModal.vue'

vi.mock('../services/api')
vi.mock('../store/user-state')

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
        { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } }
    ]
})

describe('AddPost Component', () => {
    let wrapper

    beforeEach(() => {
        vi.clearAllMocks()
        useUserState.mockReturnValue({
            token: { value: 'valid-token' },
            isLoggedIn: { value: true }
        })
        wrapper = mount(AddPost, {
            global: {
                plugins: [router],
                stubs: {
                    UnsavedChangesModal: true
                }
            }
        })
    })

    afterEach(() => {
        vi.resetAllMocks()
        localStorage.clear()
    })

    it('1. Successfully creates a post with multiple images and valid data', async () => {
        const files = [
            new File([''], 'test1.jpg', { type: 'image/jpeg' }),
            new File([''], 'test2.jpg', { type: 'image/jpeg' })
        ]
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: files })
        await input.trigger('change')

        await wrapper.find('textarea').setValue('Test post content')
        await wrapper.find('select').setValue('happy')

        apiService.upload.mockResolvedValue({
            data: { code: '1000', message: 'OK', data: { id: '123', url: 'http://example.com/post/123' } }
        })

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(apiService.upload).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(FormData),
            expect.any(Function)
        )
        expect(wrapper.vm.successMessage).toBe('Post created successfully!')
    })

    it('2. Redirects to login screen when session ID is invalid', async () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [file] })
        await input.trigger('change')

        await wrapper.find('textarea').setValue('Test post content')

        const error = new Error('Invalid token')
        error.response = { status: 401, data: { code: '9998', message: 'Invalid token' } }
        apiService.upload.mockRejectedValue(error)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid session. Please log in again.')
        expect(router.currentRoute.value.path).toBe('/login')
    })

    it('3. Displays error when image size is too large', async () => {
        const largeFile = new File([''.padStart(6 * 1024 * 1024, 'x')], 'large.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [largeFile] })
        await input.trigger('change')

        expect(wrapper.vm.fileError).toBe('File size is too big (max 5MB)')
    })

    it('4. Displays error when video duration or size is too large', async () => {
        const largeVideo = new File([''.padStart(11 * 1024 * 1024, 'x')], 'large.mp4', { type: 'video/mp4' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [largeVideo] })

        // Mock video metadata
        global.URL.createObjectURL = vi.fn()
        global.URL.revokeObjectURL = vi.fn()
        const mockVideoElement = {
            preload: null,
            onloadedmetadata: null,
            duration: 15, // 15 seconds, which is over the 10-second limit
        }
        global.document.createElement = vi.fn(() => mockVideoElement)

        await input.trigger('change')

        // Manually trigger the onloadedmetadata event
        mockVideoElement.onloadedmetadata()

        await flushPromises()

        expect(wrapper.vm.fileError).toBe('Video duration is too long')

        // Test for file size
        expect(wrapper.vm.fileError).toBe('File size is too big (max 10MB for videos)')
    })

    it('5. Inserts emoji into description', async () => {
        const emojiButton = wrapper.find('button[aria-label="Toggle emoji picker"]')
        await emojiButton.trigger('click')

        const emoji = wrapper.find('button[aria-label="Insert 😀 emoji"]')
        await emoji.trigger('click')

        expect(wrapper.vm.description).toBe('😀')
    })

    it('6. Detects links in description', async () => {
        await wrapper.find('textarea').setValue('Check out https://example.com')
        await wrapper.vm.$nextTick()

        const highlightedDescription = wrapper.find('.text-sm.text-gray-700').element.innerHTML
        expect(highlightedDescription).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a>')
    })

    it('7. Shows unsaved changes modal when navigating away', async () => {
        await wrapper.find('textarea').setValue('Unsaved content')

        wrapper.vm.handleRouteChange({ name: 'Home' }, { name: 'AddPost' }, vi.fn())
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.showUnsavedChangesModal).toBe(true)
    })

    it('8. Saves and loads draft', async () => {
        const content = 'Draft content'
        await wrapper.find('textarea').setValue(content)
        await wrapper.vm.$nextTick()

        // Simulate component unmount to trigger draft save
        wrapper.unmount()

        // Remount component to test draft loading
        wrapper = mount(AddPost, {
            global: {
                plugins: [router],
                stubs: {
                    UnsavedChangesModal: true
                }
            }
        })

        expect(wrapper.vm.description).toBe(content)
    })

    it('9. Handles server error while posting', async () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [file] })
        await input.trigger('change')

        await wrapper.find('textarea').setValue('Test post content')

        const error = new Error('Server error')
        error.response = { status: 500, data: { code: '9999', message: 'Server error' } }
        apiService.upload.mockRejectedValue(error)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Server error')
    })

    it('10. Handles network disconnection during posting', async () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', { value: [file] })
        await input.trigger('change')

        await wrapper.find('textarea').setValue('Test post content')

        const networkError = new Error('Network Error')
        networkError.request = {}
        networkError.response = undefined
        apiService.upload.mockRejectedValue(networkError)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Network connection error. Please check your internet connection and try again.')
    })
})