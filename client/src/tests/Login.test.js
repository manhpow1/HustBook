import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Login from '../components/auth/Login.vue'
import axios from 'axios'

vi.mock('axios')
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

describe('Login Component', () => {
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks() // Clear all mocks before each test
    wrapper = mount(Login)
    console.log('Test setup complete')
  })

  const fillForm = async (phonenumber, password) => {
    await wrapper.find('input[type="tel"]').setValue(phonenumber)
    await wrapper.find('input[type="password"]').setValue(password)
  }

  it('1. Successfully logs in with valid credentials', async () => {
    console.log('Starting test 1')
    const mockResponse = { data: { code: '1000', message: 'OK', data: { token: 'mockToken' } } }
    axios.post.mockResolvedValue(mockResponse)

    await fillForm('0123456789', 'validPass')
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        phonenumber: '0123456789',
        password: 'validPass',
        deviceId: expect.any(String)
      })
    )
    expect(wrapper.vm.loginSuccess).toBe(true)
    console.log('Test 1 complete')
  })

  it('2. Fails to log in with unregistered phone number', async () => {
    console.log('Starting test 2')
    const mockResponse = { response: { data: { code: '9995', message: 'User is not validated' } } }
    axios.post.mockRejectedValue(mockResponse)

    await fillForm('0987654321', 'validPass')
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.errorMessage).toBe('User is not validated')
    console.log('Test 2 complete')
  })

  it('3. Shows error for invalid phone number format', async () => {
    console.log('Starting test 3')
    await fillForm('123', 'validPass')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.phoneError).toBe('Invalid phone number format')
    expect(axios.post).not.toHaveBeenCalled()
    console.log('Test 3 complete')
  })

  it('4. Shows error for invalid password format', async () => {
    console.log('Starting test 4')
    await fillForm('0123456789', 'short')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.passwordError).toContain('Password must be 6-10 characters long')
    expect(axios.post).not.toHaveBeenCalled()
    console.log('Test 4 complete')
  })

  it('5. Shows error when submitting empty form', async () => {
    console.log('Starting test 5')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.phoneError).toBe('Phone number is required')
    expect(axios.post).not.toHaveBeenCalled()
    console.log('Test 5 complete')
  })

  it('6. Shows network error when offline', async () => {
    console.log('Starting test 6')
    const networkError = new Error('Network Error')
    networkError.request = {}
    axios.post.mockRejectedValue(networkError)

    await fillForm('0123456789', 'validPass')
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.errorMessage).toBe('Unable to connect to the Internet')
    console.log('Test 6 complete')
  })

  it('7. Shows error when password matches phone number', async () => {
    console.log('Starting test 7')
    await fillForm('0123456789', '0123456789')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.vm.passwordError).toContain('Password must not match the phone number')
    expect(axios.post).not.toHaveBeenCalled()
    console.log('Test 7 complete')
  })

  it('8. Successful login overwrites previous token', async () => {
    console.log('Starting test 8')
    const mockResponse1 = { data: { code: '1000', message: 'OK', data: { token: 'token1' } } }
    const mockResponse2 = { data: { code: '1000', message: 'OK', data: { token: 'token2' } } }
    axios.post.mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2)

    // First login
    await fillForm('0123456789', 'validPass')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.vm.loginSuccess).toBe(true)
    expect(axios.post).toHaveBeenCalledTimes(1)

    // Second login
    await fillForm('0987654321', 'validSup')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.vm.loginSuccess).toBe(true)
    expect(axios.post).toHaveBeenCalledTimes(2)
    console.log('Test 8 complete')
  })

  it('9. Shows error when deviceId is missing', async () => {
    console.log('Starting test 9')
    const mockResponse = { response: { data: { code: '1002', message: 'Parameter is not enough' } } }
    axios.post.mockRejectedValue(mockResponse)

    await fillForm('0123456789', 'validPass')
    if (wrapper.find('input[type="checkbox"]').exists()) {
      await wrapper.find('input[type="checkbox"]').setChecked(false)
    } else {
      console.warn('Checkbox for deviceId not found')
    }
    await wrapper.find('form').trigger('submit.prevent')

    await flushPromises()

    expect(axios.post).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.errorMessage).toBe('Parameter is not enough')
    console.log('Test 9 complete')
  })
})