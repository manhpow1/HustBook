<template>
    <div class="space-y-4">
        <div class="relative" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop">
            <div class="group relative border-2 border-dashed rounded-lg p-6 transition-colors" :class="[
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
                modelValue.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer'
            ]" @click="triggerFileSelect">
                <div class="flex flex-col items-center justify-center space-y-4">
                    <div class="p-2 bg-background rounded-full ring-1 ring-border/10">
                        <UploadCloudIcon v-if="!isUploading"
                            class="h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary" />
                        <Loader2Icon v-else class="h-10 w-10 animate-spin text-primary" />
                    </div>

                    <div class="text-center space-y-2">
                        <p class="text-sm text-muted-foreground/80">
                            <span v-if="!isUploading">
                                Drag and drop your files here, or
                                <Button variant="link" class="px-1">browse</Button>
                                to choose files
                            </span>
                            <span v-else>Uploading files...</span>
                        </p>
                        <p class="text-xs text-muted-foreground">
                            Maximum {{ maxFiles }} files. JPG, PNG or GIF (max {{ formatFileSize(maxFileSize) }})
                        </p>
                    </div>
                </div>
            </div>

            <input ref="fileInput" type="file" :accept="accept" class="hidden" @change="handleFileSelect"
                :multiple="maxFiles > 1" />
        </div>

        <!-- Upload Progress -->
        <div v-if="isUploading" class="space-y-2">
            <Progress :value="uploadProgress" class="w-full h-2" />
            <p class="text-xs text-muted-foreground text-center">
                Processing files... {{ Math.round(uploadProgress) }}%
            </p>
        </div>

        <!-- Preview Grid -->
        <div v-if="previewUrls.length > 0" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="(preview, index) in previewUrls" :key="index"
                class="relative group aspect-square rounded-lg overflow-hidden border">
                <img :src="preview" alt="Upload preview"
                    class="h-full w-full object-cover transition-all group-hover:scale-105" />

                <div
                    class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="destructive" size="icon" class="h-8 w-8" @click="removeFile(index)"
                        :aria-label="`Remove file ${index + 1}`">
                        <XIcon class="h-4 w-4" />
                    </Button>
                </div>

                <div class="absolute bottom-0 left-0 right-0 p-2 text-xs bg-black/60 text-white">
                    {{ formatFileSize(modelValue[index]?.size || 0) }}
                </div>
            </div>
        </div>

        <!-- Error Alert -->
        <Alert v-if="error" variant="destructive" class="animate-in fade-in-50">
            <AlertCircleIcon class="h-4 w-4" />
            <AlertTitle class="font-medium">Error</AlertTitle>
            <AlertDescription class="text-sm">{{ error }}</AlertDescription>
        </Alert>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { UploadCloudIcon, XIcon, Loader2Icon, AlertCircleIcon } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useImageProcessing } from '../../composables/useImageProcessing';
import logger from '../../services/logging';

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => [],
    },
    initialFiles: {
        type: Array,
        default: () => [],
    },
    maxFiles: {
        type: Number,
        default: 4
    },
    maxFileSize: {
        type: Number,
        default: 5 * 1024 * 1024 // 5MB
    },
    accept: {
        type: String,
        default: 'image/*'
    }
});

const emit = defineEmits([
    'update:modelValue',
    'upload-progress',
    'upload-error',
    'upload-success'
]);

// State
const fileInput = ref(null);
const isDragging = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const error = ref('');
const previewUrls = ref([]);

// Image processing composable
const { compressImage, validateImage } = useImageProcessing();

// Methods
const triggerFileSelect = () => {
    if (props.modelValue.length >= props.maxFiles) {
        error.value = `Maximum ${props.maxFiles} files allowed`;
        return;
    }
    fileInput.value?.click();
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const validateFiles = (files) => {
    if (files.length + props.modelValue.length > props.maxFiles) {
        throw new Error(`Maximum ${props.maxFiles} files allowed`);
    }

    for (const file of files) {
        if (file.size > props.maxFileSize) {
            throw new Error(`File ${file.name} is too large. Maximum size is ${formatFileSize(props.maxFileSize)}`);
        }

        if (!file.type.startsWith('image/')) {
            throw new Error(`File ${file.name} is not an image`);
        }
    }
};

const processFiles = async (files) => {
    isUploading.value = true;
    uploadProgress.value = 0;
    error.value = '';

    try {
        validateFiles(files);

        const processedFiles = [];
        const totalFiles = files.length;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!validateImage(file)) {
                continue;
            }

            const compressedFile = await compressImage(file);
            if (compressedFile) {
                processedFiles.push(compressedFile);

                // Create preview URL
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewUrls.value.push(e.target.result);
                };
                reader.readAsDataURL(compressedFile);
            }

            // Update progress
            uploadProgress.value = ((i + 1) / totalFiles) * 100;
            emit('upload-progress', uploadProgress.value);
        }

        emit('update:modelValue', [...props.modelValue, ...processedFiles]);
        emit('upload-success', processedFiles);

    } catch (err) {
        error.value = err.message;
        emit('upload-error', err);
        logger.error('File processing error:', err);
    } finally {
        isUploading.value = false;
        uploadProgress.value = 0;
    }
};

const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) {
        processFiles(files);
    }
    // Reset input to allow selecting the same file again
    event.target.value = '';
};

const handleDrop = (event) => {
    isDragging.value = false;
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) {
        processFiles(files);
    }
};

const removeFile = (index) => {
    const newFiles = [...props.modelValue];
    newFiles.splice(index, 1);
    previewUrls.value.splice(index, 1);
    emit('update:modelValue', newFiles);
};

// Load initial files if provided
onMounted(() => {
    if (props.initialFiles.length) {
        previewUrls.value = props.initialFiles.map(file => file.url);
    }
});

// Watch for external changes to modelValue
watch(() => props.modelValue, (newFiles) => {
    if (newFiles.length === 0) {
        previewUrls.value = [];
    }
}, { deep: true });
</script>
