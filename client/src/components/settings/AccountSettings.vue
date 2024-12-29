<template>
    <div>
        <h2 class="text-xl font-semibold mb-4">Account Settings</h2>

        <div class="space-y-6">
            <!-- Personal Information Form -->
            <div>
                <h3 class="text-lg font-medium mb-2">Personal Information</h3>
                <form @submit.prevent="updatePersonalInfo" class="space-y-4">
                    <div>
                        <label for="firstName" class="block text-sm font-medium text-gray-700">First Name</label>
                        <input type="text" id="firstName" v-model="personalInfo.firstName"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    </div>
                    <div>
                        <label for="middleName" class="block text-sm font-medium text-gray-700">Middle Name</label>
                        <input type="text" id="middleName" v-model="personalInfo.middleName"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    </div>
                    <div>
                        <label for="lastName" class="block text-sm font-medium text-gray-700">Last Name</label>
                        <input type="text" id="lastName" v-model="personalInfo.lastName"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    </div>
                    <button type="submit"
                        class="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-300">
                        Update Personal Information
                    </button>
                </form>
                <p class="mt-2 text-sm text-gray-500">Please note that changes to your name may take up to 24 hours to
                    reflect across the platform.</p>
            </div>
            <!-- Edit Profile Form for set_user_info endpoint -->
            <div>
                <h3 class="text-lg font-medium mb-2">Edit Profile</h3>
                <EditProfileForm />
            </div>
            <!-- Security (Change Password) Form -->
            <div>
                <h3 class="text-lg font-medium mb-2">Security</h3>
                <form @submit.prevent="updatePassword" class="space-y-4">
                    <div>
                        <label for="oldPassword" class="block text-sm font-medium text-gray-700">Current
                            Password</label>
                        <input type="password" id="oldPassword" v-model="passwordChange.oldPassword"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    </div>
                    <div>
                        <label for="newPassword" class="block text-sm font-medium text-gray-700">New Password</label>
                        <input type="password" id="newPassword" v-model="passwordChange.newPassword"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    </div>
                    <div>
                        <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm New
                            Password</label>
                        <input type="password" id="confirmPassword" v-model="passwordChange.confirmPassword"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                    </div>
                    <button type="submit"
                        class="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-300">
                        Update Password
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../ui/toast';
import EditProfileForm from '../user/EditProfileForm.vue';

const settingsStore = useSettingsStore();
const { toast } = useToast();

const personalInfo = ref({
    firstName: '',
    middleName: '',
    lastName: ''
});

const passwordChange = ref({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
});

const updatePersonalInfo = async () => {
    try {
        await settingsStore.updatePersonalInfo(personalInfo.value);
        toast({ type: 'success', message: 'Personal information updated successfully' });
    } catch (error) {
        toast({ type: 'error', message: 'Failed to update personal information' });
    }
};

const updatePassword = async () => {
    if (passwordChange.value.newPassword !== passwordChange.value.confirmPassword) {
        toast({ type: 'error', message: 'New passwords do not match' });
        return;
    }

    try {
        await settingsStore.updatePassword(passwordChange.value);
        toast({ type: 'success', message: 'Password updated successfully' });
        passwordChange.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
    } catch (error) {
        toast({ type: 'error', message: 'Failed to update password' });
    }
};
</script>