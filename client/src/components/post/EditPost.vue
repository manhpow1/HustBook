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
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <MarkdownEditor v-model="form.description" :maxLength="1000"
                                    placeholder="What's on your mind?" @input="validateDescription"
                                    :disabled="isLoading" />
                            </FormControl>
                            <FormMessage>{{ descriptionError }}</FormMessage>
                            <FormDescription>
                                {{ form.description.length }}/1000 characters
                            </FormDescription>
                        </FormItem>
                    </FormField>

                    <!-- Media Upload -->
                    <FormField v-slot="{ messages }" name="media">
                        <FormItem>
                            <FormLabel>Media</FormLabel>
                            <FormControl>
                                <FileUpload v-model="form.media" :maxFiles="4" accept="image/*"
                                    :initialFiles="initialMedia" @change="handleMediaChange" @error="handleUploadError"
                                    class="h-32" />
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
import { PencilIcon, XIcon, AlertCircle, CheckCircleIcon, Loader2Icon } from "lucide-vue-next";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import MarkdownEditor from "@/components/shared/MarkdownEditor.vue";
import FileUpload from "@/components/shared/FileUpload.vue";

// Props & Route
const props = defineProps({
    postId: {
        type: String,
        required: true,
    },
});

// Router & Store Setup
const router = useRouter();
const route = useRoute();
const postStore = usePostStore();
const { handleError } = useErrorHandler();
const { compressImage } = useImageProcessing();
const { toast } = useToast();

// Form State
const form = ref({
    description: "",
    media: [],
});

const initialMedia = ref([]);
const mediaPreviews = ref([]);
const isLoading = ref(false);
const error = ref("");
const successMessage = ref("");
const showUnsavedDialog = ref(false);
const descriptionError = ref("");
const mediaError = ref("");

// Computed
const isFormValid = computed(() => {
    return (
        form.value.description.trim().length > 0 &&
        form.value.description.length <= 1000 &&
        !descriptionError.value &&
        !mediaError.value
    );
});

const hasUnsavedChanges = computed(() => {
    return (
        form.value.description !== postStore.currentPost?.described ||
        form.value.media.length !== initialMedia.value.length
    );
});

// Methods
const validateDescription = () => {
    const content = form.value.description.trim();
    if (!content) {
        descriptionError.value = "Description cannot be empty";
    } else if (content.length > 1000) {
        descriptionError.value = "Description must not exceed 1000 characters";
    } else {
        descriptionError.value = "";
    }
};

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

        const post = await postStore.fetchPost(props.postId);
        if (!post) throw new Error("Post not found");

        form.value.description = post.described || "";

        if (post.media?.length) {
            initialMedia.value = post.media;
            mediaPreviews.value = post.media;
        }

        logger.debug("Post data loaded successfully");
    } catch (err) {
        error.value = "Failed to load post";
        handleError(err);
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

        // Process images if needed
        const processedMedia = await Promise.all(
            form.value.media.map((file) => compressImage(file))
        );

        const postData = {
            described: sanitizeInput(form.value.description),
            media: processedMedia.filter(Boolean),
        };

        await postStore.updatePost(props.postId, postData);

        successMessage.value = "Post updated successfully";
        toast({
            title: "Success",
            description: "Post updated successfully",
        });

        router.push({
            name: "PostDetail",
            params: { postId: props.postId },
        });
    } catch (err) {
        error.value = "Failed to update post";
        handleError(err);
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
    if (hasUnsavedChanges.value) {
        showUnsavedDialog.value = true;
        next(false);
    } else {
        next();
    }
};

router.beforeEach(handleBeforeRouteLeave);
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
