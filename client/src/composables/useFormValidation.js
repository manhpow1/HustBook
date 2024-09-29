import { ref } from 'vue'

export function useFormValidation() {
    const phoneError = ref("")
    const passwordError = ref("")

    const validatePhone = (phone) => {
        if (!phone) {
            phoneError.value = "Phone number is required"
            return false
        }
        if (!/^0\d{9}$/.test(phone)) {
            phoneError.value = "Invalid phone number format"
            return false
        }
        phoneError.value = ""
        return true
    }

    const validatePassword = (password) => {
        if (!password) {
            passwordError.value = "Password is required"
            return false
        }
        if (password.length < 6 || password.length > 10) {
            passwordError.value = "Password must be 6-10 characters long"
            return false
        }
        passwordError.value = ""
        return true
    }

    return {
        phoneError,
        passwordError,
        validatePhone,
        validatePassword
    }
}