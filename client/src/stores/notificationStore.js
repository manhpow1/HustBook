import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([])

    function showNotification(message, type = 'info', duration = 5000) {
        const id = Date.now()
        notifications.value.push({ id, message, type })
        setTimeout(() => {
            removeNotification(id)
        }, duration)
    }

    function removeNotification(id) {
        const index = notifications.value.findIndex(n => n.id === id)
        if (index !== -1) {
            notifications.value.splice(index, 1)
        }
    }

    return {
        notifications,
        showNotification,
        removeNotification
    }
})