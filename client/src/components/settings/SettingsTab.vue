<template>
    <div class="bg-white shadow-md rounded-lg p-6">
        <h1 class="text-2xl font-bold mb-6">Settings</h1>

        <div class="space-y-8">
            <AccountSettings />
            <PrivacySettings />
            <NotificationSettings />

            <div class="border-t pt-6">
                <h2 class="text-xl font-semibold mb-4">Help & Support</h2>
                <router-link to="/terms-and-policies" class="text-blue-600 hover:underline">
                    Terms & Policies
                </router-link>
            </div>

            <div class="border-t pt-6 space-y-4">
                <button @click="logout"
                    class="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition duration-300">
                    Logout
                </button>
                <button @click="exit"
                    class="w-full bg-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-400 transition duration-300">
                    Exit
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import AccountSettings from './AccountSettings.vue';
import PrivacySettings from './PrivacySettings.vue';
import NotificationSettings from './NotificationSettings.vue';

const router = useRouter();
const userStore = useUserStore();

const logout = async () => {
    await userStore.logout();
    router.push('/login');
};

const exit = () => {
    // Implement exit functionality (e.g., clear session, redirect to homepage)
    router.push('/');
};
</script>