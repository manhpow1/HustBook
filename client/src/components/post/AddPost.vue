<template>
    <div class="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-6 text-gray-800 flex items-center">
            <PencilIcon class="w-6 h-6 mr-2 text-indigo-600" />
            Create a New Post
        </h2>
        <Form @submit="submitPost" v-slot="{ errors }">
            <div class="space-y-6">
                <div>
                    <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                        Description
                    </label>
                    <Field name="description" v-slot="{ field, errorMessage }">
                        <textarea v-bind="field" id="description" rows="3" :class="[
                            'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition duration-300 ease-in-out',
                            { 'border-red-500': errorMessage }
                        ]" placeholder="What's on your mind?"></textarea>
                        <p v-if="errorMessage" class="mt-2 text-sm text-red-600">{{ errorMessage }}</p>
                    </Field>
                </div>

                <div>
                    <label for="status-select" class="block text-sm font-medium text-gray-700 mb-2">
                        How are you feeling?
                    </label>
                    <Field name="status" v-slot="{ field, errorMessage }">
                        <select v-bind="field" id="status-select" :class="[
                            'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md',
                            { 'border-red-500': errorMessage }
                        ]">
                            <option value="">Select a status</option>
                            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                                {{ option.label }}
                            </option>
                        </select>
                        <p v-if="errorMessage" class="mt-2 text-sm text-red-600">{{ errorMessage }}</p>
                    </Field>
                </div>

                <FileUpload v-model:files="files" @error="fileError = $event" />

                <div>
                    <button type="button" @click="showEmojiPicker = !showEmojiPicker"
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        aria-label="Toggle emoji picker">
                        <SmileIcon class="w-5 h-5 mr-2" />
                        Add Emoji
                    </button>
                    <div v-if="showEmojiPicker" class="mt-2">
                        <button v-for="emoji in emojis" :key="emoji" @click="insertEmoji(emoji)"
                            class="inline-flex items-center justify-center w-8 h-8 m-1 text-lg hover:bg-gray-200 rounded"
                            :aria-label="`Insert ${emoji} emoji`">
                            {{ emoji }}
                        </button>
                    </div>
                </div>

                <button type="submit" :disabled="Object.keys(errors).length > 0 || isLoading"
                    class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out">
                    <LoaderIcon v-if="isLoading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                    {{ isLoading ? "Posting..." : "Create Post" }}
                </button>
            </div>
        </Form>

        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md flex items-start">
            <CheckCircleIcon class="h-5 w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-green-700">{{ successMessage }}</p>
        </div>

        <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md flex items-start">
            <XCircleIcon class="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
            <p class="text-red-700">{{ errorMessage }}</p>
        </div>

        <transition name="fade">
            <div v-if="showUploadProgress" class="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-md">
                <p class="text-sm font-medium text-gray-700 mb-2">Uploading post...</p>
                <div class="w-48 h-2 bg-gray-200 rounded-full">
                    <div class="h-full bg-indigo-600 rounded-full" :style="{ width: `${uploadProgress}%` }"></div>
                </div>
            </div>
        </transition>

        <UnsavedChangesModal v-model="showUnsavedChangesModal" @save="saveChanges" @discard="discardChanges"
            @cancel="cancelNavigation" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Form, Field, defineRule, configure } from 'vee-validate'
import { required, max } from '@vee-validate/rules'
import { localize } from '@vee-validate/i18n'
import UnsavedChangesModal from '../shared/UnsavedChangesModal.vue'
import { useUserStore } from '../../stores/userStore'
import { usePostStore } from '../../stores/postStore'
import { PencilIcon, LoaderIcon, CheckCircleIcon, XCircleIcon, SmileIcon } from 'lucide-vue-next'
import FileUpload from '../shared/FileUpload.vue'
import logger from '../../services/logging'
import { sanitizeInput } from '../../utils/sanitize'

// Define validation rules
defineRule('required', required)
defineRule('max', max)

// Configure Vee-Validate
configure({
    generateMessage: localize('en', {
        messages: {
            required: 'This field is required',
            max: 'This field must be {length} characters or less'
        }
    })
})

const router = useRouter()
const userStore = useUserStore()
const postStore = usePostStore()
const showUnsavedChangesModal = ref(false)
const pendingNavigation = ref(null)

const files = ref([])
const fileError = ref('')
const isLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const showEmojiPicker = ref(false)
const showUploadProgress = ref(false)
const uploadProgress = ref(0)

const statusOptions = [
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'excited', label: 'Excited' },
    { value: 'angry', label: 'Angry' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'loved', label: 'Loved' },
]

const emojis = ['😀', '😂', '😍', '🥳', '😎', '🤔', '😊', '👍', '❤️', '🎉']

const insertEmoji = (emoji) => {
    const descriptionField = document.getElementById('description')
    const start = descriptionField.selectionStart
    const end = descriptionField.selectionEnd
    const text = descriptionField.value
    const newText = text.substring(0, start) + emoji + text.substring(end)
    descriptionField.value = newText
    descriptionField.setSelectionRange(start + emoji.length, start + emoji.length)
    descriptionField.focus()
}

const submitPost = async (values) => {
    if (files.value.length === 0 && !values.description.trim()) {
        errorMessage.value = "Please add an image/video or write a description"
        logger.warn('Attempted to submit empty post')
        return
    }

    isLoading.value = true
    errorMessage.value = ''
    successMessage.value = ''
    showUploadProgress.value = true

    const sanitizedDescription = sanitizeInput(values.description)

    try {
        const response = await postStore.createPost({
            described: sanitizedDescription,
            status: values.status,
            files: files.value
        })

        if (response.code === '1000') {
            successMessage.value = 'Post created successfully!'
            logger.info('Post created successfully', { postId: response.data.id })
            resetForm()
            router.push('/') // Navigate to home page after successful post
        } else {
            errorMessage.value = response.message || 'An error occurred while creating the post'
            logger.warn('Failed to create post', { responseCode: response.code, message: response.message })
        }
    } catch (error) {
        logger.error('Error in submitPost', error)
        errorMessage.value = 'An error occurred while creating the post. Please try again.'
    } finally {
        isLoading.value = false
        showUploadProgress.value = false
        uploadProgress.value = 0
    }
}

const resetForm = () => {
    files.value = []
    fileError.value = ''
    showEmojiPicker.value = false
    localStorage.removeItem('postDraft')
}

const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges.value) {
        e.preventDefault()
        e.returnValue = ''
    }
}

const handleRouteChange = (to, from, next) => {
    if (hasUnsavedChanges.value) {
        showUnsavedChangesModal.value = true
        pendingNavigation.value = { to, from, next }
    } else {
        next()
    }
}

const saveChanges = async () => {
    await submitPost()
    if (!errorMessage.value) {
        showUnsavedChangesModal.value = false
        pendingNavigation.value.next()
    }
}

const discardChanges = () => {
    resetForm()
    showUnsavedChangesModal.value = false
    localStorage.removeItem('postDraft')
    pendingNavigation.value.next()
}

const cancelNavigation = () => {
    showUnsavedChangesModal.value = false
    pendingNavigation.value.next(false)
}

const saveDraft = (values) => {
    localStorage.setItem('postDraft', JSON.stringify({
        description: values.description,
        status: values.status,
        files: files.value
    }))
}

const loadDraft = () => {
    const draft = JSON.parse(localStorage.getItem('postDraft'))
    if (draft) {
        return {
            description: draft.description || '',
            status: draft.status || '',
        }
    }
    return {
        description: '',
        status: '',
    }
}

onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
})

const initialValues = loadDraft()
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
    opacity: 0;
}
</style>