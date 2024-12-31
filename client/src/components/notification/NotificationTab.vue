<template>
    <div class="relative" ref="notificationRef">
        <Button variant="ghost" size="icon" @click="toggleNotifications" :aria-expanded="showNotifications"
            aria-label="Notifications">
            <Badge v-if="unreadCount > 0" class="absolute -top-1 -right-1 h-5 w-5 rounded-full" variant="destructive">
                {{ unreadCount }}
            </Badge>
            <BellIcon class="h-5 w-5" />
        </Button>

        <Transition enter-active-class="transition duration-200 ease-out"
            enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-150 ease-in" leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0">
            <Card v-if="showNotifications" class="absolute right-0 mt-2 w-80 z-50" role="dialog"
                aria-label="Notifications">
                <CardHeader class="flex flex-row items-center justify-between">
                    <CardTitle>Notifications</CardTitle>
                    <Button v-if="notifications.length > 0" variant="ghost" size="sm" @click="markAllAsRead">
                        Mark all as read
                    </Button>
                </CardHeader>
                <CardContent>
                    <div v-if="loading" class="flex justify-center p-4">
                        <Loader2Icon class="h-6 w-6 animate-spin" />
                    </div>

                    <div v-else-if="error" class="p-4 text-center">
                        <Alert variant="destructive">
                            <AlertCircleIcon class="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{{ error }}</AlertDescription>
                        </Alert>
                    </div>

                    <div v-else-if="notifications.length === 0" class="p-4 text-center text-muted-foreground">
                        No notifications
                    </div>

                    <div v-else>
                        <NotificationGroup title="Recent" :notifications="recentNotifications" />
                        <NotificationGroup title="Earlier" :notifications="earlierNotifications" />
                    </div>
                </CardContent>
            </Card>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { BellIcon, Loader2Icon, AlertCircleIcon } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useNotificationStore } from '@/stores/notificationStore';
import { useToast } from '@/components/ui/toast';
import NotificationGroup from './NotificationGroup.vue';

const notificationStore = useNotificationStore();
const { notifications, loading, error, unreadCount } = storeToRefs(notificationStore);
const { toast } = useToast();

const showNotifications = ref(false);
const notificationRef = ref(null);

const recentNotifications = computed(() => {
    const today = new Date().toDateString();
    return notifications.value.filter(n =>
        new Date(n.created).toDateString() === today
    );
});

const earlierNotifications = computed(() => {
    const today = new Date().toDateString();
    return notifications.value.filter(n =>
        new Date(n.created).toDateString() !== today
    );
});

const toggleNotifications = () => {
    showNotifications.value = !showNotifications.value;
    if (showNotifications.value) {
        fetchNotifications();
    }
};

const fetchNotifications = async () => {
    try {
        await notificationStore.fetchNotifications();
    } catch (err) {
        toast({
            title: "Error",
            description: "Failed to fetch notifications",
            variant: "destructive",
        });
    }
};

const markAllAsRead = async () => {
    try {
        await notificationStore.markAllAsRead();
        toast({
            title: "Success",
            description: "All notifications marked as read",
        });
    } catch (err) {
        toast({
            title: "Error",
            description: "Failed to mark all as read",
            variant: "destructive",
        });
    }
};

const handleClickOutside = (event) => {
    if (notificationRef.value && !notificationRef.value.contains(event.target)) {
        showNotifications.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>