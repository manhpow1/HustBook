<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800 flex items-center">
            <UserPlusIcon class="w-6 h-6 mr-2 text-indigo-600" aria-hidden="true" />
            Complete Your Profile
        </h2>
        <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
            <!-- userName Field -->
            <div>
                <label for="userName" class="block text-sm font-medium text-gray-700">userName</label>
                <div class="mt-1 relative rounded-md shadow-sm">
                    <input v-model="userName" type="text" id="userName" name="userName" required
                        aria-describedby="userName-error" @input="validateuserNameField"
                        class="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        :class="{ 'border-red-300': userNameError }" placeholder="Enter your userName" />
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <CheckCircleIcon v-if="!userNameError && userName" class="h-5 w-5 text-green-500"
                            aria-hidden="true" />
                        <XCircleIcon v-if="userNameError" class="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                </div>
                <p v-if="userNameError" id="userName-error" class="text-sm text-red-600 mt-1" role="alert">
                    {{ userNameError }}
                </p>
            </div>

            <!-- Avatar Upload Field -->
            <div>
                <label for="avatar-upload" class="block text-sm font-medium text-gray-700">Avatar</label>
                <div class="mt-1 flex items-center space-x-4">
                    <div v-if="avatarPreview" class="flex-shrink-0">
                        <img :src="avatarPreview" alt="Avatar preview" class="h-16 w-16 rounded-full object-cover" />
                    </div>
                    <label for="avatar-upload"
                        class="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        aria-label="Upload Avatar">
                        <span>{{ avatar ? 'Change' : 'Upload' }}</span>
                        <input id="avatar-upload" name="avatar-upload" type="file" @change="handleFileChange"
                            accept="image/*" class="sr-only" />
                    </label>
                    <button v-if="avatar" type="button" @click="removeAvatar"
                        class="text-sm text-red-500 hover:text-red-700 focus:outline-none" aria-label="Remove Avatar">
                        Remove
                    </button>
                </div>
                <p v-if="avatarError" class="text-sm text-red-600 mt-1" role="alert">
                    {{ avatarError }}
                </p>
            </div>

            <!-- Submit Button -->
            <div>
                <button type="submit" :disabled="isLoading || !!userNameError"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    :aria-disabled="isLoading || !!userNameError">
                    <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                        aria-hidden="true" />
                    {{ isLoading ? "Updating..." : "Update Profile" }}
                </button>
            </div>
        </form>

        <!-- Success Message -->
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-start" role="alert">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2" aria-hidden="true" />
            <p class="text-green-700">{{ successMessage }}</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-start" role="alert">
            <XCircleIcon class="h-5 w-5 text-red-400 mr-2" aria-hidden="true" />
            <div>
                <p class="text-red-700">{{ errorMessage }}</p>
                <!-- Additional Actions Based on Error -->
                <div v-if="errorMessage.includes('File upload failed')" class="mt-2 flex space-x-2">
                    <button @click="continueWithoutAvatar" class="bg-blue-500 text-white px-4 py-2 rounded text-sm"
                        aria-label="Continue without avatar">
                        Continue without avatar
                    </button>
                    <button @click="retryUpload" class="bg-green-500 text-white px-4 py-2 rounded text-sm"
                        aria-label="Retry Upload">
                        Try again
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores/userStore';
import { UserPlusIcon, CheckCircleIcon, XCircleIcon, LoaderIcon } from 'lucide-vue-next';
import { useFormValidation } from '../../composables/useFormValidation';
import { useImageProcessing } from '../../composables/useImageProcessing';
import { sanitizeInput } from '../../utils/sanitize';
import { useToast } from '../../composables/useToast';

const router = useRouter();
const userStore = useUserStore();

// Destructure store refs for reactivity
const { user, isLoading, errorMessage, successMessage } = storeToRefs(userStore);

// Initialize composables
const { showToast } = useToast();
const { validateuserName } = useFormValidation();
const { compressImage, validateImage, isProcessing: isCompressing } = useImageProcessing();

// Local component state
const userName = ref('');
const userNameError = ref('');
const avatar = ref(null);
const avatarPreview = ref('');
const avatarError = ref('');

// Validate the userName field in real-time
const validateuserNameField = () => {
    userNameError.value = validateuserName(userName.value);
};

const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // Validate file first
        if (!validateImage(file)) {
            event.target.value = '';
            return;
        }

        // Show preview immediately for better UX
        const reader = new FileReader();
        reader.onload = (e) => {
            avatarPreview.value = e.target.result;
        };
        reader.readAsDataURL(file);

        // Compress image
        const compressedFile = await compressImage(file);
        if (compressedFile) {
            avatar.value = compressedFile;
            avatarError.value = '';
        } else {
            avatar.value = null;
            avatarPreview.value = '';
            event.target.value = '';
        }
    } catch (error) {
        console.error('File handling error:', error);
        showToast('Error processing image', 'error');
        avatar.value = null;
        avatarPreview.value = '';
        event.target.value = '';
    }
};

// Remove the selected avatar
const removeAvatar = () => {
    avatar.value = null;
    avatarPreview.value = '';
    avatarError.value = '';
    const fileInput = document.getElementById('avatar-upload');
    if (fileInput) fileInput.value = '';
};

// Handle form submission
const handleSubmit = async () => {
    if (isCompressing.value) {
        showToast('Please wait while the image is being processed', 'info');
        return;
    }
    if (userNameError.value) return;

    try {
        // Sanitize inputs
        const sanitizeduserName = sanitizeInput(userName.value);

        await userStore.updateProfile(sanitizeduserName, avatar.value);

        if (userStore.user.value?.isBlocked) {
            showToast('Your account has been blocked.', 'error');
            router.push({ name: 'Login' });
        } else {
            showToast('Profile updated successfully.', 'success');
            // Optionally, redirect to another page after a delay
            setTimeout(() => {
                router.push({ name: 'Home' });
            }, 2000);
        }
    } catch (error) {
        // Error handling is managed by the store and useErrorHandler
    }
};

// Continue without uploading an avatar
const continueWithoutAvatar = () => {
    removeAvatar();
    handleSubmit();
};

// Retry uploading the avatar
const retryUpload = () => {
    avatarError.value = '';
    const fileInput = document.getElementById('avatar-upload');
    if (fileInput) fileInput.value = '';
};

// Watch for token changes to ensure the user is authenticated
onMounted(() => {
    if (!userStore.token) {
        router.push({ name: 'Login' });
    } else {
        // Initialize form with existing user data if available
        if (user.value) {
            userName.value = user.value.userName || '';
            if (user.value.avatar_url) {
                avatarPreview.value = user.value.avatar_url;
            }
        }
    }
});

// Watch for changes in the store's errorMessage and successMessage to show toast notifications
watch(
    () => errorMessage.value,
    (newError) => {
        if (newError) {
            showToast(newError, 'error');
        }
    }
);

watch(
    () => successMessage.value,
    (newSuccess) => {
        if (newSuccess) {
            showToast(newSuccess, 'success');
        }
    }
);
</script>

<style scoped>
/* Ensures the form is visually appealing and responsive */

/* Adjust focus styles for accessibility */
input:focus,
button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
    /* Indigo focus ring */
}

/* Loader icon positioning within the button */
button .animate-spin {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
