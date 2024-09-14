import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import VerifyCode from '../VerifyCode.vue'
import axios from 'axios'

vi.mock('axios')

describe('VerifyCode Component', () => {
    let wrapper
    let mockRouter

    beforeEach(() => {
        vi.resetAllMocks()
        mockRouter = {
            push: vi.fn()
        }
        wrapper = mount(VerifyCode, {
            global: {
                mocks: {
                    $router: mockRouter
                }
            }
        })
    })

    it('1. Successful verification with correct phone number and code', async () => {
        const mockResponse = {
            data: {
                code: '1000',
                message: 'OK',
                data: {
                    token: 'mock-token',
                    id: 'user-id',
                    active: '1'
                }
            }
        }
        axios.post.mockResolvedValue(mockResponse)

        await wrapper.setData({ phonenumber: '0123456789', code: '123456' })
        await wrapper.find('form').trigger('submit.prevent')

        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/check_verify_code',
            { phonenumber: '0123456789', code: '123456' }
        )
        expect(wrapper.vm.successMessage).toBe('Verification successful!')
        expect(mockRouter.push).toHaveBeenCalledWith('/')
    })

    it('2. Incorrect phone number format', async () => {
        await wrapper.setData({ phonenumber: '123', code: '123456' })
        await wrapper.find('form').trigger('submit.prevent')

        expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('3. Valid phone number format but not in the list', async () => {
        const mockResponse = {
            response: {
                data: { code: '9995', message: 'User is not validated' }
            }
        }
        axios.post.mockRejectedValue(mockResponse)

        await wrapper.setData({ phonenumber: '0123456789', code: '123456' })
        await wrapper.find('form').trigger('submit.prevent')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('User is not validated')
    })

    it('4. Phone number already authorized', async () => {
        const mockResponse = {
            response: {
                data: { code: '9996', message: 'User already verified' }
            }
        }
        axios.post.mockRejectedValue(mockResponse)

        await wrapper.setData({ phonenumber: '0123456789', code: '123456' })
        await wrapper.find('form').trigger('submit.prevent')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('User already verified')
    })

    it('5. Valid phone number but incorrect authentication code', async () => {
        const mockResponse = {
            response: {
                data: { code: '1004', message: 'Invalid verification code' }
            }
        }
        axios.post.mockRejectedValue(mockResponse)

        await wrapper.setData({ phonenumber: '0123456789', code: '654321' })
        await wrapper.find('form').trigger('submit.prevent')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid verification code')
    })

    it('6. Missing authentication code', async () => {
        await wrapper.setData({ phonenumber: '0123456789', code: '' })
        await wrapper.find('form').trigger('submit.prevent')

        expect(wrapper.vm.codeError).toBe('Verification code must be 6 digits')
        expect(axios.post).not.toHaveBeenCalled()
    })
})