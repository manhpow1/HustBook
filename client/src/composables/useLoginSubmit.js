import { ref } from 'vue'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'

export function useLoginSubmit(login, router) {
    const isLoading = ref(false)
    const loginSuccess = ref(false)
    const errorMessage = ref("")

    const submitLogin = async (phoneNumber, password, rememberMe) => {
        isLoading.value = true
        loginSuccess.value = false
        errorMessage.value = ""

        try {
            const response = await axios.post(API_ENDPOINTS.LOGIN, {
                phoneNumber,
                password,
                deviceId: "device-uuid",
                rememberMe
            })

            if (response.data.code === "1000") {
                loginSuccess.value = true
                login(response.data.data.token, response.data.data.deviceToken)
                setTimeout(() => {
                    router.push('/')
                }, 2000)
            } else {
                errorMessage.value = response.data.message || "Login failed. Please try again."
            }
        } catch (error) {
            console.error("Login error:", error)
            if (error.response) {
                errorMessage.value = error.response.data.message || "Login failed. Please try again."
            } else if (error.request) {
                errorMessage.value = "Unable to connect to the server. Please check your internet connection."
            } else {
                errorMessage.value = "An unexpected error occurred. Please try again."
            }
        } finally {
            isLoading.value = false
        }
    }

    return {
        isLoading,
        loginSuccess,
        errorMessage,
        submitLogin
    }
}