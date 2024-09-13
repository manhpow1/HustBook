<template>
    <div>
        <button @click="handleLogout" :disabled="isLoading" class="bg-red-500 text-white px-4 py-2 rounded">
            {{ isLoading ? 'Logging out...' : 'Logout' }}
        </button>
        <p v-if="message" :class="messageClass">{{ message }}</p>
    </div>
</template>

<script>
import axios from 'axios'

export default {
    data() {
        return {
            isLoading: false,
            message: '',
            messageClass: ''
        }
    },
    methods: {
        async handleLogout() {
            this.isLoading = true
            this.message = ''

            try {
                const token = localStorage.getItem('token')
                const response = await axios.post('http://localhost:3000/api/auth/logout', null, {
                    headers: { Authorization: `Bearer ${token}` }
                })

                if (response.data.code === '1000') {
                    this.message = response.data.message
                    this.messageClass = 'text-green-600'
                    localStorage.removeItem('token')
                    await this.navigateToLogin()
                } else {
                    throw new Error(response.data.message)
                }
            } catch (error) {
                this.message = error.response?.data?.message || 'An error occurred during logout'
                this.messageClass = 'text-red-600'
            } finally {
                this.isLoading = false
            }
        },
        navigateToLogin() {
            return new Promise(resolve => {
                setTimeout(() => {
                    this.$router.push('/login')
                    resolve()
                }, 2000)
            })
        }
    }
}
</script>