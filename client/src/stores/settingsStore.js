import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiService from '../services/api';

export const useSettingsStore = defineStore('settings', () => {
    const notificationSettings = ref({});
    const disableAllNotifications = ref(false);
    const loading = ref(false);
    const error = ref(null);

    const updatePersonalInfo = async (personalInfo) => {
        try {
            await apiService.post('/settings/personal-info', personalInfo);
        } catch (error) {
            console.error('Failed to update personal info:', error);
            throw error;
        }
    };

    const updatePassword = async (passwordData) => {
        try {
            await apiService.post('/settings/update-password', passwordData);
        } catch (error) {
            console.error('Failed to update password:', error);
            throw error;
        }
    };

    const getBlockedUsers = async () => {
        try {
            const response = await apiService.get('/settings/blocked-users');
            return response.data;
        } catch (error) {
            console.error('Failed to get blocked users:', error);
            throw error;
        }
    };

    const searchUsers = async (query) => {
        try {
            const response = await apiService.get(`/users/search?q=${query}`);
            return response.data;
        } catch (error) {
            console.error('Failed to search users:', error);
            throw error;
        }
    };

    const blockUser = async (userId) => {
        try {
            await apiService.post('/settings/block-user', { userId });
        } catch (error) {
            console.error('Failed to block user:', error);
            throw error;
        }
    };

    const unblockUser = async (userId) => {
        try {
            await apiService.post('/settings/unblock-user', { userId });
        } catch (error) {
            console.error('Failed to unblock user:', error);
            throw error;
        }
    };

    const getNotificationSettings = async () => {
        try {
            const response = await apiService.get('/settings/notifications');
            notificationSettings.value = response.data;
            return response.data;
        } catch (error) {
            console.error('Failed to get notification settings:', error);
            throw error;
        }
    };

    const updateNotificationSetting = async (key, value) => {
        try {
            await apiService.post('/settings/notifications', { [key]: value });
            notificationSettings.value[key] = value;
        } catch (error) {
            console.error('Failed to update notification setting:', error);
            throw error;
        }
    };

    const getDisableAllNotifications = async () => {
        try {
            const response = await apiService.get('/settings/disable-all-notifications');
            disableAllNotifications.value = response.data.disabled;
            return response.data.disabled;
        } catch (error) {
            console.error('Failed to get disable all notifications setting:', error);
            throw error;
        }
    };

    const updateDisableAllNotifications = async (value) => {
        try {
            await apiService.post('/settings/disable-all-notifications', { disabled: value });
            disableAllNotifications.value = value;
        } catch (error) {
            console.error('Failed to update disable all notifications setting:', error);
            throw error;
        }
    };

    const getPushSettings = async () => {
        loading.value = true;
        error.value = null;
        try {
            const response = await apiService.get('/settings/get_push_settings');
            notificationSettings.value = response.data.data;
            return response.data.data;
        } catch (error) {
            console.error('Failed to get push notification settings:', error);
            error.value = 'Failed to fetch push notification settings';
            throw error;
        } finally {
            loading.value = false;
        }
    };

    const updatePushSettings = async (settings) => {
        loading.value = true;
        error.value = null;
        try {
            await apiService.post('/settings/update_push_settings', settings);
            notificationSettings.value = { ...notificationSettings.value, ...settings };
        } catch (error) {
            console.error('Failed to update push notification settings:', error);
            error.value = 'Failed to update push notification settings';
            throw error;
        } finally {
            loading.value = false;
        }
    };

    return {
        notificationSettings,
        disableAllNotifications,
        loading,
        error,
        updatePersonalInfo,
        updatePassword,
        getBlockedUsers,
        searchUsers,
        blockUser,
        unblockUser,
        getNotificationSettings,
        updateNotificationSetting,
        getDisableAllNotifications,
        updateDisableAllNotifications,
        getPushSettings,
        updatePushSettings,
    };
});

