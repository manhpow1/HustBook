<template>
    <div>
        <div class="mb-4 p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
            <div class="flex items-start">
                <img :src="comment.user.avatar" :alt="comment.user.name" class="w-10 h-10 rounded-full mr-3">
                <div class="flex-grow">
                    <div class="flex items-center justify-between mb-1">
                        <h4 class="font-semibold text-gray-800">{{ comment.user.name }}</h4>
                        <span class="text-xs text-gray-500">{{ formatDate(comment.created) }}</span>
                    </div>
                    <div v-if="!isEditing">
                        <p class="text-gray-700 whitespace-pre-wrap break-words" v-html="renderedContent"></p>
                    </div>
                    <div v-else>
                        <label for="edit-comment" class="sr-only">{{ $t('editComment') }}</label>
                        <textarea id="edit-comment" v-model="editedContent"
                            class="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows="3" :placeholder="$t('editCommentPlaceholder')"></textarea>
                    </div>
                    <div class="mt-2 flex items-center space-x-4">
                        <button @click="debouncedToggleLike"
                            class="text-sm flex items-center text-gray-500 hover:text-blue-500 transition-colors duration-200"
                            :class="{ 'text-blue-500': comment.is_liked }" :disabled="isLikeLoading"
                            :aria-label="comment.is_liked ? $t('unlike') : $t('like')">
                            <ThumbsUpIcon class="w-4 h-4 mr-1" />
                            {{ comment.like }} {{ comment.like === 1 ? $t('like') : $t('likes') }}
                            <span v-if="isLikeLoading" class="ml-1 animate-spin">⌛</span>
                        </button>
                        <button v-if="canEditDelete" @click="toggleEdit"
                            class="text-sm text-gray-500 hover:text-blue-500 transition-colors duration-200"
                            :aria-label="isEditing ? $t('cancelEdit') : $t('edit')">
                            {{ isEditing ? $t('cancel') : $t('edit') }}
                        </button>
                        <button v-if="canEditDelete && !isEditing" @click="openDeleteDialog"
                            class="text-sm text-gray-500 hover:text-red-500 transition-colors duration-200"
                            :aria-label="$t('delete')">
                            {{ $t('delete') }}
                        </button>
                    </div>
                </div>
            </div>
            <div v-if="isEditing" class="mt-2 flex justify-end space-x-2">
                <button @click="saveEdit"
                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
                    :disabled="isSaveLoading" :aria-label="$t('save')">
                    {{ $t('save') }}
                    <span v-if="isSaveLoading" class="ml-1 animate-spin">⌛</span>
                </button>
                <button @click="cancelEdit"
                    class="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200"
                    :aria-label="$t('cancel')">
                    {{ $t('cancel') }}
                </button>
            </div>
        </div>

        <!-- Delete Confirmation Dialog -->
        <teleport to="body">
            <div v-if="showDeleteDialog"
                class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                    <h3 class="text-lg font-semibold mb-4">{{ $t('confirmDelete') }}</h3>
                    <p class="mb-6">{{ $t('deleteWarning') }}</p>
                    <div class="flex justify-end space-x-4">
                        <button @click="confirmDelete"
                            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200"
                            :disabled="isDeleteLoading">
                            {{ $t('delete') }}
                            <span v-if="isDeleteLoading" class="ml-1 animate-spin">⌛</span>
                        </button>
                        <button @click="closeDeleteDialog"
                            class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200">
                            {{ $t('cancel') }}
                        </button>
                    </div>
                </div>
            </div>
        </teleport>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ThumbsUpIcon } from 'lucide-vue-next'
import { useUserStore } from '../store/user'
import { formatDate, renderMarkdown } from '../utils/helpers'
import { debounce } from 'lodash-es'

const props = defineProps({
    comment: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['update', 'delete'])

const { t } = useI18n()
const userStore = useUserStore()

const isEditing = ref(false)
const editedContent = ref(props.comment.content)
const showDeleteDialog = ref(false)
const isLikeLoading = ref(false)
const isSaveLoading = ref(false)
const isDeleteLoading = ref(false)

const canEditDelete = computed(() => userStore.userId === props.comment.user.id)
const renderedContent = computed(() => renderMarkdown(props.comment.content))

const toggleEdit = () => {
    isEditing.value = !isEditing.value
    if (isEditing.value) {
        editedContent.value = props.comment.content
    }
}

const saveEdit = async () => {
    if (editedContent.value.trim() !== props.comment.content) {
        isSaveLoading.value = true
        try {
            await emit('update', {
                id: props.comment.id,
                content: editedContent.value.trim()
            })
            isEditing.value = false
        } catch (error) {
            console.error('Failed to save edit:', error)
            alert(t('saveEditError'))
        } finally {
            isSaveLoading.value = false
        }
    } else {
        isEditing.value = false
    }
}

const cancelEdit = () => {
    isEditing.value = false
    editedContent.value = props.comment.content
}

const openDeleteDialog = () => {
    showDeleteDialog.value = true
}

const closeDeleteDialog = () => {
    showDeleteDialog.value = false
}

const confirmDelete = async () => {
    isDeleteLoading.value = true
    try {
        await emit('delete', props.comment.id)
        closeDeleteDialog()
    } catch (error) {
        console.error('Failed to delete comment:', error)
        alert(t('deleteError'))
    } finally {
        isDeleteLoading.value = false
    }
}

const toggleLike = async () => {
    isLikeLoading.value = true
    try {
        await emit('update', {
            id: props.comment.id,
            is_liked: !props.comment.is_liked,
            like: props.comment.like + (props.comment.is_liked ? -1 : 1)
        })
    } catch (error) {
        console.error('Failed to toggle like:', error)
        alert(t('likeError'))
    } finally {
        isLikeLoading.value = false
    }
}

const debouncedToggleLike = debounce(toggleLike, 300)

onMounted(() => {
    document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
})

const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
        if (isEditing.value) {
            cancelEdit()
        } else if (showDeleteDialog.value) {
            closeDeleteDialog()
        }
    }
}
</script>

<style scoped>
/* Add any scoped styles here if needed */
</style>