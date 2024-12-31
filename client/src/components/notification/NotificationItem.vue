<template>
    <div @click="handleMarkAsRead"
        class="group flex items-center space-x-4 rounded-md p-4 hover:bg-accent transition-colors"
        :class="{ 'bg-accent': !notification.read }" role="listitem">
        <Avatar>
            <AvatarImage :src="notification.avatar" :alt="notification.title" />
            <AvatarFallback>
                {{ getInitials(notification.title) }}
            </AvatarFallback>
        </Avatar>

        <div class="flex-1 space-y-1">
            <div class="flex items-center justify-between">
                <p class="text-sm font-medium">{{ notification.title }}</p>
                <Button variant="ghost" size="icon" @click.stop="handleRemove"
                    class="opacity-0 group-hover:opacity-100 transition-opacity">
                    <XIcon class="h-4 w-4" />
                    <span class="sr-only">Remove notification</span>
                </Button>
            </div>
            <p class="text-xs text-muted-foreground">
                {{ formattedTime }}
            </p>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { XIcon } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/components/ui/toast';
import { useNotificationStore } from '@/stores/notificationStore';

const props = defineProps({
    notification: {
        type: Object,
        required: true,
        validator(notification) {
            return ['notificationId', 'title', 'created', 'read'].every(
                prop => prop in notification
            );
        }
    }
});

const notificationStore = useNotificationStore();
const { toast } = useToast();

const formattedTime = computed(() => {
    return formatDistanceToNow(new Date(props.notification.created), {
        addSuffix: true
    });
});

const getInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const handleRemove = async () => {
    try {
        await notificationStore.removeNotification(props.notification.notificationId);
        toast({
            title: "Success",
            description: "Notification removed successfully",
        });
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to remove notification",
            variant: "destructive",
        });
    }
};

const handleMarkAsRead = async () => {
    if (props.notification.read === '0') {
        try {
            await notificationStore.markNotificationAsRead(props.notification.notificationId);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to mark notification as read",
                variant: "destructive",
            });
        }
    }
};
</script>