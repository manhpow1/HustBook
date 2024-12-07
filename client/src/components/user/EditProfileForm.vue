<!-- src/components/user/EditProfileForm.vue -->
<template>
    <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Edit Profile</h2>
        <form @submit.prevent="submitForm" class="space-y-4">
            <Input v-model="form.username" label="Username" placeholder="Enter your username" />
            <Input v-model="form.description" label="Description" placeholder="Short bio or description" />
            <Input v-model="form.address" label="Address" placeholder="Your address" />
            <Input v-model="form.city" label="City" placeholder="Your city" />
            <Input v-model="form.country" label="Country" placeholder="Your country" />
            <Input v-model="form.cover_image" label="Cover Image URL" placeholder="Link to cover image" />
            <Input v-model="form.link" label="External Link" placeholder="Link to your website or profile" />

            <Button type="submit" :disabled="isLoading">
                {{ isLoading ? 'Updating...' : 'Update Profile' }}
            </Button>
        </form>
        <p v-if="successMessage" class="text-green-600 mt-2">{{ successMessage }}</p>
        <p v-if="error" class="text-red-600 mt-2">{{ error }}</p>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { Input, Button } from '../ui';

const userStore = useUserStore();

const form = ref({
    username: '',
    description: '',
    address: '',
    city: '',
    country: '',
    cover_image: '',
    link: ''
});

const isLoading = computed(() => userStore.isLoading);
const successMessage = computed(() => userStore.successMessage);
const error = computed(() => userStore.error);

const submitForm = async () => {
    const result = await userStore.updateUserInfo({ ...form.value });
    if (result) {
        // Optionally reset form or show a success toast
    }
};
</script>
