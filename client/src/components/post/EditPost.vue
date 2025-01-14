<template>
    <div class="container mx-auto py-6 px-4 md:px-6">
        <Card class="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <PencilIcon class="h-5 w-5" />
                    Edit Post
                </CardTitle>
                <CardDescription> Update your post content and media </CardDescription>
            </CardHeader>
            <CardContent>
                <form @submit.prevent="handleSubmit" class="space-y-6">
                    <MarkdownEditor v-model="description" placeholder="What's on your mind?" :disabled="isLoading"
                        :maxLength="1000" ref="editorRef" @input="validateDescription" />

                    <div class="flex items-center gap-2">
                        <div class="flex-1">
                            <FileUpload v-model="files" :maxFiles="4" accept="image/jpeg,image/png,image/gif"
                                mode="edit" multiple @change="handleFilesChange" :initialFiles="initialMedia">
                                <template #trigger>
                                    <Button variant="outline" size="sm">
                                        <ImageIcon class="h-4 w-4 mr-2" />
                                        Add Images
                                    </Button>
                                </template>
                            </FileUpload>
                        </div>
                    </div>

                    <!-- Media Preview -->
                    <div v-if="files.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div v-for="(file, index) in previewUrls" :key="index" class="relative aspect-square">
                            <img :src="file" alt="Preview" class="rounded-md object-cover w-full h-full" />
                            <Button variant="destructive" size="icon" class="absolute -top-2 -right-2 h-6 w-6"
                                @click="removeFile(index)">
                                <XIcon class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <!-- Error Alert -->
                    <Alert v-if="error" variant="destructive">
                        <AlertCircle class="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{{ error }}</AlertDescription>
                    </Alert>

                    <!-- Success Alert -->
                    <Alert v-if="successMessage" variant="success">
                        <CheckCircleIcon class="h-4 w-4" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{{ successMessage }}</AlertDescription>
                    </Alert>

                    <!-- Action Buttons -->
                    <div class="flex justify-end gap-4">
                        <Button type="button" variant="outline" @click="handleCancel" :disabled="isLoading">
                            Cancel
                        </Button>
                        <Button type="submit" :disabled="!isValid || isLoading">
                            <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                            {{ isLoading ? "Saving..." : "Save Changes" }}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        <!-- Unsaved Changes Modal -->
        <Dialog :open="showUnsavedDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Unsaved Changes</DialogTitle>
                    <DialogDescription>
                        You have unsaved changes. What would you like to do?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" @click="closeUnsavedDialog">
                        Keep Editing
                    </Button>
                    <Button variant="destructive" @click="discardChanges">
                        Discard Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { usePostStore } from "@/stores/postStore";
import { useErrorHandler } from "@/utils/errorHandler";
import { useImageProcessing } from "@/composables/useImageProcessing";
import { useFormValidation } from "@/composables/useFormValidation";
import { useToast } from "@/components/ui/toast";
import { sanitizeInput } from "@/utils/sanitize";
import logger from "@/services/logging";
import {
    PencilIcon,
    XIcon,
    AlertCircle,
    CheckCircleIcon,
    Loader2Icon,
    ImageIcon,
} from "lucide-vue-next";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import MarkdownEditor from "@/components/shared/MarkdownEditor.vue";
import FileUpload from "@/components/shared/FileUpload.vue";

// Router & Store Setup
const router = useRouter();
const route = useRoute();
const postId = route.params.postId;
const postStore = usePostStore();
const { toast } = useToast();
const { handleError } = useErrorHandler();
const { compressImage } = useImageProcessing();
const currentPost = computed(() => postStore.currentPost);

// Component refs
const editorRef = ref(null);

// Form State
const description = ref("");
const files = ref([]);

// UI State
const isLoading = ref(false);
const error = ref("");
const successMessage = ref("");
const showUnsavedDialog = ref(false);
const initialMedia = ref([]);
const mediaPreviews = ref([]);
const previewUrls = ref([]);
const descriptionError = ref("");
const mediaError = ref("");

// Form Validation
const validateDescription = () => {
    const content = description.value?.trim() || '';
    if (content.length === 0 && (!files.value || files.value.length === 0)) {
        descriptionError.value = "Post must have either text or images";
    } else if (content.length > 1000) {
        descriptionError.value = "Description must not exceed 1000 characters";
    } else if (content.includes('```') && !content.match(/```[\w-]*\n[\s\S]*?\n```/g)) {
        descriptionError.value = "Code blocks must specify a language";
    } else {
        descriptionError.value = "";
    }
};

const isValid = computed(() => {
    return (
        (description.value.trim().length > 0 || files.value.length > 0) &&
        !descriptionError.value &&
        !mediaError.value
    );
});

const hasUnsavedChanges = computed(() => {
    if (!currentPost.value) return false;

    const contentChanged = description.value !== currentPost.value.content;
    const mediaChanged = JSON.stringify(files.value) !== JSON.stringify(initialMedia.value);

    return contentChanged || mediaChanged;
});

const handleFilesChange = async (newFiles) => {
    console.log('handleFilesChange called with files:', newFiles);
    try {
        if (newFiles.length > 4) {
            console.warn('File limit exceeded:', newFiles.length);
            mediaError.value = "Maximum 4 files allowed";
            return;
        }

        mediaError.value = "";
        files.value = newFiles;
        previewUrls.value = [];

        console.log('Processing files...');
        for (const file of newFiles) {
            if (typeof file === 'string') {
                console.log('Processing existing image URL:', file);
                previewUrls.value.push(file);
            } else {
                console.log('Processing new file:', file.name, 'Size:', file.size);
                if (file.size > 5 * 1024 * 1024) {
                    console.warn('File size exceeds limit:', file.size);
                    mediaError.value = "Each file must be less than 5MB";
                    return;
                }

                const reader = new FileReader();
                await new Promise((resolve) => {
                    reader.onload = (e) => {
                        console.log('File preview created successfully');
                        previewUrls.value.push(e.target.result);
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            }
        }
        console.log('All files processed successfully');
    } catch (err) {
        console.error('Error in handleFilesChange:', err);
        logger.error("Media change error:", err);
        mediaError.value = "Failed to process media files";
        handleError(err);
    }
};

const loadPostData = async () => {
    try {
        isLoading.value = true;
        error.value = "";

        const response = await postStore.fetchPost(postId);
        if (!response || response.code !== "1000" || !response.data) {
            throw new Error("Post not found");
        }

        const post = response.data;
        
        // Initialize form with post data
        description.value = post.content || "";

        // Handle images
        if (Array.isArray(post.images) && post.images.length > 0) {
            initialMedia.value = [...post.images];
            files.value = [...post.images];
            previewUrls.value = [...post.images];
        } else {
            initialMedia.value = [];
            files.value = [];
            previewUrls.value = [];
        }

        logger.debug("Post data loaded successfully");
    } catch (err) {
        error.value = "Failed to load post";
        handleError(err);
        router.push({ name: "Home" });
    } finally {
        isLoading.value = false;
    }
};

const removeFile = (index) => {
    files.value = files.value.filter((_, i) => i !== index);
    previewUrls.value = previewUrls.value.filter((_, i) => i !== index);
};

const handleUploadError = (err) => {
    mediaError.value = err.message || "Failed to upload file";
    handleError(err);
};

const handleSubmit = async () => {
    logger.debug('Submit handler triggered');
    try {
        if (!isValid.value) {
            logger.warn('Form validation failed');
            return;
        }

        isLoading.value = true;
        error.value = "";
        successMessage.value = "";

        // Trích xuất và validate content
        const content = description.value?.trim();

        // Create FormData
        const formData = new FormData();
        formData.set('content', content);

        logger.debug('Processing content:', {
            content: content.substring(0, 50),
            length: content.length,
            hasFiles: files.value.length > 0
        });

        const existingImages = files.value
            .filter(file => typeof file === 'string' && file.startsWith('http'));

        const newFiles = files.value
            .filter(file => file instanceof File);

        if (existingImages.length > 0) {
            formData.set('existingImages', JSON.stringify(existingImages));
        }

        newFiles.forEach(file => {
            formData.append('images', file);
        });

        logger.debug('Submitting update:', {
            postId,
            contentLength: content.length,
            existingImagesCount: existingImages.length,
            newFilesCount: newFiles.length
        });

        const response = await postStore.updatePost(postId, formData);

        if (!response || response.code !== '1000') {
            throw new Error(response?.message || 'Failed to update post');
        }

        successMessage.value = "Post updated successfully";
        toast({
            description: "Post updated successfully",
        });

        // Clear unsaved changes state before navigation
        showUnsavedDialog.value = false;
        description.value = "";
        files.value = [];
        previewUrls.value = [];
        
        // Navigate to post detail
        await router.push({
            name: "PostDetail",
            params: { postId },
        });
    } catch (err) {
        logger.error('Submit error:', err);
        error.value = err.message || "Failed to update post";
        handleError(err);
        toast({
            title: "Error",
            description: error.value,
            variant: "destructive",
        });
    } finally {
        isLoading.value = false;
    }
};

const handleCancel = () => {
    if (hasUnsavedChanges.value) {
        showUnsavedDialog.value = true;
    } else {
        router.back();
    }
};

const closeUnsavedDialog = () => {
    showUnsavedDialog.value = false;
};

const discardChanges = () => {
    showUnsavedDialog.value = false;
    description.value = currentPost.value?.content || "";
    files.value = [...initialMedia.value];
    previewUrls.value = [...initialMedia.value];
    router.back();
};

onBeforeUnmount(() => {
    // Cleanup any resources if needed
});

// Route Guard
const handleBeforeRouteLeave = (to, from, next) => {
    if (hasUnsavedChanges.value && !showUnsavedDialog.value) {
        showUnsavedDialog.value = true;
        next(false);
    } else {
        next();
    }
};

onMounted(() => {
    router.beforeEach(handleBeforeRouteLeave);
});

onMounted(async () => {
    await loadPostData();
});

onBeforeUnmount(() => {
    router.beforeEach(() => true); // Clean up route guard
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    @apply transition-opacity duration-300;
}

.fade-enter-from,
.fade-leave-to {
    @apply opacity-0;
}
</style>
