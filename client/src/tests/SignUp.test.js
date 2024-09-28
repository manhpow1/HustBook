import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SignUp from '../components/auth/SignUp.vue'
import axios from 'axios'
import { createRouter, createWebHistory } from 'vue-router'

vi.mock('axios')
vi.mock('../store/user-state', () => ({
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
          verificationCode: '123ABC',
          token: 'mockToken',
          deviceToken: 'mockDeviceToken'
        }
      }
    }
    axios.post.mockResolvedValue(mockResponse)

    await wrapper.find('input[type="tel"]').setValue('0123456789')
    await wrapper.find('input[type="password"]').setValue('validPass')

    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/signup',
      expect.objectContaining({
        phonenumber: '0123456789',
        password: 'validPass',
        uuid: 'device-uuid',
        rememberMe: false
      })
    )

    expect(wrapper.emitted('signup-success')).toBeTruthy()
    expect(wrapper.emitted('signup-success')[0]).toEqual(['123ABC'])
  })

  it('2. Fails to sign up with already registered phone number', async () => {
    const mockError = { response: { data: { code: '9996', message: 'User existed' } } }
    axios.post.mockRejectedValue(mockError)

    await wrapper.find('input[type="tel"]').setValue('0987654321')
    await wrapper.find('input[type="password"]').setValue('password')
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.emitted('signup-error')).toBeTruthy()
    expect(wrapper.emitted('signup-error')[0]).toEqual(['User existed'])
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
    await wrapper.find('input[type="password"]').setValue('short')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.passwordError).toContain('Password must be 6-10 characters long')
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('5. Shows error when submitting empty form', async () => {
    console.log("Test case 5: Submitting empty form")
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    console.log("phoneError:", wrapper.vm.phoneError)
    console.log("passwordError:", wrapper.vm.passwordError)

    expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
    expect(wrapper.vm.passwordError).toBe('Password is required')
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('6. Handles network error', async () => {
    const mockError = { request: {} }  // Simulating a network error
    axios.post.mockRejectedValue(mockError)

    await wrapper.find('input[type="tel"]').setValue('0123456789')
    await wrapper.find('input[type="password"]').setValue('password')
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.emitted('signup-error')).toBeTruthy()
    expect(wrapper.emitted('signup-error')[0]).toEqual(['An unexpected error occurred. Please try again.'])
  })

  it('7. Displays password strength indicator', async () => {
    await wrapper.find('input[type="password"]').setValue('short')
    expect(wrapper.vm.passwordStrength).toBe(25)
    expect(wrapper.vm.passwordStrengthClass).toBe('bg-red-500')

    await wrapper.find('input[type="password"]').setValue('medium12')
    expect(wrapper.vm.passwordStrength).toBe(88)
    expect(wrapper.vm.passwordStrengthClass).toBe('bg-green-500')

    await wrapper.find('input[type="password"]').setValue('Strong123')
    expect(wrapper.vm.passwordStrength).toBe(100)
    expect(wrapper.vm.passwordStrengthClass).toBe('bg-green-500')

    await wrapper.find('input[type="password"]').setValue('toolongpassword')
    expect(wrapper.vm.passwordStrength).toBe(50)
    expect(wrapper.vm.passwordStrengthClass).toBe('bg-yellow-500')
  })

  it('8. Shows detailed password error messages', async () => {
    console.log("Test case 8: Detailed password error messages")
    await wrapper.find('input[type="password"]').setValue('a')
    await wrapper.find('form').trigger('submit.prevent')
    console.log("passwordError:", wrapper.vm.passwordError)
    expect(wrapper.vm.passwordError).toBe('Password must be 6-10 characters long')

    await wrapper.find('input[type="password"]').setValue('longpassword123')
    await wrapper.find('form').trigger('submit.prevent')
    console.log("passwordError:", wrapper.vm.passwordError)
    expect(wrapper.vm.passwordError).toBe('Password must be 6-10 characters long')

    await wrapper.find('input[type="password"]').setValue('pass@123')
    await wrapper.find('form').trigger('submit.prevent')
    console.log("passwordError:", wrapper.vm.passwordError)
    expect(wrapper.vm.passwordError).toBe('Password must contain only letters and numbers')

    await wrapper.find('input[type="tel"]').setValue('0123456789')
    await wrapper.find('input[type="password"]').setValue('0123456789')
    await wrapper.find('form').trigger('submit.prevent')
    console.log("passwordError:", wrapper.vm.passwordError)
    expect(wrapper.vm.passwordError).toBe('Password must not match the phone number')
  })
})