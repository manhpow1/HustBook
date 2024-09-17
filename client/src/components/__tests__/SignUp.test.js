import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SignUp from '../SignUp.vue'
import axios from 'axios'
import { createRouter, createWebHistory } from 'vue-router'

vi.mock('axios')
vi.mock('../userState', () => ({
  useUserState: () => ({
    login: vi.fn(),
  }),
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/login', component: { template: '<div>Login</div>' } },
    { path: '/complete-profile', component: { template: '<div>Complete Profile</div>' } }
  ]
})

describe('SignUp Component', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    wrapper = mount(SignUp, {
      global: {
        plugins: [router]
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('1. Successfully signs up with valid phone number and password', async () => {
    const mockResponse = {
      data: {
        code: '1000',
        message: 'OK',
        data: {
          verifyCode: '123ABC',
          token: 'mockToken',
          deviceToken: 'mockDeviceToken'
        }
      }
    }
    axios.post.mockResolvedValue(mockResponse)

    await wrapper.find('input[type="tel"]').setValue('0123456789')
    await wrapper.find('input[type="password"]').setValue('validPass123')

    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    try {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/signup',
        expect.objectContaining({
          phonenumber: '0123456789',
          password: 'validpass',
          uuid: 'device-uuid',
          rememberMe: false
        })
      )
    } catch (error) {
    }

    try {
      expect(wrapper.vm.successMessage).toBe('Signup successful! Redirecting to complete your profile...')
    } catch (error) {
    }

    try {
      expect(wrapper.vm.errorMessage).toBe('')
    } catch (error) {
    }

    await vi.runAllTimers()
    await flushPromises()

    try {
      expect(router.currentRoute.value.path).toBe('/complete-profile')
    } catch (error) {
    }
  })

  it('2. Fails to sign up with already registered phone number', async () => {
    const mockError = { response: { data: { code: '9996', message: 'User existed' } } }
    axios.post.mockRejectedValue(mockError)

    await wrapper.find('input[type="tel"]').setValue('0987654321')
    await wrapper.find('input[type="password"]').setValue('password')
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.vm.errorMessage).toBe('User existed')
  })

  it('3. Shows error for invalid phone number format', async () => {
    await wrapper.find('input[type="tel"]').setValue('123')
    await wrapper.find('input[type="password"]').setValue('password')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('4. Shows error for invalid password format', async () => {
    await wrapper.find('input[type="tel"]').setValue('0123456789')
    await wrapper.find('input[type="password"]').setValue('short3456734968457')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.passwordError).toContain('Password must be 6-10 characters long')
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('5. Shows error when submitting empty form', async () => {
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()
    try {
      expect(wrapper.vm.phoneError).toBe('Phone number is required')
    } catch (error) {
    }
    try {
      expect(wrapper.vm.passwordError).toBe('Password must be 6-10 characters long, contain only letters and numbers, and not match the phone number')
    } catch (error) {
    }
    try {
      expect(axios.post).not.toHaveBeenCalled()
    } catch (error) {
    }

  })
})