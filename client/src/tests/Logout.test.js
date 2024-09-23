import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Logout from '../components/Logout.vue'
import axios from 'axios'
import { useUserState } from '../store/user-state'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('axios')
vi.mock('../store/user-state')

const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/login', name: 'Login', component: { template: '<div>Login</div>' } }]
})

describe('Logout Component', () => {
    let wrapper
    let mockRouter
    let mockLogout

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
        mockLogout = vi.fn()
        useUserState.mockReturnValue({ logout: mockLogout })
        
        wrapper = mount(Logout, {
            global: {
                plugins: [router],
                stubs: ['LogOut', 'Loader', 'CheckCircle', 'AlertCircle']
            }
        })
        mockRouter = router
        localStorage.clear()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('1. User logs out successfully from a single device', async () => {
        localStorage.setItem('token', 'mock-token')
        axios.post.mockResolvedValue({ data: { code: '1000', message: 'OK' } })

        await wrapper.find('button').trigger('click')
        await wrapper.find('button:nth-child(2)').trigger('click')
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token' } }
        )
        expect(localStorage.getItem('token')).toBeNull()
        expect(mockLogout).toHaveBeenCalled()
        expect(wrapper.vm.message).toBe('Logout successful. Redirecting...')
        expect(wrapper.vm.messageClass).toBe('bg-green-500')
        
        vi.runAllTimers()
        await flushPromises()
        
        expect(mockRouter.currentRoute.value.path).toBe('/login')
    })

    it('2. User logs out successfully after logging in on multiple devices (Device A offline, then online)', async () => {
        localStorage.setItem('token', 'mock-token-device-A')
        axios.post.mockResolvedValue({ data: { code: '1000', message: 'OK' } })

        await wrapper.find('button').trigger('click')
        await wrapper.find('button:nth-child(2)').trigger('click')
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token-device-A' } }
        )
        expect(localStorage.getItem('token')).toBeNull()
        expect(mockLogout).toHaveBeenCalled()
        expect(wrapper.vm.message).toBe('Logout successful. Redirecting...')
        
        vi.runAllTimers()
        await flushPromises()
        
        expect(mockRouter.currentRoute.value.path).toBe('/login')
    })

    it('3. User logs out successfully after logging in on multiple devices and logging out on one (Device A offline, then online)', async () => {
        localStorage.setItem('token', 'mock-token-device-A')
        axios.post.mockResolvedValue({ data: { code: '1000', message: 'OK' } })

        await wrapper.find('button').trigger('click')
        await wrapper.find('button:nth-child(2)').trigger('click')
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token-device-A' } }
        )
        expect(localStorage.getItem('token')).toBeNull()
        expect(mockLogout).toHaveBeenCalled()
        expect(wrapper.vm.message).toBe('Logout successful. Redirecting...')
        
        vi.runAllTimers()
        await flushPromises()
        
        expect(mockRouter.currentRoute.value.path).toBe('/login')
    })

    it('4. User logs out from one device while another is offline', async () => {
        localStorage.setItem('token', 'mock-token-device-B')
        axios.post.mockResolvedValue({ data: { code: '1000', message: 'OK' } })

        await wrapper.find('button').trigger('click')
        await wrapper.find('button:nth-child(2)').trigger('click')
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token-device-B' } }
        )
        expect(localStorage.getItem('token')).toBeNull()
        expect(mockLogout).toHaveBeenCalled()
        expect(wrapper.vm.message).toBe('Logout successful. Redirecting...')
        
        vi.runAllTimers()
        await flushPromises()
        
        expect(mockRouter.currentRoute.value.path).toBe('/login')
    })

    it('handles logout failure', async () => {
        localStorage.setItem('token', 'mock-token')
        axios.post.mockRejectedValue({ response: { data: { message: 'Error occurred' } } })

        await wrapper.find('button').trigger('click')
        await wrapper.find('button:nth-child(2)').trigger('click')
        await flushPromises()

        expect(axios.post).toHaveBeenCalledWith(
            'http://localhost:3000/api/auth/logout',
            null,
            { headers: { Authorization: 'Bearer mock-token' } }
        )
        expect(localStorage.getItem('token')).not.toBeNull()
        expect(mockLogout).not.toHaveBeenCalled()
        expect(wrapper.vm.message).toBe('Error occurred')
        expect(wrapper.vm.messageClass).toBe('bg-red-500')
    })

    it('cancels logout when cancel button is clicked', async () => {
        localStorage.setItem('token', 'mock-token')

        await wrapper.find('button').trigger('click')
        expect(wrapper.vm.showConfirmation).toBe(true)

        await wrapper.findAll('button').at(1).trigger('click') // Cancel logout
        await wrapper.vm.$nextTick() // Wait for the next DOM update cycle

        expect(wrapper.vm.showConfirmation).toBe(false)
        expect(axios.post).not.toHaveBeenCalled()
        expect(localStorage.getItem('token')).toBe('mock-token')
        expect(mockLogout).not.toHaveBeenCalled()
    })
})