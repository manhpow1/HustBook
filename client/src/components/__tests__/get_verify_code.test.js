import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { mount, flushPromises } from '@vue/test-utils'
import GetVerifyCode from '../GetVerifyCode.vue'

vi.mock('axios')

describe('GetVerifyCode Component', () => {
    let wrapper
    const mockAxios = vi.mocked(axios, true)

    beforeEach(() => {
        vi.useFakeTimers()
        wrapper = mount(GetVerifyCode)
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.useRealTimers()
    })

    it('1. Allows requesting a new code when the old one is lost', async () => {
        mockAxios.post.mockResolvedValueOnce({ data: { code: '1000', message: 'Verification code sent successfully', data: { verifyCode: '123456' } } })
        mockAxios.post.mockResolvedValueOnce({ data: { code: '1000', message: 'Verification code sent successfully', data: { verifyCode: '789012' } } })

        await wrapper.setData({ phonenumber: '0123456789' })
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        console.log("Component data after first request:", wrapper.vm.$data)

        expect(wrapper.vm.successMessage).toContain('Verification code sent successfully')
        expect(wrapper.vm.successMessage).toContain('(Code: 123456)')
        expect(mockAxios.post).toHaveBeenCalledTimes(1)

        // Request again
        vi.advanceTimersByTime(120000) // Advance time by 120 seconds
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        console.log("Component data after second request:", wrapper.vm.$data)

        expect(wrapper.vm.successMessage).toContain('Verification code sent successfully')
        expect(wrapper.vm.successMessage).toContain('(Code: 789012)')
        expect(mockAxios.post).toHaveBeenCalledTimes(2)
    })

    it('2. Prevents requesting a new code within 120 seconds', async () => {
        mockAxios.post.mockResolvedValueOnce({ data: { code: '1000', message: 'Verification code sent successfully', data: { verifyCode: '123456' } } })

        await wrapper.setData({ phonenumber: '0123456789' })
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        expect(wrapper.vm.successMessage).toContain('Verification code sent successfully')

        // Try to request again immediately
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toContain('Please wait')
        expect(mockAxios.post).toHaveBeenCalledTimes(1)

        // Advance time by 119 seconds
        vi.advanceTimersByTime(119000)
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toContain('Please wait')
        expect(mockAxios.post).toHaveBeenCalledTimes(1)

        // Advance time by 1 more second (total 120 seconds)
        vi.advanceTimersByTime(1000)
        mockAxios.post.mockResolvedValueOnce({ data: { code: '1000', message: 'Verification code sent successfully', data: { verifyCode: '789012' } } })
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        expect(wrapper.vm.successMessage).toContain('Verification code sent successfully')
        expect(wrapper.vm.successMessage).toContain('(Code: 789012)')
        expect(mockAxios.post).toHaveBeenCalledTimes(2)
    })

    it('3. Returns error for already registered phone number', async () => {
        mockAxios.post.mockRejectedValueOnce({
            response: {
                data: { code: '1004', message: 'Phone number already registered' }
            }
        })

        await wrapper.setData({ phonenumber: '0123456789' })
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        console.log("Component data after already registered error:", wrapper.vm.$data)

        expect(wrapper.vm.errorMessage).toBe('Phone number already registered')
    })

    it('4. Returns error for unregistered phone number', async () => {
        mockAxios.post.mockRejectedValueOnce({
            response: {
                data: { code: '9995', message: 'User is not validated' }
            }
        })

        await wrapper.setData({ phonenumber: '0123456789' })
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        console.log("Component data after unregistered phone number error:", wrapper.vm.$data)

        expect(wrapper.vm.errorMessage).toBe('User is not validated')
    })

    it('5. Validates phone number format on client side', async () => {
        await wrapper.setData({ phonenumber: '123' }) // Invalid format
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        console.log("Component data after invalid phone number:", wrapper.vm.$data)

        expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
        expect(mockAxios.post).not.toHaveBeenCalled()
    })

    it('6. Returns error for invalid phone number format from server', async () => {
        mockAxios.post.mockRejectedValueOnce({
            response: {
                data: { code: '1004', message: 'Invalid phone number format' }
            }
        })

        await wrapper.setData({ phonenumber: '0123456789' }) // Valid format, but server rejects
        await wrapper.find('form').trigger('submit.prevent')
        await flushPromises()

        console.log("Component data after server-side invalid phone number:", wrapper.vm.$data)

        expect(wrapper.vm.errorMessage).toBe('Invalid phone number format')
    })
})