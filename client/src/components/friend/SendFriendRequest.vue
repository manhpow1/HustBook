<template>
    <div class="send-friend-request">
        <Button @click="sendRequest" :disabled="isLoading" :variant="isLoading ? 'outline' : 'default'" class="w-full"
            size="lg">
            <template v-if="isLoading">
                <Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
                Sending Request...
            </template>
            <template v-else>
                <UserPlusIcon class="mr-2 h-4 w-4" />
                Send Friend Request
            </template>
        </Button>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFriendStore } from '../../stores/friendStore'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Loader2Icon, UserPlusIcon } from 'lucide-vue-next'
import { useErrorHandler } from '@/utils/errorHandler'

const props = defineProps({
    userId: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['request-sent', 'request-failed'])

// Store and utilities
const friendStore = useFriendStore()
const { toast } = useToast()
const { handleError } = useErrorHandler()

// Component state
const isLoading = ref(false)

/**
 * Handles the friend request sending process
 * @async
 * @returns {Promise<void>}
 */
const sendRequest = async () => {
    if (isLoading.value) return

    isLoading.value = true

    try {
        const result = await friendStore.sendFriendRequest(props.userId)

        toast({
            title: "Success",
            description: `Friend request sent. You have ${result.requested_friends} pending friend requests.`,
            variant: "success",
        })

        emit('request-sent', result)
    } catch (error) {
        await handleError(error)

        toast({
            title: "Error",
            description: error.message || 'Failed to send friend request',
            variant: "destructive",
        })

        emit('request-failed', error)
    } finally {
        isLoading.value = false
    }
}
</script>
<style scoped>
.send-friend-request {
    @apply w-full max-w-sm mx-auto;
}
</style>