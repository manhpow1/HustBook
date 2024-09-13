import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SignUp from '../SignUp.vue'
import axios from 'axios'

vi.mock('axios')

describe('SignUp Component', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(SignUp)
  })

  it('validates phone number format', async () => {
    await wrapper.setData({ phonenumber: '123' })
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.text-red-600').text()).toBe('Invalid phone number format')
  })

  it('validates password format', async () => {
    await wrapper.setData({ phonenumber: '0123456789', password: 'short' })
    await wrapper.find('form').trigger('submit.prevent')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.text-red-600').text()).toBe('Password must be 6-10 characters long, contain only letters and numbers, and not match the phone number')
  })

  it('submits form with valid data', async () => {
    const mockResponse = { data: { code: '1000', data: { verifyCode: '123456' } } }
    axios.post.mockResolvedValue(mockResponse)

    await wrapper.setData({ phonenumber: '0123456789', password: 'valid123' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/signup',
      expect.objectContaining({
        phonenumber: '0123456789',
        password: 'valid123',
        uuid: expect.any(String)
      })
    )
    expect(wrapper.emitted('signup-success')).toBeTruthy()
    expect(wrapper.emitted('signup-success')[0]).toEqual(['123456'])
  })

  it('handles server-side validation error', async () => {
    axios.post.mockRejectedValue({
      response: { data: { code: '1004', message: 'Invalid password format' } }
    })

    await wrapper.setData({ phonenumber: '0123456789', password: 'invalid' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.emitted('signup-error')).toBeTruthy()
    expect(wrapper.emitted('signup-error')[0]).toEqual(['Invalid password format'])
  })

  it('handles network error', async () => {
    axios.post.mockRejectedValue({ request: {} }) // Simulate a request error

    await wrapper.setData({ phonenumber: '0123456789', password: 'valid123' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.emitted('signup-error')).toBeTruthy()
    expect(wrapper.emitted('signup-error')[0]).toEqual(['An error occurred. Please try again.'])
  })

  it('handles unexpected error', async () => {
    axios.post.mockRejectedValue(new Error('Unexpected Error'))

    await wrapper.setData({ phonenumber: '0123456789', password: 'valid123' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.emitted('signup-error')).toBeTruthy()
    expect(wrapper.emitted('signup-error')[0]).toEqual(['An unexpected error occurred. Please try again.'])
  })

  it('disables submit button while loading', async () => {
    let resolvePromise;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    axios.post.mockImplementation(() => promise)

    await wrapper.setData({ phonenumber: '0123456789', password: 'valid123' })
    wrapper.find('form').trigger('submit.prevent')

    await wrapper.vm.$nextTick()

    expect(wrapper.vm.isLoading).toBe(true)
    expect(wrapper.find('button[type="submit"]').text()).toBe('Signing up...')

    resolvePromise({ data: { code: '1000', data: { verifyCode: '123456' } } })
    await flushPromises()

    expect(wrapper.vm.isLoading).toBe(false)
    expect(wrapper.find('button[type="submit"]').text()).toBe('Sign Up')
  })

  it('clears form after successful submission', async () => {
    const mockResponse = { data: { code: '1000', data: { verifyCode: '123456' } } }
    axios.post.mockResolvedValue(mockResponse)

    await wrapper.setData({ phonenumber: '0123456789', password: 'valid123' })
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(wrapper.vm.phonenumber).toBe('')
    expect(wrapper.vm.password).toBe('')
  })
})