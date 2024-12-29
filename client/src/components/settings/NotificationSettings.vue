<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Notification Settings</h2>

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center space-x-2">
            <LoaderIcon class="animate-spin h-6 w-6 text-gray-500" />
            <span class="text-gray-500">Loading settings...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p class="font-bold">Error</p>
            <p>{{ error }}</p>
        </div>

        <!-- Notification Settings -->
        <div v-else class="space-y-4">
            <!-- Disable All Notifications Toggle -->
            <div class="flex items-center justify-between">
                <span>Disable All Push Notifications</span>
                <ToggleSwitch :modelValue="disableAllNotifications"
                    @update:modelValue="toggleDisableAllNotifications" />
            </div>

            <!-- Individual Notification Toggles -->
            <div v-for="(setting, key) in notificationSettings" :key="key" class="flex items-center justify-between">
                <span>{{ formatSettingName(key) }}</span>
                <ToggleSwitch :modelValue="setting === '1'" @update:modelValue="updateIndividualSetting(key, $event)"
                    :disabled="disableAllNotifications" />
            </div>

            <!-- Optional: Sound Customization -->
            <div class="mt-6">
                <h3 class="text-lg font-medium mb-2">Notification Sound</h3>
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
import { ref, onMounted, computed } from 'vue';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../ui/toast';
import ToggleSwitch from '../ui/ToggleSwitch.vue';
import { LoaderIcon } from 'lucide-vue-next';

const settingsStore = useSettingsStore();
const { toast } = useToast();

// Sound Customization State
const selectedSound = ref('default'); // This can be further integrated with the server if needed

// Fetch settings on component mount
onMounted(async () => {
    await settingsStore.getPushSettings();
});

// Computed Properties
const notificationSettings = computed(() => settingsStore.notificationSettings);
const loading = computed(() => settingsStore.loading);
const error = computed(() => settingsStore.error);
const disableAllNotifications = computed(() => settingsStore.disableAllNotifications);

// Helper Method to Format Setting Names
const formatSettingName = (key) => {
    // Convert snake_case to Title Case
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Update Individual Setting
const updateIndividualSetting = async (key, value) => {
    try {
        await settingsStore.updatePushSettings({ [key]: value ? '1' : '0' });
        toast({ type: 'success', message: 'Notification setting updated successfully!' });
    } catch (error) {
        toast({ type: 'error', message: 'Failed to update notification setting' });
    }
};

// Toggle All Notifications
const toggleDisableAllNotifications = async (value) => {
    try {
        await settingsStore.toggleDisableAllNotifications(value);
        toast({ type: 'success', message: `All notifications ${value ? 'disabled' : 'enabled'}` });
    } catch (error) {
        toast({ type: 'error', message: 'Failed to update notification settings' });
    }
};

// Preview Sound (Placeholder)
const previewSound = () => {
    // Implement actual sound preview logic here
    console.log('Preview sound:', selectedSound.value);
};
</script>