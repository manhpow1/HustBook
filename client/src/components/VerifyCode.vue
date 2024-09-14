<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800">Verify Code</h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
                <label for="phonenumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
                <input v-model="phonenumber" type="tel" id="phonenumber" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    :class="{ 'border-red-500': phoneError }" />
                <p v-if="phoneError" class="mt-2 text-sm text-red-600">
                    {{ phoneError }}
                </p>
            </div>
            <div>
                <label for="code" class="block text-sm font-medium text-gray-700">Verification Code</label>
                <input v-model="code" type="text" id="code" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    :class="{ 'border-red-500': codeError }" />
                <p v-if="codeError" class="mt-2 text-sm text-red-600">
                    {{ codeError }}
                </p>
            </div>
            <button type="submit" :disabled="isLoading"
                class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ isLoading ? "Verifying..." : "Verify Code" }}
            </button>
        </form>
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md">
            <p class="text-green-700">{{ successMessage }}</p>
        </div>
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md">
            <p class="text-red-700">{{ errorMessage }}</p>
        </div>
    </div>
</template>

<script>
import { useUserState } from '../userState'
import axios from 'axios'

export default {
    setup() {
        const { login } = useUserState()
        return { login }
    },
    data() {
        return {
            phonenumber: '',
            code: '',
            phoneError: '',
            codeError: '',
            isLoading: false,
            successMessage: '',
            errorMessage: ''
        }
    },
    methods: {
        validatePhone() {
            if (!/^0\d{9}$/.test(this.phonenumber)) {
                this.phoneError = 'Invalid phone number format'
                return false
            }
            this.phoneError = ''
            return true
        },
        validateCode() {
            if (!/^\d{6}$/.test(this.code)) {
                this.codeError = 'Verification code must be 6 digits'
                return false
            }
            this.codeError = ''
            return true
        },
        async handleSubmit() {
            this.errorMessage = ''
            this.successMessage = ''
            this.phoneError = ''
            this.codeError = ''

            const isPhoneValid = this.validatePhone()
            const isCodeValid = this.validateCode()

            if (!isPhoneValid || !isCodeValid) {
                return
            }

            this.isLoading = true

            try {
                const response = await axios.post('http://localhost:3000/api/auth/check_verify_code', {
                    phonenumber: this.phonenumber,
                    code: this.code
                })

                if (response.data.code === '1000') {
                    this.successMessage = 'Verification successful!'
                    this.login(response.data.data.token)
                    this.$router.push('/')
                } else {
                    this.handleErrorResponse(response.data)
                }
            } catch (error) {
                console.error('Verification error:', error)
                if (error.response) {
                    this.handleErrorResponse(error.response.data)
                } else if (error.request) {
                    this.errorMessage = 'Unable to connect to the server'
                } else {
                    this.errorMessage = 'An unexpected error occurred'
                }
            } finally {
                this.isLoading = false
            }
        },
        handleErrorResponse(data) {
            switch (data.code) {
                case '9995':
                    this.errorMessage = 'User is not validated'
                    break
                case '9996':
                    this.errorMessage = 'User already verified'
                    break
                case '1004':
                    this.errorMessage = 'Invalid verification code'
                    break
                case '1002':
                    this.errorMessage = 'Missing required parameters'
                    break
                default:
                    this.errorMessage = data.message || 'An error occurred'
            }
        }
    }
}
</script>