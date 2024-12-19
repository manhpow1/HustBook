<template>
    <Teleport to="body">
        <Transition name="fade">
            <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                role="dialog" aria-modal="true" aria-labelledby="advanced-options-title">
                <div ref="modalRef" class="bg-white rounded-lg p-6 w-80 sm:w-96 focus:outline-none" tabindex="-1">
                    <h2 id="advanced-options-title" class="text-xl font-bold mb-4">Advanced Options</h2>
                    <ul class="space-y-2">
                        <li v-if="isOwnPost">
                            <button @click="$emit('edit')"
                                class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Edit Post">
                                Edit Post
                            </button>
                        </li>
                        <li v-if="isOwnPost">
                            <button @click="$emit('delete')"
                                class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Delete Post">
                                Delete Post
                            </button>
                        </li>
                        <li v-if="isOwnPost">
                            <button @click="$emit('toggleComments')"
                                class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Toggle Comments">
                                {{ post.canComment === '1' ? 'Turn Off Comments' : 'Turn On Comments' }}
                            </button>
                        </li>
                        <li v-if="!isOwnPost">
                            <button @click="$emit('report')"
                                class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Report Post">
                                Report Post
                            </button>
                        </li>
                        <li v-if="!isOwnPost">
                            <button @click="$emit('hide')"
                                class="w-full text-left py-2 px-4 hover:bg-gray-100 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                aria-label="Hide Post">
                                Hide Post
                            </button>
                        </li>
                    </ul>
                    <button @click="handleClose"
                        class="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Close Advanced Options">
                        Close
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { createFocusTrap } from 'focus-trap';

const props = defineProps({
    isOwnPost: {
        type: Boolean,
        required: true
    },
    post: {
        type: Object,
        required: true
    },
    isVisible: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits(['close', 'edit', 'delete', 'toggleComments', 'report', 'hide']);

const modalRef = ref(null);
let focusTrap = null;

// Handle closing the modal
const handleClose = () => {
    emit('close');
};

// Handle Escape key to close the modal
const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
        handleClose();
    }
};

onMounted(() => {
    watch(
        () => props.isVisible,
        (newVal) => {
            if (newVal) {
                nextTick(() => {
                    if (modalRef.value) {
                        focusTrap = createFocusTrap(modalRef.value, {
                            onDeactivate: handleClose,
                            escapeDeactivates: true,
                            clickOutsideDeactivates: true
                        });
                        focusTrap.activate();
                    }
                });

                document.addEventListener('keydown', handleKeyDown);
            } else {
                if (focusTrap) {
                    focusTrap.deactivate();
                }
                document.removeEventListener('keydown', handleKeyDown);
            }
        },
        { immediate: true }
    );
});

onUnmounted(() => {
    if (focusTrap) {
        focusTrap.deactivate();
    }
    document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
