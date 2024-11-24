<template>
    <div class="py-2">
        <div class="px-4 py-2 text-sm font-semibold text-gray-700">{{ title }}</div>
        <div v-for="notification in notifications" :key="notification.id" class="px-4 py-2 hover:bg-gray-100">
            <NotificationItem :notification="notification" />
        </div>
    </div>
</template>

<script setup>
import { defineProps } from 'vue';
import NotificationItem from './NotificationItem.vue';

defineProps({
    title: {
        type: String,
        required: true
    },
    notifications: {
        type: Array,
        required: true
    }
});
</script>