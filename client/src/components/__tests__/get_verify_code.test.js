import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import GetVerifyCode from '../GetVerifyCode.vue'
import axios from 'axios'

vi.mock('axios')

describe('GetVerifyCode Component', () => {
    let wrapper

    beforeEach(() => {
        vi.useFakeTimers()
        wrapper = mount(GetVerifyCode)
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.useRealTimers()
    })

    it('1. Allows requesting a new code when the old one is lost', async () => {
        const mockResponse1 = { data: { code: '1000', message: 'OK', data: { verifyCode: '123456' } } }
        const mockResponse2 = { data: { code: '1000', message: 'OK', data: { verifyCode: '789012' } } }
        axios.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2)

        await wrapper.find('input[type="tel"]').setValue('0123456789')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.successMessage).toContain('Verification code sent successfully')
        expect(wrapper.vm.successMessage).toContain('(Code: 123456)')

        // Fast-forward time by 121 seconds
        vi.advanceTimersByTime(121000)

        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.successMessage).toContain('Verification code sent successfully')
        expect(wrapper.vm.successMessage).toContain('(Code: 789012)')
        expect(axios.post).toHaveBeenCalledTimes(2)
    })

    it('2. Prevents requesting a new code within 120 seconds', async () => {
        const mockResponse = { data: { code: '1000', message: 'OK', data: { verifyCode: '123456' } } }
        axios.post.mockResolvedValue(mockResponse)

        await wrapper.find('input[type="tel"]').setValue('0123456789')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.successMessage).toContain('Verification code sent successfully')

        // Try to request again immediately
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toContain('Please wait')
        expect(axios.post).toHaveBeenCalledTimes(1)

        // Advance time by 119 seconds
        vi.advanceTimersByTime(119000)
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toContain('Please wait')
        expect(axios.post).toHaveBeenCalledTimes(1)

        // Advance time by 1 more second (total 120 seconds)
        vi.advanceTimersByTime(1000)
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.successMessage).toContain('Verification code sent successfully')
        expect(axios.post).toHaveBeenCalledTimes(2)
    })

    it('3. Returns error for already registered phone number', async () => {
        const mockResponse = { response: { data: { code: '1010', message: 'Action has been done previously by this user' } } }
        axios.post.mockRejectedValue(mockResponse)

        await wrapper.find('input[type="tel"]').setValue('0123456789')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Action has been done previously by this user')
    })

    it('4. Returns error for unregistered phone number', async () => {
        const mockResponse = { response: { data: { code: '9995', message: 'User is not validated' } } }
        axios.post.mockRejectedValue(mockResponse)

        await wrapper.find('input[type="tel"]').setValue('0123456789')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('User is not validated')
    })

    it('5. Validates phone number format on client side', async () => {
        await wrapper.find('input[type="tel"]').setValue('123')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('6. Returns error for invalid phone number format from server', async () => {
        const mockResponse = { response: { data: { code: '1004', message: 'Invalid phone number format' } } }
        axios.post.mockRejectedValue(mockResponse)

        // Use a valid format to bypass client-side validation
        await wrapper.find('input[type="tel"]').setValue('0123456789')
        await wrapper.find('form').trigger('submit')
        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid phone number format')
    })
})