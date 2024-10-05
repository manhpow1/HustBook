<template>
    <div class="fixed top-4 right-4 z-50">
        <TransitionGroup name="notification">
            <div v-for="notification in notifications" :key="notification.id"
                class="mb-2 p-4 rounded-md shadow-md max-w-md" :class="{
                    'bg-green-500 text-white': notification.type === 'success',
                    'bg-red-500 text-white': notification.type === 'error',
                    'bg-blue-500 text-white': notification.type === 'info'
                }">
                {{ notification.message }}
            </div>
        </TransitionGroup>
    </div>
</template>

<script setup>
import { useNotificationStore } from '../../stores/notificationStore'
import { storeToRefs } from 'pinia'

const notificationStore = useNotificationStore()
const { notifications } = storeToRefs(notificationStore)
</script>

<style scoped>
.notification-enter-active,
.notification-leave-active {
    transition: all 0.5s ease;
}

.notification-enter-from,
.notification-leave-to {
    opacity: 0;
    transform: translateX(30px);
}
</style>