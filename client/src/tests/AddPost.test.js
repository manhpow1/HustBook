import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AddPost from '../components/AddPost.vue'
import axios from 'axios'
import { useUserState } from '../store/user-state'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('axios')
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
                plugins: [router]
            }
        })
    })

    it('1. Successfully creates a post with valid data', async () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
            value: [file]
        })
        await input.trigger('change')

        await wrapper.find('textarea').setValue('Test post content')
        
        // Simulate clicking the status button
        const statusButton = wrapper.findAll('button').filter(button => button.text() === 'Happy')[0]
        await statusButton.trigger('click')

        axios.post.mockResolvedValue({
            data: { code: '1000', message: 'OK', data: { id: '123', url: 'http://example.com/post/123' } }
        })

        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/posts/add_post',
            expect.any(FormData),
            expect.any(Object)
        )
        expect(wrapper.vm.successMessage).toBe('Post created successfully!')
    })

    it('2. Redirects to login screen when session ID is invalid', async () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
            value: [file]
        })
        await input.trigger('change')

        await wrapper.find('textarea').setValue('Test post content')

        const error = new Error('Invalid token')
        error.response = { status: 401, data: { code: '9998', message: 'Invalid token' } }
        axios.post.mockRejectedValue(error)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        console.log('Error message after invalid session:', wrapper.vm.errorMessage)
        expect(wrapper.vm.errorMessage).toBe('Invalid session. Please log in again.')
        expect(router.currentRoute.value.path).toBe('/login')
    })

    it('3. Displays error when image size is too large', async () => {
        const largeFile = new File([''.padStart(6 * 1024 * 1024, 'x')], 'large.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
            value: [largeFile]
        })
        await input.trigger('change')

        expect(wrapper.vm.fileError).toBe('File size is too big')
    })

    it('4. Displays error when video duration or size is too large', async () => {
        const largeVideo = new File([''.padStart(11 * 1024 * 1024, 'x')], 'large.mp4', { type: 'video/mp4' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
            value: [largeVideo]
        })
        await input.trigger('change')

        expect(wrapper.vm.fileError).toBe('File size is too big')
    })

    it('5. Handles server error while posting', async () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
            value: [file]
        })
        await input.trigger('change')

        await wrapper.find('textarea').setValue('Test post content')

        const error = new Error('Server error')
        error.response = { status: 500, data: { code: '9999', message: 'Server error' } }
        axios.post.mockRejectedValue(error)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        console.log('Error message after server error:', wrapper.vm.errorMessage)
        expect(wrapper.vm.errorMessage).toBe('Server error')
    })

    it('6. Handles network disconnection during posting', async () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
            value: [file]
        })
        await input.trigger('change')

        await wrapper.find('textarea').setValue('Test post content')

        const networkError = new Error('Network Error')
        networkError.request = {}
        networkError.response = undefined
        axios.post.mockRejectedValue(networkError)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        console.log('Error message after network error:', wrapper.vm.errorMessage)
        expect(wrapper.vm.errorMessage).toBe('Network connection error. Please check your internet connection and try again.')
    })
})