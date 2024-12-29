<template>
    <div class="max-w-2xl mx-auto mt-8 p-6" role="form">
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center">
                    <PencilIcon class="w-6 h-6 mr-2 text-primary" />
                    Create a New Post
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form @submit.prevent="submitPost" class="space-y-6">
                    <div class="space-y-2">
                        <Label for="description">Description</Label>
                        <Textarea v-model="description" id="description"
                            :class="{ 'border-destructive': descriptionError }" placeholder="What's on your mind?"
                            @input="onDescriptionInput" data-testid="description-textarea" />
                        <p v-if="descriptionError" class="text-sm text-destructive">
                            {{ descriptionError }}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Label for="status-select">How are you feeling?</Label>
                        <Select v-model="status" id="status-select" :options="statusOptions">
                            <SelectTrigger :id="id" :class="{ 'border-destructive': statusError }">
                                <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="option in statusOptions" :key="option.value" :value="option.value">
                                    {{ option.label }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p v-if="statusError" class="text-sm text-destructive">
                            {{ statusError }}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Label>Upload Images or Videos</Label>
                        <FileUpload v-model:files="files" :maxFiles="4" @upload-progress="handleUploadProgress"
                            @upload-error="handleUploadError" data-testid="file-upload" />
                        <p v-if="fileError" class="text-sm text-destructive">
                            {{ fileError }}
                        </p>
                    </div>

                    <div class="relative">
                        <Button type="button" variant="outline" @click="toggleEmojiPicker"
                            data-testid="toggle-emoji-picker-button">
                            <SmileIcon class="w-5 h-5 mr-2" />
                            Add Emoji
                        </Button>
                        <EmojiPicker v-if="showEmojiPicker" @select="insertEmoji" class="absolute z-10 mt-2" />
                    </div>

                    <Button type="submit" :disabled="isLoading || !isFormValid" class="w-full">
                        <LoaderIcon v-if="isLoading" class="animate-spin mr-2" />
                        {{ isLoading ? 'Posting...' : 'Create Post' }}
                    </Button>
                </form>

                <Toaster />
                <ToastProvider>
                    <ToastViewport />
                </ToastProvider>

                <Progress v-if="showUploadProgress" :value="uploadProgress" class="w-48 fixed top-4 right-4" />

                <Dialog v-model:open="showUnsavedChangesModal">
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Unsaved Changes</DialogTitle>
                            <DialogDescription>
                                Do you want to save your changes before leaving?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" @click="cancelNavigation">Cancel</Button>
                            <Button variant="destructive" @click="discardChanges">Discard</Button>
                            <Button @click="saveChanges">Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/components/ui/toast'
import { PencilIcon, LoaderIcon, SmileIcon } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Toaster, ToastProvider, ToastViewport } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import FileUpload from '../shared/FileUpload.vue'
import EmojiPicker from '../ui/EmojiPicker.vue'
import { usePostStore } from '../../stores/postStore'
import { useFormValidation } from '../../composables/useFormValidation'
import { useErrorHandler } from '@/utils/errorHandler'
import { debounce } from 'lodash-es'
import { sanitizeInput } from '../../utils/sanitize'
import logger from '../../services/logging'

const router = useRouter();
const postStore = usePostStore();
const { handleError } = useErrorHandler();

// Form State
const description = ref('');
const status = ref('');
const files = ref([]);
const isLoading = ref(false);
const successMessage = ref('');
const errorMessage = ref('');
const showEmojiPicker = ref(false);
const showUploadProgress = ref(false);
const uploadProgress = ref(0);

// Modal State
const showUnsavedChangesModal = ref(false);
const pendingNavigation = ref(null);

// Form Validation
const {
    descriptionError,
    statusError,
    fileError,
    validateDescription,
    validateStatus,
    validateFiles,
} = useFormValidation();

// Status Options
const statusOptions = [
    { value: 'happy', label: 'Happy' },
    { value: 'sad', label: 'Sad' },
    { value: 'excited', label: 'Excited' },
    { value: 'angry', label: 'Angry' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'loved', label: 'Loved' },
];

// Computed Properties
const isFormValid = computed(() => {
    const isDescriptionValid = validateDescription(description.value);
    const isStatusValid = validateStatus(status.value);
    const areFilesValid = validateFiles(files.value);
    return isDescriptionValid && isStatusValid && areFilesValid && !fileError.value;
});

// Debounced Functions
const debouncedValidateInput = debounce((input, errorRef) => {
    if (input.length > 1000) {
        errorRef.value = 'Description is too long.';
    } else if (input.trim() === '') {
        errorRef.value = 'Description cannot be empty.';
    } else {
        errorRef.value = '';
    }
}, 300);

const debouncedSaveDraft = debounce(() => {
    const draft = {
        description: description.value,
        status: status.value,
        files: files.value,
    };
    localStorage.setItem('postDraft', JSON.stringify(draft));
    logger.debug('Draft saved to localStorage');
}, 1000);

// Input Handler
const onDescriptionInput = () => {
    debouncedValidateInput(description.value, descriptionError);
    debouncedSaveDraft();
};

// Load Draft on Mount
const loadDraft = () => {
    const draft = localStorage.getItem('postDraft');
    if (draft) {
        const { description: desc, status: stat, files: fls } = JSON.parse(draft);
        description.value = desc;
        status.value = stat;
        files.value = fls;
        logger.debug('Draft loaded from localStorage');
    }
};

// Submit Post
const submitPost = async () => {
    if (!isFormValid.value) {
        errorMessage.value = 'Please fix the errors before submitting.';
        return;
    }

    isLoading.value = true;
    errorMessage.value = '';
    successMessage.value = '';
    showUploadProgress.value = true;

    const sanitizedDescription = sanitizeInput(description.value);

    try {
        const response = await postStore.createPost({
            described: sanitizedDescription,
            status: status.value,
            files: files.value, // Assuming files are handled as File objects in store
        });

        if (response.code === '1000') {
            successMessage.value = 'Post created successfully!';
            logger.info('Post created successfully', { postId: response.data.id });
            resetForm();
            router.push('/'); // Navigate to home or post detail page as needed
        } else {
            errorMessage.value = response.message || 'An error occurred while creating the post.';
            logger.warn('Failed to create post', { responseCode: response.code, message: response.message });
        }
    } catch (error) {
        logger.error('Error in submitPost', error);
        errorMessage.value = 'An error occurred while creating the post. Please try again.';
        await handleError(error);
    } finally {
        isLoading.value = false;
        showUploadProgress.value = false;
        uploadProgress.value = 0;
    }
};

// Reset Form Fields
const resetForm = () => {
    description.value = '';
    status.value = '';
    files.value = [];
    showEmojiPicker.value = false;
    localStorage.removeItem('postDraft');
};

// Insert Emoji into Description
const insertEmoji = (emoji) => {
    description.value += emoji;
};

// Toggle Emoji Picker
const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value;
};

// Handle Upload Progress
const handleUploadProgress = (progress) => {
    uploadProgress.value = progress;
};

// Handle Upload Errors
const handleUploadError = (error) => {
    errorMessage.value = 'Failed to upload files. Please try again.';
    logger.error('File upload error:', error);
};

// Handle Unsaved Changes
const saveChanges = async () => {
    await submitPost();
    if (!errorMessage.value) {
        showUnsavedChangesModal.value = false;
        pendingNavigation.value.next();
    }
};

const discardChanges = () => {
    resetForm();
    showUnsavedChangesModal.value = false;
    pendingNavigation.value.next();
};

const cancelNavigation = () => {
    showUnsavedChangesModal.value = false;
    pendingNavigation.value.next(false);
};

// Navigation Guard
const handleRouteChange = (to, from, next) => {
    if (hasUnsavedChanges.value) {
        showUnsavedChangesModal.value = true;
        pendingNavigation.value = { to, from, next };
    } else {
        next();
    }
};

// Computed for Unsaved Changes
const hasUnsavedChanges = computed(() => {
    return (
        description.value.trim() !== '' ||
        status.value !== '' ||
        files.value.length > 0
    );
});

// Lifecycle Hooks
onMounted(() => {
    loadDraft();
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.beforeEach(handleRouteChange);
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    router.beforeEach(() => { }); // Remove the navigation guard
});

// Handle Browser Before Unload Event
const handleBeforeUnload = (e) => {
    if (hasUnsavedChanges.value) {
        e.preventDefault();
        e.returnValue = '';
    }
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

button:focus {
    outline: 2px solid #4299e1;
    /* Tailwind's focus ring equivalent */
    outline-offset: 2px;
}

.relative {
    position: relative;
}

.absolute {
    position: absolute;
}

.fixed {
    position: fixed;
}

.z-10 {
    z-index: 10;
}

.z-50 {
    z-index: 50;
}
</style>