import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Logout from '../Logout.vue'
import axios from 'axios'

vi.mock('axios')

describe('Logout Component', () => {
    let wrapper;
    let mockRouter;

    beforeEach(() => {
        mockRouter = {
            push: vi.fn()
        }
        wrapper = mount(Logout, {
            global: {
                mocks: {
                    $router: mockRouter
                }
            }
        })
        localStorage.clear()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('1. User logs out successfully from a single device', async () => {
        localStorage.setItem('token', 'mock-token')
        axios.post.mockResolvedValue({ data: { code: '1000', message: 'OK' } })

        wrapper.vm.handleLogout()
        await flushPromises()

        vi.runAllTimers()
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token' } }
        )
        expect(localStorage.getItem('token')).toBeNull()
        expect(mockRouter.push).toHaveBeenCalledWith('/login')
        expect(wrapper.text()).toContain('OK')
    })

    it('2 & 3. User logs out successfully after logging in on multiple devices', async () => {
        localStorage.setItem('token', 'mock-token-device-B')
        axios.post.mockResolvedValue({ data: { code: '1000', message: 'OK' } })

        wrapper.vm.handleLogout()
        await flushPromises()

        vi.runAllTimers()
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token-device-B' } }
        )
        expect(localStorage.getItem('token')).toBeNull()
        expect(mockRouter.push).toHaveBeenCalledWith('/login')
        expect(wrapper.text()).toContain('OK')
    })

    it('4. User logs out from one device while another is offline', async () => {
        localStorage.setItem('token', 'mock-token-device-B')
        axios.post.mockResolvedValue({ data: { code: '1000', message: 'OK' } })

        wrapper.vm.handleLogout()
        await flushPromises()

        vi.runAllTimers()
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token-device-B' } }
        )
        expect(localStorage.getItem('token')).toBeNull()
        expect(mockRouter.push).toHaveBeenCalledWith('/login')
        expect(wrapper.text()).toContain('OK')
    })

    it('handles logout failure', async () => {
        localStorage.setItem('token', 'mock-token')
        axios.post.mockRejectedValue({ response: { data: { code: '1001', message: 'Error occurred' } } })

        wrapper.vm.handleLogout()
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token' } }
        )
        expect(localStorage.getItem('token')).not.toBeNull()
        expect(mockRouter.push).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('Error occurred')
    })
})