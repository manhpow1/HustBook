<template>
    <div>
        <button @click="sendRequest" :disabled="loading"
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
            {{ loading ? 'Sending...' : 'Send Friend Request' }}
        </button>
        <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
        <p v-if="successMessage" class="text-green-500 mt-2">{{ successMessage }}</p>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFriendStore } from '../../stores/friendStore'

const props = defineProps({
    userId: {
        type: String,
        required: true
    }
})

const friendStore = useFriendStore()
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

const sendRequest = async () => {
    loading.value = true
    error.value = ''
    successMessage.value = ''

    try {
        const result = await friendStore.sendFriendRequest(props.userId)
        successMessage.value = `Friend request sent. You have ${result.requested_friends} pending friend requests.`
    } catch (err) {
        error.value = err.message || 'Failed to send friend request'
    } finally {
        loading.value = false
    }
}
</script>