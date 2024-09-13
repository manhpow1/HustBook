import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Login from '../Login.vue'
import axios from 'axios'

vi.mock('axios')

describe('Login Component', () => {
  let wrapper;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    wrapper = mount(Login)
    vi.clearAllMocks()
    consoleLogSpy = vi.spyOn(console, 'log')
    consoleErrorSpy = vi.spyOn(console, 'error')
  })

  it('logs in successfully with correct credentials', async () => {
    const mockResponse = {
      data: {
        code: '1000',
        message: 'OK',
        data: {
          id: '123',
          username: 'John Doe',
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          avatar: 'http://example.com/avatar.jpg',
          active: '1'
        }
      }
    }
    axios.post.mockResolvedValue(mockResponse)

    await wrapper.setData({ phonenumber: '0123456789', password: 'password' })
    await wrapper.vm.handleSubmit()

    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        phonenumber: '0123456789',
        password: 'password',
        deviceId: expect.any(String)
      })
    )
    
    expect(wrapper.emitted('login-success')).toBeTruthy()
    expect(wrapper.emitted('login-success')[0][0]).toEqual(mockResponse.data.data)
  })

  it('handles login for unregistered phone number', async () => {
    axios.post.mockRejectedValue({
      response: { data: { code: '9995', message: 'User is not validated' } }
    })

    await wrapper.setData({ phonenumber: '0987654321', password: 'password' })
    await wrapper.vm.handleSubmit()

    await flushPromises()

    expect(wrapper.emitted('login-error')).toBeTruthy()
    expect(wrapper.emitted('login-error')[0]).toEqual(['User is not validated'])
  })

  it('handles invalid password', async () => {
    axios.post.mockRejectedValue({
      response: { data: { code: '1004', message: 'Invalid password' } }
    })

    await wrapper.setData({ phonenumber: '0123456789', password: 'password1' })
    await wrapper.vm.handleSubmit()

    await flushPromises()

    expect(wrapper.emitted('login-error')).toBeTruthy()
    expect(wrapper.emitted('login-error')[0]).toEqual(['Invalid password'])
  })

  it('handles unexpected error messages', async () => {
    axios.post.mockRejectedValue({
      response: { data: { code: '9995', message: 'Account not verified' } }
    })

    await wrapper.setData({ phonenumber: '0123456789', password: 'password' })
    await wrapper.vm.handleSubmit()

    await flushPromises()

    expect(wrapper.emitted('login-error')).toBeTruthy()
    expect(wrapper.emitted('login-error')[0]).toEqual(['Account not verified'])
  })

  it('validates phone number format', async () => {
    await wrapper.setData({ phonenumber: '123', password: 'password' })
    await wrapper.vm.handleSubmit()

    expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
  })

  it('validates password format', async () => {
    await wrapper.setData({ phonenumber: '0123456789', password: 'short' })
    await wrapper.vm.handleSubmit()

    expect(wrapper.vm.passwordError).toBe('Password must be 6-10 characters long and not match the phone number')
  })

  it('requires both phone number and password', async () => {
    await wrapper.vm.handleSubmit()

    expect(wrapper.vm.phoneError).toBe('Phone number is required')
    expect(wrapper.vm.passwordError).toBe('Password is required')
  })

  it('handles network error', async () => {
    const networkError = new Error('Network Error');
    networkError.request = {}; // This simulates a request that was sent but got no response
    axios.post.mockRejectedValue(networkError);

    await wrapper.setData({ phonenumber: '0123456789', password: 'password' })
    await wrapper.vm.handleSubmit()

    await flushPromises()

    expect(wrapper.emitted('login-error')).toBeTruthy()
    expect(wrapper.emitted('login-error')[0]).toEqual(['Unable to connect to the Internet'])
  })

  it('handles unexpected errors', async () => {
    const unexpectedError = new Error('Unexpected Error');
    axios.post.mockRejectedValue(unexpectedError);

    await wrapper.setData({ phonenumber: '0123456789', password: 'password' })
    await wrapper.vm.handleSubmit()

    await flushPromises()

    expect(wrapper.emitted('login-error')).toBeTruthy()
    expect(wrapper.emitted('login-error')[0]).toEqual(['An unexpected error occurred. Please try again.'])
  })

  it('disables submit button while loading', async () => {
    let resolvePromise;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    axios.post.mockImplementation(() => promise)

    await wrapper.setData({ phonenumber: '0123456789', password: 'password' })
    const submitPromise = wrapper.vm.handleSubmit()

    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isLoading).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBe('')

    resolvePromise({ data: { code: '1000', data: {} } })
    await submitPromise
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isLoading).toBe(false)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })
})