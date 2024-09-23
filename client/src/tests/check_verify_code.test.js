import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import VerifyCode from '../components/VerifyCode.vue'
import axios from 'axios'

vi.mock('axios')

vi.mock('vue-router', () => ({
    useRouter: vi.fn(() => ({
        push: vi.fn()
    }))
}))

describe('VerifyCode Component', () => {
    let wrapper

    beforeEach(() => {
        vi.clearAllMocks()
        wrapper = mount(VerifyCode, {
            global: {
                stubs: ['ShieldCheckIcon', 'PhoneIcon', 'LoaderIcon', 'CheckCircleIcon', 'XCircleIcon']
            },
            props: {
                initialPhoneNumber: ''
            }
        })
    })

    const fillForm = async (phone, code) => {
        await wrapper.find('input[type="tel"]').setValue(phone)
        for (let i = 0; i < 6; i++) {
            await wrapper.findAll('input[type="text"]')[i].setValue(code[i])
        }
    }

    it('1. Successfully verifies with correct phone number and code', async () => {
        const mockResponse = {
            data: { code: '1000', message: 'OK', data: { token: 'mockToken', id: 'userId' } }
        }
        axios.post.mockResolvedValue(mockResponse)

        await fillForm('0123456789', '123456')
        await wrapper.find('form').trigger('submit.prevent')

        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            expect.any(String),
            { phonenumber: '0123456789', code: '123456' }
        )
        expect(wrapper.emitted('verification-success')).toBeTruthy()
        expect(wrapper.vm.successMessage).toBe('Verification successful!')
    })

    it('2. Shows error for invalid phone number format', async () => {
        await fillForm('123', '123456')
        await wrapper.find('form').trigger('submit.prevent')

        expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('3. Shows error for unregistered phone number', async () => {
        const mockResponse = { response: { data: { code: '9995', message: 'User is not validated' } } }
        axios.post.mockRejectedValue(mockResponse)

        await fillForm('0987654321', '123456')
        await wrapper.find('form').trigger('submit.prevent')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('User is not validated')
        expect(wrapper.emitted('verification-error')).toBeTruthy()
    })

    it('4. Shows error for already verified phone number', async () => {
        const mockResponse = { response: { data: { code: '9996', message: 'User already verified' } } }
        axios.post.mockRejectedValue(mockResponse)

        await fillForm('0123456789', '123456')
        await wrapper.find('form').trigger('submit.prevent')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('User already verified')
        expect(wrapper.emitted('verification-error')).toBeTruthy()
    })

    it('5. Shows error for incorrect verification code', async () => {
        const mockResponse = { response: { data: { code: '1004', message: 'Invalid verification code' } } }
        axios.post.mockRejectedValue(mockResponse)

        await fillForm('0123456789', '111111')
        await wrapper.find('form').trigger('submit.prevent')

        await flushPromises()

        expect(wrapper.vm.errorMessage).toBe('Invalid verification code')
        expect(wrapper.emitted('verification-error')).toBeTruthy()
    })

    it('6. Shows error when verification code is missing', async () => {
        await wrapper.find('input[type="tel"]').setValue('0123456789')
        await wrapper.find('form').trigger('submit.prevent')

        expect(wrapper.vm.codeError).toBe('Verification code must be 6 digits')
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('7. Handles resend code functionality', async () => {
        const mockResponse = { data: { code: '1000', message: 'OK' } }
        axios.post.mockResolvedValue(mockResponse)

        await wrapper.find('button.text-indigo-600').trigger('click')

        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            expect.any(String),
            { phonenumber: expect.any(String) }
        )
        expect(wrapper.vm.successMessage).toBe('Verification code resent successfully')
    })
})