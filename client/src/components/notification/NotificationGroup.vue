<template>
    <Card class="mb-4">
        <CardHeader>
            <CardTitle class="text-sm font-medium">{{ title }}</CardTitle>
        </CardHeader>
        <CardContent class="p-0">
            <ScrollArea class="h-[300px]">
                <div class="space-y-1">
                    <NotificationItem v-for="notification in notifications" :key="notification.notificationId"
                        :notification="notification" />
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
</template>

<script setup>
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationItem from './NotificationItem.vue';

defineProps({
    title: {
        type: String,
        required: true
    },
    notifications: {
        type: Array,
        required: true,
        validator(notifications) {
            return notifications.every(notification =>
                ['notificationId', 'title', 'created', 'read'].every(
                    prop => prop in notification
                )
            );
        }
    }
});
</script>