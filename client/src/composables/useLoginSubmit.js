import { ref } from 'vue'
import { apiService } from '../services/api'

export function useLoginSubmit(login, router) {
    const isLoading = ref(false)
    const loginSuccess = ref(false)
    const errorMessage = ref("")

    const submitLogin = async (phoneNumber, password, rememberMe, deviceId) => {
        isLoading.value = true
        loginSuccess.value = false
        errorMessage.value = ""

        try {
            const response = await apiService.login({
                phoneNumber,
                password,
                deviceId,
                rememberMe
            });

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