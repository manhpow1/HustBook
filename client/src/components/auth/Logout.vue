<template>
    <div>
        <button @click="showConfirmation = true"
            class="flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-300"
            aria-haspopup="dialog" aria-controls="logout-confirmation" aria-expanded="showConfirmation">
            <LogOutIcon class="w-5 h-5 mr-2" aria-hidden="true" />
            <slot>Logout</slot>
        </button>

        <!-- Confirmation Dialog -->
        <TransitionRoot appear :show="showConfirmation" as="template">
            <Dialog as="div" @close="cancelLogout" class="relative z-10" id="logout-confirmation"
                aria-labelledby="logout-dialog-title" aria-modal="true">
                <TransitionChild enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100"
                    leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0" as="template">
                    <div class="fixed inset-0 bg-black bg-opacity-25" />
                </TransitionChild>

                <div class="fixed inset-0 overflow-y-auto">
                    <div class="flex min-h-full items-center justify-center p-4 text-center">
                        <TransitionChild enter="duration-300 ease-out" enter-from="opacity-0 scale-95"
                            enter-to="opacity-100 scale-100" leave="duration-200 ease-in"
                            leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95" as="template">
                            <DialogPanel
                                class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900"
                                    id="logout-dialog-title">
                                    Confirm Logout
                                </DialogTitle>
                                <div class="mt-2">
                                    <p class="text-sm text-gray-500">
                                        Are you sure you want to log out? You will be redirected to the login page.
                                    </p>
                                </div>

                                <div class="mt-4 flex justify-end space-x-3">
                                    <button type="button"
                                        class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                        @click="cancelLogout">
                                        Cancel
                                    </button>
                                    <button type="button"
                                        class="inline-flex justify-center rounded-md border border-transparent bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                        @click="handleLogout" :disabled="isLoading">
                                        <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                                            aria-hidden="true" />
                                        {{ isLoading ? 'Logging out...' : 'Confirm Logout' }}
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>

        <!-- Toast Notification -->
        <TransitionRoot appear :show="!!message" as="template">
            <div :class="[
                'fixed bottom-4 right-4 px-4 py-2 rounded-md text-white transition-all duration-500 ease-in-out',
                messageClass,
            ]" role="status" aria-live="polite">
                <div class="flex items-center">
                    <CheckCircleIcon v-if="messageClass.includes('bg-green')" class="w-5 h-5 mr-2" aria-hidden="true" />
                    <AlertCircleIcon v-else class="w-5 h-5 mr-2" aria-hidden="true" />
                    <span>{{ message }}</span>
                </div>
            </div>
        </TransitionRoot>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { LogOutIcon, LoaderIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-vue-next';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { useToast } from '../../composables/useToast';
import { useErrorHandler } from '../../composables/useErrorHandler';

const userStore = useUserStore();
const { handleError } = useErrorHandler();
const { showToast } = useToast();

const showConfirmation = ref(false);

// Handle the logout process
const handleLogout = async () => {
    showConfirmation.value = false;

    try {
        const success = await userStore.logout();
        if (success) {
            showToast('Logout successful!', 'success');
        } else {
            showToast(userStore.error || 'Logout failed. Please try again.', 'error');
        }
    } catch (error) {
        handleError(error);
        showToast('An unexpected error occurred. Please try again.', 'error');
    }
};

// Cancel the logout process
const cancelLogout = () => {
    showConfirmation.value = false;
};
</script>

<style scoped>
/* Ensure accessibility for focus states */
button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
    /* Focus ring color */
}
</style>