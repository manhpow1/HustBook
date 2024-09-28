import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChangeInfoAfterSignup from '../components/user/ChangeInfoAfterSignup.vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useUserState } from '../store/user-state'

vi.mock('axios')
vi.mock('vue-router')
vi.mock('../store/user-state')

describe('ChangeInfoAfterSignup Component', () => {
    let wrapper
    let mockRouter
    let mockToken

    beforeEach(() => {
        vi.clearAllMocks()
        mockRouter = {
            push: vi.fn()
        }
        mockToken = { value: 'valid-token' }

        useRouter.mockReturnValue(mockRouter)
        useUserState.mockReturnValue({ token: mockToken })

        wrapper = mount(ChangeInfoAfterSignup, {
            global: {
                stubs: ['UserPlusIcon', 'CheckCircleIcon', 'XCircleIcon', 'LoaderIcon'],
                mocks: {
                    $router: mockRouter
                }
            }
        })
    })

    it('1. Successfully updates profile with valid session code, username, and avatar', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    id: '123',
                    username: 'validuser',
                    avatar: 'http://example.com/avatar.jpg',
                    is_blocked: false
                }
            }
        }
        axios.post.mockResolvedValue(mockResponse)

        await wrapper.find('input[type="text"]').setValue('validuser')
        const file = new File([''], 'avatar.jpg', { type: 'image/jpeg' })
        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
            value: [file]
        })
        await input.trigger('change')
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(FormData),
            expect.objectContaining({
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': 'Bearer valid-token'
                }
            })
        )
        expect(wrapper.vm.successMessage).toBe('Profile updated successfully!')
    })

    it('2. Shows error for invalid session code', async () => {
        mockToken.value = ''

        // Directly call the checkToken function instead of trying to trigger the watch
        await wrapper.vm.checkToken('')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid token')
        expect(mockRouter.push).toHaveBeenCalledWith({ name: 'Login' })
    })

    it('3. Redirects to login for old or someone else\'s session code', async () => {
        const mockResponse = {
            response: {
                data: { code: '9998', message: 'Invalid token' }
            }
        }
        axios.post.mockRejectedValue(mockResponse)

        await wrapper.find('input[type="text"]').setValue('validuser')
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid token')
        expect(mockRouter.push).toHaveBeenCalledWith({ name: 'Login' })
    })

    it('4. Shows error for invalid username format', async () => {
        await wrapper.find('input[type="text"]').setValue('inv@lid')
        await wrapper.find('form').trigger('submit')

        expect(wrapper.vm.usernameError).toBe('Username cannot contain special characters')
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('5. Redirects to login for blocked account', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: { is_blocked: true }
            }
        }
        axios.post.mockResolvedValue(mockResponse)

        await wrapper.find('input[type="text"]').setValue('blockeduser')
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Your account has been blocked')
        expect(mockRouter.push).toHaveBeenCalledWith({ name: 'Login' })
    })

    it('6. Shows error for avatar file size too large', async () => {
        const largeFile = new File([''.padStart(5 * 1024 * 1024)], 'large-avatar.jpg', { type: 'image/jpeg' })

        const input = wrapper.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
            value: [largeFile]
        })
        await input.trigger('change')

        expect(wrapper.vm.avatarError).toBe('Avatar file size is too large. Maximum size is 4MB.')
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('7. Shows error for username that looks like a phone number', async () => {
        await wrapper.find('input[type="text"]').setValue('(123) 456-7890')
        await wrapper.find('form').trigger('submit')

        await flushPromises()

        expect(wrapper.vm.usernameError).toBe('Username cannot be a phone number')
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('8. Shows error for username that looks like an address', async () => {
        await wrapper.find('input[type="text"]').setValue('123 Main Street')
        await wrapper.find('form').trigger('submit')

        expect(wrapper.vm.usernameError).toBe('Username cannot be an address')
        expect(axios.post).not.toHaveBeenCalled()
    })
})