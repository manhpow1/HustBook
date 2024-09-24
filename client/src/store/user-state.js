import { ref, computed } from 'vue'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'

const token = ref(localStorage.getItem('token'))
const deviceToken = ref(localStorage.getItem('deviceToken'))
const isAuthenticated = ref(false)

export function useUserState() {
    const isLoggedIn = computed(() => isAuthenticated.value)

    const checkAuth = async () => {
        console.log("Checking authentication");
        const storedToken = localStorage.getItem('token');
        const storedDeviceToken = localStorage.getItem('deviceToken');
        console.log("Stored token:", storedToken);
        console.log("Stored device token:", storedDeviceToken);

        if (storedToken && storedDeviceToken) {
            try {
                const response = await axios.get(API_ENDPOINTS.AUTH_CHECK, {
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                        'X-Device-Token': storedDeviceToken
                    }
                });
                console.log("Auth check response:", response.data);
                isAuthenticated.value = response.data.isAuthenticated;
                if (isAuthenticated.value) {
                    token.value = storedToken;
                    deviceToken.value = storedDeviceToken;
                } else {
                    // Clear tokens if authentication fails
                    localStorage.removeItem('token');
                    localStorage.removeItem('deviceToken');
                    token.value = null;
                    deviceToken.value = null;
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                console.error('Error response:', error.response);
                isAuthenticated.value = false;
                localStorage.removeItem('token');
                localStorage.removeItem('deviceToken');
                token.value = null;
                deviceToken.value = null;
            }
        } else {
            console.log("No token or device token found in localStorage");
            isAuthenticated.value = false;
        }
        console.log("Final authentication state:", isAuthenticated.value);
    }

    const login = (newToken, newDeviceToken) => {
        console.log("Logging in with new token:", newToken);
        console.log("New device token:", newDeviceToken);
        token.value = newToken
        deviceToken.value = newDeviceToken
        localStorage.setItem('token', newToken)
        localStorage.setItem('deviceToken', newDeviceToken)
        isAuthenticated.value = true
    }

    const logout = () => {
        console.log("Logging out");
        token.value = null
        deviceToken.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('deviceToken')
        isAuthenticated.value = false
    }

    return {
        token,
        deviceToken,
        isLoggedIn,
        login,
        logout,
        checkAuth
    }
}