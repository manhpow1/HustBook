import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Login from '../Login.vue'
import axios from 'axios'

vi.mock('axios')

describe('Login Component', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(Login)
  })

  it('logs in successfully with correct credentials', async () => {
    const mockResponse = { 
      data: { 
        code: '1000', 
        data: { 
          id: '123',
          username: 'John Doe',
          token: 'abc123',
          avatar: 'http://example.com/avatar.jpg',
          active: '1'
        } 
      } 
    }
    axios.post.mockResolvedValue(mockResponse)

    await wrapper.setData({ phonenumber: '0123456789', password: 'password123' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        phonenumber: '0123456789',
        password: 'password123',
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

    await wrapper.setData({ phonenumber: '0987654321', password: 'password123' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.emitted('login-error')).toBeTruthy()
    expect(wrapper.emitted('login-error')[0]).toEqual(['User is not validated'])
  })

  it('validates phone number format', async () => {
    await wrapper.setData({ phonenumber: '123', password: 'password123' })
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
  })

  it('validates password format', async () => {
    await wrapper.setData({ phonenumber: '0123456789', password: 'short' })
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.passwordError).toBe('Password must be 6-10 characters long and not match the phone number')
  })

  it('requires both phone number and password', async () => {
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.phoneError).toBe('Phone number is required')
    expect(wrapper.vm.passwordError).toBe('Password is required')
  })

  it('handles network error', async () => {
    axios.post.mockRejectedValue(new Error('Network Error'))

    await wrapper.setData({ phonenumber: '0123456789', password: 'password123' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.emitted('login-error')).toBeTruthy()
    expect(wrapper.emitted('login-error')[0]).toEqual(['Unable to connect to the Internet'])
  })

  it('validates password not matching phone number', async () => {
    await wrapper.setData({ phonenumber: '0123456789', password: '0123456789' })
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.passwordError).toBe('Password must not match the phone number')
  })

  it('handles login on multiple devices', async () => {
    const mockResponse1 = { 
      data: { 
        code: '1000', 
        data: { token: 'abc123' } 
      } 
    }
    const mockResponse2 = { 
      data: { 
        code: '1000', 
        data: { token: 'def456' } 
      } 
    }
    axios.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2)

    // Login on device A
    await wrapper.setData({ phonenumber: '0123456789', password: 'password123' })
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.emitted('login-success')[0][0].token).toBe('abc123')

    // Login on device B
    await wrapper.setData({ phonenumber: '0123456789', password: 'password123' })
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.emitted('login-success')[1][0].token).toBe('def456')
  })

  it('handles missing deviceId', async () => {
    axios.post.mockRejectedValue({
      response: { data: { code: '1002', message: 'Parameter is not enough' } }
    })

    // Simulate missing deviceId
    wrapper.vm.sendDeviceId = false
    await wrapper.setData({ phonenumber: '0123456789', password: 'password123' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.emitted('login-error')).toBeTruthy()
    expect(wrapper.emitted('login-error')[0]).toEqual(['Parameter is not enough'])
  })
})