<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Notification Settings</h2>

        <div class="space-y-4">
            <div v-for="(setting, key) in notificationSettings" :key="key" class="flex items-center justify-between">
                <span>{{ setting.label }}</span>
                <ToggleSwitch :modelValue="setting.enabled"
                    @update:modelValue="updateNotificationSetting(key, $event)" />
            </div>
        </div>

        <h3 class="text-lg font-semibold mt-6 mb-4">Notification Customization</h3>

        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <span>Disable All Push Notifications</span>
                <ToggleSwitch :modelValue="disableAllNotifications"
                    @update:modelValue="updateDisableAllNotifications" />
            </div>

            <div>
                <h4 class="text-md font-medium mb-2">Notification Sound</h4>
                <select v-model="selectedSound" @change="previewSound"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="custom">Custom Voice Recording</option>
                    <option value="default">Default SMS Sound</option>
                </select>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/settingsStore';
import { useToast } from '@/composables/useToast';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';

const settingsStore = useSettingsStore();
const { showToast } = useToast();

const notificationSettings = ref({
    comments: { label: 'Comments and likes on your posts', enabled: false },
    friendUpdates: { label: 'Updates from friends', enabled: false },
    friendRequests: { label: 'Friend requests', enabled: false },
    peopleYouMayKnow: { label: 'People You May Know', enabled: false },
    birthdays: { label: 'Birthdays', enabled: false },
    videoApproval: { label: 'Approval of uploaded videos', enabled: false },
    reportedContent: { label: 'Feedback on reported content', enabled: false },
});

const disableAllNotifications = ref(false);
const selectedSound = ref('default');

onMounted(async () => {
    try {
        const settings = await settingsStore.getNotificationSettings();
        notificationSettings.value = { ...notificationSettings.value, ...settings };
        disableAllNotifications.value = await settingsStore.getDisableAllNotifications();
    } catch (error) {
        showToast('Failed to load notification settings', 'error');
    }
});

const updateNotificationSetting = async (key, value) => {
    try {
        await settingsStore.updateNotificationSetting(key, value);
        notificationSettings.value[key].enabled = value;
        showToast('Notification setting updated', 'success');
    } catch (error) {
        showToast('Failed to update notification setting', 'error');
    }
};

const updateDisableAllNotifications = async (value) => {
    try {
        await settingsStore.updateDisableAllNotifications(value);
        disableAllNotifications.value = value;
        showToast('All notifications ' + (value ? 'disabled' : 'enabled'), 'success');
    } catch (error) {
        showToast('Failed to update notification settings', 'error');
    }
};

const previewSound = () => {
    // Implement sound preview logic here
    console.log('Preview sound:', selectedSound.value);
    // You would typically play the selected sound here
};
</script>