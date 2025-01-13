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
                    <!-- Description Field -->
                    <FormField v-slot="{ messages }" name="description">
                        <FormItem>
                            <FormLabel>Content</FormLabel>
                            <FormControl>
                                <MarkdownEditor v-model="form.description" :maxLength="1000"
                                    placeholder="What's on your mind?" @input="validateDescription"
                                    :disabled="isLoading" />
                            </FormControl>
                            <FormMessage>{{ descriptionError }}</FormMessage>
                        </FormItem>
                    </FormField>

                    <!-- Media Upload -->
                    <FormField v-slot="{ messages }" name="media">
                        <FormItem>
                            <FormLabel>Media</FormLabel>
                            <FormControl>
                                <FileUpload v-model="form.media" :maxFiles="4" accept="image/*"
                                    :initialFiles="initialMedia" mode="edit" @change="handleMediaChange"
                                    @error="handleUploadError" className="h-30" />
                            </FormControl>
                            <FormMessage>{{ mediaError }}</FormMessage>
                            <FormDescription>
                                Add up to 4 images. Maximum 5MB per image.
                            </FormDescription>
                        </FormItem>
                    </FormField>

                    <!-- Media Preview -->
                    <div v-if="form.media.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div v-for="(file, index) in mediaPreviews" :key="index" class="relative">
                            <AspectRatio ratio="{1}">
                                <img :src="file" alt="Preview" class="rounded-md object-cover w-full h-full" />
                            </AspectRatio>
                            <Button variant="destructive" size="icon" class="absolute -top-2 -right-2 h-6 w-6"
                                @click="removeMedia(index)">
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
                        <Button type="submit" :disabled="!isFormValid || isLoading">
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
const form = ref({
    description: "",
    media: [],
});

// UI State
const isLoading = ref(false);
const error = ref("");
const successMessage = ref("");
const showUnsavedDialog = ref(false);
const initialMedia = ref([]);
const mediaPreviews = ref([]);
const descriptionError = ref("");
const mediaError = ref("");

// Form Validation
const { validateDescription } = useFormValidation();

const isFormValid = computed(() => {
    return form.value.description.trim().length > 0 && !descriptionError.value;
});

const hasUnsavedChanges = computed(() => {
    if (!currentPost.value) return false;
    
    const contentChanged = form.value.description !== currentPost.value.content;
    const mediaChanged = JSON.stringify(form.value.media) !== JSON.stringify(initialMedia.value);
    
    return contentChanged || mediaChanged;
});

const handleMediaChange = async (files) => {
    try {
        if (files.length > 4) {
            mediaError.value = "Maximum 4 files allowed";
            return;
        }

        mediaError.value = "";
        mediaPreviews.value = [];

        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) {
                mediaError.value = "Each file must be less than 5MB";
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                mediaPreviews.value.push(e.target.result);
            };
            reader.readAsDataURL(file);
        }

        form.value.media = files;
    } catch (err) {
        logger.error("Media change error:", err);
        mediaError.value = "Failed to process media files";
        handleError(err);
    }
};

const removeMedia = (index) => {
    form.value.media = form.value.media.filter((_, i) => i !== index);
    mediaPreviews.value = mediaPreviews.value.filter((_, i) => i !== index);
};

const handleUploadError = (err) => {
    mediaError.value = err.message || "Failed to upload file";
    handleError(err);
};

const loadPostData = async () => {
    try {
        isLoading.value = true;
        error.value = "";

        const post = await postStore.fetchPost(postId);
        if (!post) throw new Error("Post not found");

        // Initialize form with post data
        form.value.description = post.content || "";

        if (post.media?.length) {
            initialMedia.value = post.media;
            mediaPreviews.value = post.media.map((url) => url);
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

const handleSubmit = async () => {
    try {
        if (!isFormValid.value) return;

        isLoading.value = true;
        error.value = "";
        successMessage.value = "";

        // Validate content
        const content = form.value.description.trim();
        if (!content) {
            error.value = "Post content cannot be empty";
            return;
        }

        const postData = {
            content: content,
            existingImages: [],
            media: []
        };

        if (form.value.media.length > 0) {
            form.value.media.forEach(file => {
                // Nếu là URL (ảnh hiện có)
                if (typeof file === 'string' && file.startsWith('http')) {
                    postData.existingImages.push(file);
                } else {
                    // Nếu là file mới
                    postData.media.push(file);
                }
            });
        }

        await postStore.updatePost(postId, postData);

        successMessage.value = "Post updated successfully";
        toast({
            title: "Success",
            description: "Post updated successfully",
        });
        
        // Clear the form and draft
        form.value.description = '';
        form.value.media = [];
        mediaPreviews.value = [];
        editorRef.value?.clearDraft();

        router.push({
            name: "PostDetail",
            params: { postId },
        });
    } catch (err) {
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
    form.value.description = currentPost.value?.content || '';
    form.value.media = [...initialMedia.value];
    mediaPreviews.value = [...initialMedia.value];
    router.back();
};

// Lifecycle Hooks
onMounted(async () => {
    await loadPostData();
});

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
