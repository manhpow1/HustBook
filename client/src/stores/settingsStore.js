import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiService from '../services/api';
import { useErrorHandler } from '@/utils/errorHandler';
import logger from '../services/logging';

export const useSettingsStore = defineStore('settings', () => {
    const notificationSettings = ref({});
    const loading = ref(false);
    const error = ref(null);
    const disableAllNotifications = computed(() => {
        return Object.values(notificationSettings.value).every(setting => setting === '0');
    });
    const { handleError } = useErrorHandler();

    const getPushSettings = async () => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getPushSettings();
            const data = response.data;

            if (data.code === '1000') {
                notificationSettings.value = data.data;
            } else {
                throw new Error(data.message || 'Failed to fetch push settings');
            }
        } catch (err) {
            error.value = 'Failed to fetch push settings';
            await handleError(err);
        } finally {
            loading.value = false;
        }
    };

    const updatePushSettings = async (settings) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.updatePushSettings(settings);
            const data = response.data;

            if (data.code === '1000') {
                // Merge the updated settings
                notificationSettings.value = { ...notificationSettings.value, ...data.data };
            } else {
                throw new Error(data.message || 'Failed to update push settings');
            }
        } catch (err) {
            error.value = 'Failed to update push settings';
            await handleError(err);
        } finally {
            loading.value = false;
        }
    };

    const toggleDisableAllNotifications = async (value) => {
        if (!notificationSettings.value || typeof notificationSettings.value !== 'object') {
            throw new Error('Invalid notification settings object');
        }

        const newSettings = {};

        Object.keys(notificationSettings.value).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(notificationSettings.value, key)) {
                newSettings[key] = value ? '0' : '1';
            }
        });

        await updatePushSettings(newSettings);
    };

    return {
        notificationSettings,
        loading,
        error,
        disableAllNotifications,
        getPushSettings,
        updatePushSettings,
        toggleDisableAllNotifications,
    };
});