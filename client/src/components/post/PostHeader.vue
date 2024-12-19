<template>
    <div class="flex items-center mb-4">
        <!-- Author Avatar -->
        <img :src="post.author?.avatar || defaultAvatar" :alt="post.author?.name || 'Unknown Author'"
            class="w-12 h-12 rounded-full mr-4" loading="lazy" />

        <!-- Author Name and Post Date -->
        <div>
            <h2 class="font-bold text-lg">{{ post.author?.name || 'Unknown Author' }}</h2>
            <p class="text-sm text-gray-500">{{ formattedDate }}</p>
        </div>

        <!-- Advanced Options (Edit, Delete, Report, Share) -->
        <div v-if="isOwnPost" class="ml-auto relative">
            <button @click="toggleAdvancedOptions" class="text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Advanced options" data-testid="advanced-options-button">
                <MoreVerticalIcon class="w-5 h-5" aria-hidden="true" />
            </button>

            <transition name="fade">
                <div v-if="showAdvancedOptions"
                    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1 text-sm" role="menu"
                    aria-orientation="vertical" aria-labelledby="advanced-options-button">
                    <button @click="editPost" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem" data-testid="edit-post-button">
                        Edit Post
                    </button>
                    <button @click="confirmDeletePost"
                        class="block px-4 py-2 text-red-600 hover:bg-gray-100 w-full text-left" role="menuitem"
                        data-testid="delete-post-button">
                        Delete Post
                    </button>
                    <button @click="reportPost" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem" data-testid="report-post-button">
                        Report Post
                    </button>
                    <button @click="sharePost" class="block px-4 py-2 text-gray-700 hover:bg-gray-100 w-full text-left"
                        role="menuitem" data-testid="share-post-button">
                        Share Post
                    </button>
                </div>
            </transition>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { MoreVerticalIcon } from 'lucide-vue-next';
import { useConfirmDialog } from '@vueuse/core';
import { useToast } from '../../composables/useToast';
import { usePostStore } from '../../stores/postStore';
import { formatDate } from '../../utils/helpers';

// Define component props
const props = defineProps({
    post: {
        type: Object,
        required: true,
    },
    isOwnPost: {
        type: Boolean,
        default: false,
    },
});

// Define component emits
const emit = defineEmits(['editPost', 'deletePost', 'reportPost', 'sharePost']);

// Composables
const { confirm: confirmAction } = useConfirmDialog();
const { showToast } = useToast();
const postStore = usePostStore();

// Reactive state for advanced options visibility
const showAdvancedOptions = ref(false);

// Default avatar image path
const defaultAvatar = '../../assets/avatar-default.svg';

// Computed property for formatted post date
const formattedDate = computed(() => formatDate(props.post.created));

// Method to toggle advanced options menu
const toggleAdvancedOptions = () => {
    showAdvancedOptions.value = !showAdvancedOptions.value;
};

// Method to emit editPost event
const editPost = () => {
    emit('editPost');
    showAdvancedOptions.value = false;
};

// Method to confirm and emit deletePost event
const confirmDeletePost = async () => {
    const isConfirmed = await confirmAction('Are you sure you want to delete this post? This action cannot be undone.');
    if (isConfirmed) {
        try {
            await postStore.deletePost(props.post.id);
            showToast('Post deleted successfully.', 'success');
            emit('deletePost');
        } catch (error) {
            console.error('Error deleting post:', error);
            showToast('Failed to delete post. Please try again.', 'error');
        }
    }
    showAdvancedOptions.value = false;
};

// Method to emit reportPost event
const reportPost = () => {
    emit('reportPost');
    showAdvancedOptions.value = false;
};

// Method to emit sharePost event
const sharePost = () => {
    emit('sharePost');
    showAdvancedOptions.value = false;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

button:disabled {
    pointer-events: none;
}
</style>