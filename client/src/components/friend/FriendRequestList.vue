<template>
    <Card>
        <CardHeader>
            <CardTitle>Friend Requests</CardTitle>
            <CardDescription>Manage your incoming friend requests</CardDescription>
        </CardHeader>

        <CardContent>
            <!-- Loading State -->
            <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FriendRequestSkeleton v-for="i in 3" :key="i" />
            </div>

            <!-- Error State -->
            <Alert v-else-if="error" variant="destructive">
                <AlertCircleIcon class="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <!-- Empty State -->
            <Alert v-else-if="friendRequests.length === 0" variant="default">
                <InboxIcon class="h-4 w-4" />
                <AlertTitle>No Friend Requests</AlertTitle>
                <AlertDescription>You don't have any pending friend requests at the moment.</AlertDescription>
            </Alert>

            <!-- Friend Requests List -->
            <ScrollArea v-else className="h-[400px] rounded-md border p-4">
                <TransitionGroup name="list" tag="ul" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <li v-for="request in friendRequests" :key="request.userId">
                        <Card>
                            <CardContent class="p-4">
                                <div class="flex items-center space-x-4">
                                    <!-- Avatar -->
                                    <Avatar>
                                        <AvatarImage :src="request.avatar || defaultAvatar" :alt="request.userName" />
                                        <AvatarFallback>
                                            {{ getInitials(request.userName) }}
                                        </AvatarFallback>
                                    </Avatar>

                                    <!-- User Info -->
                                    <div class="flex-1 min-w-0">
                                        <p class="text-sm font-medium text-gray-900 truncate">
                                            {{ request.userName }}
                                        </p>
                                        <p class="text-sm text-gray-500">
                                            {{ request.same_friends }} mutual friends
                                        </p>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="mt-4 flex justify-between space-x-2">
                                    <Button variant="default" :disabled="isProcessing(request.userId)"
                                        @click="acceptRequest(request.userId)" class="flex-1">
                                        <Loader2Icon v-if="isProcessing(request.userId)"
                                            class="mr-2 h-4 w-4 animate-spin" />
                                        Accept
                                    </Button>

                                    <Button variant="outline" :disabled="isProcessing(request.userId)"
                                        @click="rejectRequest(request.userId)" class="flex-1">
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </li>
                </TransitionGroup>
            </ScrollArea>
        </CardContent>
    </Card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { AlertCircleIcon, InboxIcon, Loader2Icon } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useFriendStore } from '@/stores/friendStore'
import { useToast } from '@/components/ui/toast'
import FriendRequestSkeleton from './FriendRequestSkeleton.vue'

// Store setup
const friendStore = useFriendStore()
const { toast } = useToast()

// Component state
const processingRequests = ref(new Set())

// Store refs
const { friendRequests, loading, error } = storeToRefs(friendStore)

// Default avatar
const defaultAvatar = '@/assets/avatar-default.svg'

// Methods
const isProcessing = (requestId) => processingRequests.value.has(requestId)

const getInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
}

const acceptRequest = async (userId) => {
    if (isProcessing(userId)) return

    processingRequests.value.add(userId)

    try {
        const success = await friendStore.setAcceptFriend(userId, '1')

        if (success) {
            toast({
                title: 'Success',
                description: 'Friend request accepted',
                variant: 'default'
            })
        } else {
            throw new Error('Failed to accept friend request')
        }
    } catch (error) {
        toast({
            title: 'Error',
            description: error.message || 'Failed to accept friend request',
            variant: 'destructive'
        })
    } finally {
        processingRequests.value.delete(userId)
    }
}

const rejectRequest = async (userId) => {
    if (isProcessing(userId)) return

    processingRequests.value.add(userId)

    try {
        const success = await friendStore.setAcceptFriend(userId, '0')

        if (success) {
            toast({
                title: 'Success',
                description: 'Friend request rejected',
                variant: 'default'
            })
        } else {
            throw new Error('Failed to reject friend request')
        }
    } catch (error) {
        toast({
            title: 'Error',
            description: error.message || 'Failed to reject friend request',
            variant: 'destructive'
        })
    } finally {
        processingRequests.value.delete(userId)
    }
}

// Lifecycle hooks
onMounted(() => {
    friendStore.getRequestedFriends()
})
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
    transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

.list-move {
    transition: transform 0.5s ease;
}
</style>