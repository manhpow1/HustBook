import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AddPost from '../components/post/AddPost.vue'
import apiService from '../services/api'
import { useUserState } from '../store/user-state'
import { createRouter, createMemoryHistory } from 'vue-router'
import UnsavedChangesModal from '../components/shared/UnsavedChangesModal.vue'
import logger from '../services/logging'
import { nextTick } from 'vue'

vi.mock('../services/api', () => ({
    default: {
        upload: vi.fn()
    }
}))
vi.mock('../store/user-state')
vi.mock('../services/logging')

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
    readAsDataURL: vi.fn(),
    onload: null,
    result: 'data:image/jpeg;base64,fake-image-data'
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:fake-url')

// Mock video element
const mockVideoElement = {
    src: '',
    preload: '',
    onloadedmetadata: null,
    duration: 0
}

// Mock document.createElement
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName) => {
    if (tagName === 'video') {
        return mockVideoElement
    }
    return originalCreateElement.call(document, tagName)
})

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
            sessionId: 'fake-session-id'
        })
        wrapper = mount(AddPost, {
            global: {
                plugins: [router],
                stubs: {
                    UnsavedChangesModal: true
                }
            },
            attachTo: document.body
        })
    })

    afterEach(() => {
        wrapper.unmount()
    })
    it('1. Successfully creates a post with multiple images and valid data', async () => {
        const file1 = new File([''], 'test1.jpg', { type: 'image/jpeg' })
        const file2 = new File([''], 'test2.jpg', { type: 'image/jpeg' })

        apiService.upload.mockResolvedValueOnce({
            data: {
                code: '1000',
                message: 'Post created successfully!',
                data: { id: 'fake-post-id' }
            }
        })

        await wrapper.vm.handleFileUpload({ target: { files: [file1, file2] } })
        await nextTick()

        await wrapper.find('textarea').setValue('Test post content')

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        // Wait for the next tick to ensure reactive properties are updated
        await nextTick()

        expect(apiService.upload).toHaveBeenCalledWith(
            'http://localhost:3000/api/posts/add_post',
            expect.any(FormData),
            expect.any(Function)
        )
        expect(wrapper.vm.successMessage).toBe('Post created successfully!')
    })

    it('2. Redirects to login screen when session ID is invalid', async () => {
        const error = new Error('Invalid token')
        error.response = { status: 401, data: { code: '9998', message: 'Invalid token' } }
        apiService.upload.mockRejectedValueOnce(error)

        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })

        await wrapper.vm.handleFileUpload({ target: { files: [file] } })
        await nextTick()

        await wrapper.find('textarea').setValue('Test post content')

        vi.spyOn(router, 'push')

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid session. Please log in again.')
        expect(router.push).toHaveBeenCalledWith('/login')
    })

    it('3. Displays error when image size is too large', async () => {
        const largeFile = new File([''.padStart(6 * 1024 * 1024, 'x')], 'large.jpg', { type: 'image/jpeg' })

        await wrapper.vm.handleFileUpload({ target: { files: [largeFile] } })
        await nextTick()

        expect(wrapper.vm.fileError).toBe('File size is too big (max 5MB for images, 10MB for videos)')
    })

    it('4. Displays error when video duration or size is too large', async () => {
        const largeVideo = new File([''.padStart(11 * 1024 * 1024, 'x')], 'large.mp4', { type: 'video/mp4' })

        await wrapper.vm.handleFileUpload({ target: { files: [largeVideo] } })
        await nextTick()

        expect(wrapper.vm.fileError).toBe('Video duration should be less than 60 seconds and size should be less than 10MB')

        // Reset fileError
        wrapper.vm.fileError = ''

        // Test for duration
        const normalSizeVideo = new File([''.padStart(5 * 1024 * 1024, 'x')], 'long.mp4', { type: 'video/mp4' })

        await wrapper.vm.handleFileUpload({ target: { files: [normalSizeVideo] } })

        // Manually trigger the onloadedmetadata event
        mockVideoElement.duration = 61
        mockVideoElement.onloadedmetadata()

        await nextTick()

        expect(wrapper.vm.fileError).toBe('Video duration should be less than 60 seconds and size should be less than 10MB')
    })

    it('5. Inserts emoji into description', async () => {
        await wrapper.find('textarea').setValue('Hello ')
        await wrapper.vm.insertEmoji('😊')
        expect(wrapper.vm.description).toBe('Hello 😊')
    })

    it('6. Detects links in description', async () => {
        await wrapper.find('textarea').setValue('Check out https://example.com')
        await nextTick()
        expect(wrapper.vm.highlightedDescription).toContain('<a href="https://example.com"')
    })

    it('7. Shows unsaved changes modal when navigating away', async () => {
        await wrapper.find('textarea').setValue('Unsaved content')

        wrapper.vm.handleRouteChange({ name: 'Home' }, { name: 'AddPost' }, vi.fn())
        await nextTick()

        expect(wrapper.vm.showUnsavedChangesModal).toBe(true)
    })

    it('8. Saves and loads draft', async () => {
        const content = 'Draft content'
        await wrapper.find('textarea').setValue(content)
        await nextTick()

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

        await wrapper.vm.handleFileUpload({ target: { files: [file] } })
        await nextTick()

        await wrapper.find('textarea').setValue('Test post content')

        const error = new Error('Server error')
        error.response = { status: 500, data: { code: '9999', message: 'Server error' } }
        apiService.upload.mockRejectedValueOnce(error)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Server error')
        expect(logger.error).toHaveBeenCalledWith('Error in submitPost', expect.any(Error))
    })

    it('10. Handles network disconnection during posting', async () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })

        await wrapper.vm.handleFileUpload({ target: { files: [file] } })
        await nextTick()

        await wrapper.find('textarea').setValue('Test post content')

        const networkError = new Error('Network Error')
        networkError.request = {}
        networkError.response = undefined
        apiService.upload.mockRejectedValue(networkError)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Network connection error. Please check your internet connection and try again.')
        expect(logger.error).toHaveBeenCalledWith('Error in submitPost', expect.any(Error))
    })
})