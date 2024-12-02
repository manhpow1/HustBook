<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Notification Settings</h2>

        <div v-if="loading" class="text-center py-4">
            <LoaderIcon class="animate-spin h-8 w-8 text-gray-500 mx-auto" />
            <p class="mt-2 text-gray-500">Loading settings...</p>
        </div>

        <div v-else-if="error" class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p class="font-bold">Error</p>
            <p>{{ error }}</p>
        </div>

        <div v-else class="space-y-4">
            <!-- Toggle for disabling all notifications -->
            <div class="flex items-center justify-between">
                <span>Disable All Push Notifications</span>
                <ToggleSwitch :modelValue="disableAllNotifications"
                    @update:modelValue="toggleDisableAllNotifications" />
            </div>

            <!-- Individual Notification Settings -->
            <div v-for="(setting, key) in notificationSettings" :key="key" class="flex items-center justify-between">
                <span>{{ formatSettingName(key) }}</span>
                <ToggleSwitch :modelValue="setting === '1'" @update:modelValue="updateIndividualSetting(key, $event)"
                    :disabled="disableAllNotifications" />
            </div>
        </div>

        <!-- Sound Customization (Optional) -->
        <div class="mt-6">
            <h3 class="text-lg font-medium mb-2">Notification Sound</h3>
            <select v-model="selectedSound" @change="previewSound"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="custom">Custom Voice Recording</option>
                <option value="default">Default SMS Sound</option>
            </select>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../../composables/useToast';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { LoaderIcon } from 'lucide-vue-next';

const settingsStore = useSettingsStore();
const { showToast } = useToast();

const selectedSound = ref('default'); // For sound customization

onMounted(async () => {
    try {
        await settingsStore.getPushSettings();
    } catch (error) {
        showToast('Failed to load notification settings', 'error');
    }
});

// Computed properties for easy access
const notificationSettings = computed(() => settingsStore.notificationSettings);
const loading = computed(() => settingsStore.loading);
const error = computed(() => settingsStore.error);
const disableAllNotifications = computed(() => settingsStore.disableAllNotifications);

// Method to format setting names for display
const formatSettingName = (key) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Method to update individual settings
const updateIndividualSetting = async (key, value) => {
    try {
        await settingsStore.updatePushSettings({ [key]: value ? '1' : '0' });
        showToast('Notification setting updated', 'success');
    } catch (error) {
        showToast('Failed to update notification setting', 'error');
    }
};

// Method to toggle all notifications
const toggleDisableAllNotifications = async (value) => {
    try {
        await settingsStore.toggleDisableAllNotifications(value);
        showToast('All notifications ' + (value ? 'disabled' : 'enabled'), 'success');
    } catch (error) {
        showToast('Failed to update notification settings', 'error');
    }
};

// Method to preview selected sound (Placeholder)
const previewSound = () => {
    console.log('Preview sound:', selectedSound.value);
    // Implement actual sound preview logic here
};
</script>