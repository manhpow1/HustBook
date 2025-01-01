<template>
    <Card>
        <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
            <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                    <Label>Disable All Notifications</Label>
                    <p class="text-sm text-muted-foreground">
                        Temporarily disable all push notifications
                    </p>
                </div>
                <Switch :model-value="disableAllNotifications" @update:model-value="toggleDisableAllNotifications"
                    :disabled="loading" />
            </div>

            <!-- Error alert -->
            <Alert v-if="error" variant="destructive">
                <AlertCircleIcon class="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <Separator />

            <!-- Individual notification settings -->
            <div class="space-y-4">
                <div v-for="(enabled, key) in notificationSettings" :key="key"
                    class="flex items-center justify-between">
                    <div class="space-y-0.5">
                        <Label>{{ formatSettingName(key) }}</Label>
                        <p class="text-sm text-muted-foreground">
                            {{ getSettingDescription(key) }}
                        </p>
                    </div>
                    <Switch :model-value="enabled === '1'"
                        @update:model-value="value => handleUpdateSetting(key, value)"
                        :disabled="loading || disableAllNotifications" />
                </div>
            </div>

            <Separator />

            <!-- Sound settings -->
            <div class="space-y-4">
                <h3 class="text-lg font-medium">Notification Sound</h3>
                <Select v-model="selectedSound" :disabled="loading">
                    <SelectTrigger class="w-[200px]">
                        <SelectValue placeholder="Select sound" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                </Select>

                <div v-if="selectedSound === 'custom'" class="space-y-2">
                    <Input type="file" accept="audio/*" @change="handleSoundUpload" :disabled="loading" />
                    <Button variant="outline" size="sm" @click="previewSound" :disabled="loading">
                        <SpeakerIcon class="mr-2 h-4 w-4" />
                        Preview Sound
                    </Button>
                </div>
            </div>

            <!-- Save button -->
            <div class="flex justify-end">
                <Button :disabled="loading" @click="saveSettings">
                    <Loader2Icon v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
                    {{ loading ? 'Saving...' : 'Save Changes' }}
                </Button>
            </div>
        </CardContent>
    </Card>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useToast } from '@/components/ui/toast';
import { AlertCircleIcon, Loader2Icon, SpeakerIcon } from 'lucide-vue-next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const settingsStore = useSettingsStore();
const { toast } = useToast();

// State
const selectedSound = ref('default');
const customSound = ref(null);

// Computed
const notificationSettings = computed(() => settingsStore.notificationSettings);
const disableAllNotifications = computed(() => settingsStore.disableAllNotifications);
const loading = computed(() => settingsStore.loading);
const error = computed(() => settingsStore.error);

// Setting descriptions
const settingDescriptions = {
    likes: 'Get notified when someone likes your post',
    comments: 'Get notified when someone comments on your posts',
    mentions: 'Get notified when someone mentions you',
    friend_requests: 'Get notified for new friend requests',
    messages: 'Get notified for new messages',
    security_alerts: 'Get notified about security events',
};

// Methods
const formatSettingName = (key) => {
    return key.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const getSettingDescription = (key) => {
    return settingDescriptions[key] || '';
};

const handleUpdateSetting = async (key, value) => {
    try {
        await settingsStore.updatePushSettings({
            [key]: value ? '1' : '0'
        });
        toast({
            title: 'Success',
            description: 'Setting updated successfully',
        });
    } catch (error) {
        toast({
            title: 'Error',
            description: 'Failed to update setting',
            variant: 'destructive',
        });
    }
};

const toggleDisableAllNotifications = async (value) => {
    try {
        await settingsStore.toggleDisableAllNotifications(value);
        toast({
            title: 'Success',
            description: value ? 'All notifications disabled' : 'All notifications enabled',
        });
    } catch (error) {
        toast({
            title: 'Error',
            description: 'Failed to update notification settings',
            variant: 'destructive',
        });
    }
};

const handleSoundUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
        customSound.value = file;
    } else {
        toast({
            title: 'Error',
            description: 'Please select a valid audio file',
            variant: 'destructive',
        });
    }
};

const previewSound = async () => {
    try {
        if (selectedSound.value === 'custom' && customSound.value) {
            const audio = new Audio(URL.createObjectURL(customSound.value));
            await audio.play();
        } else {
            const audio = new Audio('/notification.mp3');
            await audio.play();
        }
    } catch (error) {
        toast({
            title: 'Error',
            description: 'Failed to play notification sound',
            variant: 'destructive',
        });
    }
};

const saveSettings = async () => {
    try {
        const settings = {
            sound: selectedSound.value,
            ...(customSound.value && { customSound: customSound.value })
        };
        await settingsStore.updatePushSettings(settings);
        toast({
            title: 'Success',
            description: 'Settings saved successfully'
        });
    } catch (error) {
        toast({
            title: 'Error',
            description: 'Failed to save settings',
            variant: 'destructive'
        });
    }
};
</script>