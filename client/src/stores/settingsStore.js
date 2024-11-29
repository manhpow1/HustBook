import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api';
import { handleError } from '../utils/errorHandler';
import router from '../router';

export const useSettingsStore = defineStore('settings', () => {
    const notificationSettings = ref({});
    const loading = ref(false);
    const error = ref(null);

    const getPushSettings = async () => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.getPushSettings()
            const data = response.data

            if (data.code === '1000') {
                notificationSettings.value = data.data
            } else {
                throw new Error(data.message || 'Failed to fetch push settings')
            }
        } catch (err) {
            error.value = 'Failed to fetch push settings'
            await handleError(err, router)
        } finally {
            loading.value = false
        }
    }

    const updatePushSettings = async (settings) => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.updatePushSettings(settings);
            const data = response.data;

            if (data.code === '1000') {
                notificationSettings.value = { ...notificationSettings.value, ...data.data };
            } else {
                throw new Error(data.message || 'Failed to update push settings');
            }
        } catch (err) {
            error.value = 'Failed to update push settings';
            await handleError(err, router);
        } finally {
            loading.value = false;
        }
    };

    return {
        notificationSettings,
        loading,
        error,
        getPushSettings,
        updatePushSettings,
    };
});