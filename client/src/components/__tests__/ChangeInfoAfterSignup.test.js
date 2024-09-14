import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChangeInfoAfterSignup from '../ChangeInfoAfterSignup.vue'
import axios from 'axios'
import { useUserState } from '../../userState'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('axios')
vi.mock('../../userState')

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/login', component: { template: '<div>Login</div>' } }
    ]
})

describe('ChangeInfoAfterSignup Component', () => {
    let wrapper

    beforeEach(() => {
        vi.clearAllMocks()
        useUserState.mockReturnValue({
            token: { value: 'valid-token' }
        })
        wrapper = mount(ChangeInfoAfterSignup, {
            global: {
                plugins: [router],
                stubs: {
                    teleport: true
                }
            }
        })
    })

    it('1. Sends correct login session code, username, and avatar', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    id: '123',
                    username: 'validuser',
                    phonenumber: '1234567890',
                    created: '2023-01-01',
                    avatar: 'http://example.com/avatar.jpg',
                    is_blocked: false,
                    online: true
                }
            }
        }
        axios.post.mockResolvedValue(mockResponse)

        await wrapper.find('input[type="text"]').setValue('validuser')
        const file = new File([''], 'avatar.jpg', { type: 'image/jpeg' })
        await wrapper.vm.handleFileChange({ target: { files: [file] } })
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/change_info_after_signup',
            expect.any(FormData),
            expect.any(Object)
        )
        expect(wrapper.vm.successMessage).toBe('Profile updated successfully!')
    })

    it('2. Sends wrong login session code', async () => {
        useUserState.mockReturnValue({
            token: { value: '' }
        })

        // Remount the component to trigger the watch function
        wrapper = mount(ChangeInfoAfterSignup, {
            global: {
                plugins: [router],
                stubs: {
                    teleport: true
                }
            }
        })

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid token')

        await wrapper.find('input[type="text"]').setValue('validuser')
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid token')
    })

    it('3. Sends someone else\'s or old session code', async () => {
        const mockResponse = {
            response: {
                data: {
                    code: '9998',
                    message: 'Invalid token'
                }
            }
        }
        axios.post.mockRejectedValue(mockResponse)

        await wrapper.find('input[type="text"]').setValue('validuser')
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(router.currentRoute.value.path).toBe('/login')
        expect(wrapper.vm.errorMessage).toBe('Invalid token')
    })

    it('4. Sends valid session code but invalid username', async () => {
        await wrapper.find('input[type="text"]').setValue('invalid@user')
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Username cannot contain special characters')
    })

    it('5. Sends valid session code but blocked username', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    is_blocked: true
                }
            }
        }
        axios.post.mockResolvedValue(mockResponse)

        await wrapper.find('input[type="text"]').setValue('blockeduser')
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(router.currentRoute.value.path).toBe('/login')
        expect(wrapper.vm.errorMessage).toBe('Your account has been blocked')
    })

    it('6. Sends valid session code and username but avatar is too large', async () => {
        const largeFile = new File([''], 'large-avatar.jpg', { type: 'image/jpeg' })
        Object.defineProperty(largeFile, 'size', { value: 5 * 1024 * 1024 }) // 5MB

        await wrapper.find('input[type="text"]').setValue('validuser')
        await wrapper.vm.handleFileChange({ target: { files: [largeFile] } })

        expect(wrapper.vm.errorMessage).toBe('Avatar file size is too large. Maximum size is 4MB.')
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('7. Sends valid session code and username but avatar is rejected by server', async () => {
        const mockResponse = {
            response: {
                data: {
                    code: '1006',
                    message: 'File upload failed'
                }
            }
        }
        axios.post.mockRejectedValue(mockResponse)

        await wrapper.find('input[type="text"]').setValue('validuser')
        const file = new File([''], 'avatar.jpg', { type: 'image/jpeg' })
        await wrapper.vm.handleFileChange({ target: { files: [file] } })
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('File upload failed. Please try again or proceed without an avatar.')
        expect(wrapper.findAll('button').some(w => w.text().includes('Continue without avatar'))).toBe(true)
        expect(wrapper.findAll('button').some(w => w.text().includes('Try again'))).toBe(true)
    })
})