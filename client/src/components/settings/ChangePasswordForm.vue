<template>
    <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
            <label for="current-password" class="block text-sm font-medium text-gray-700">Current Password</label>
            <input v-model="currentPassword" type="password" id="current-password" required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
        </div>
        <div>
            <label for="new-password" class="block text-sm font-medium text-gray-700">New Password</label>
            <input v-model="newPassword" type="password" id="new-password" required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
        </div>
        <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-700">Confirm New Password</label>
            <input v-model="confirmPassword" type="password" id="confirm-password" required
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
        </div>
        <div>
            <button type="submit" :disabled="isLoading"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                {{ isLoading ? 'Changing Password...' : 'Change Password' }}
            </button>
        </div>
    </form>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { useToast } from '../ui/toast';

const userStore = useUserStore();
const { showToast } = useToast();

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isLoading = ref(false);

const handleSubmit = async () => {
    if (newPassword.value !== confirmPassword.value) {
        showToast('New passwords do not match', 'error');
        return;
    }

    isLoading.value = true;
    try {
        await userStore.changePassword(currentPassword.value, newPassword.value);
        showToast('Password changed successfully', 'success');
        currentPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
    } catch (error) {
        showToast(error.message || 'Failed to change password', 'error');
    } finally {
        isLoading.value = false;
    }
};
</script>