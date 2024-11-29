<template>
    <div>
        <label for="file-upload" class="block text-sm font-medium text-gray-700 mb-2">
            Upload Images (Max {{ maxFiles }})
        </label>
        <div class="image-grid" :class="[`grid-${previewUrls.length}`]">
            <div v-for="(preview, index) in previewUrls" :key="index" class="image-container">
                <img :src="preview" alt="Preview" class="preview-image" />
                <button @click="removeFile(index)" type="button" class="remove-button" aria-label="Remove image">
                    <XIcon class="w-4 h-4" />
                </button>
            </div>
            <label v-if="previewUrls.length < maxFiles" for="file-upload" class="upload-label">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <UploadCloudIcon class="w-10 h-10 mb-3 text-gray-400" />
                    <p class="text-xs text-gray-500">Click to add image</p>
                </div>
            </label>
        </div>
        <input id="file-upload" type="file" accept="image/*" @change="handleFileUpload" class="hidden" />
        <p v-if="fileError" class="mt-2 text-sm text-red-600">
            {{ fileError }}
        </p>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { XIcon, UploadCloudIcon } from 'lucide-vue-next';
import logger from '../../services/logging';

const props = defineProps({
    maxFiles: { type: Number, default: 4 },
    maxFileSize: { type: Number, default: 5 * 1024 * 1024 }, // 5MB
});

const emit = defineEmits(['update:files', 'error']);

const files = ref([]);
const previewUrls = ref([]);
const fileError = ref('');

const handleFileUpload = (event) => {
    try {
        const uploadedFile = event.target.files[0];

        if (!uploadedFile) {
            logger.info('No file selected');
            return;
        }

        if (files.value.length >= props.maxFiles) {
            fileError.value = `You can upload a maximum of ${props.maxFiles} images`;
            logger.warn('Max image limit reached', { currentCount: files.value.length });
            emit('error', fileError.value);
            return;
        }

        if (!uploadedFile.type.startsWith('image/')) {
            fileError.value = 'Only image files are allowed';
            logger.warn('Invalid file type', { type: uploadedFile.type });
            emit('error', fileError.value);
            return;
        }

        if (uploadedFile.size > props.maxFileSize) {
            fileError.value = `File size is too big (max ${props.maxFileSize / (1024 * 1024)}MB)`;
            logger.warn('Image file size too large', { size: uploadedFile.size, maxSize: props.maxFileSize });
            emit('error', fileError.value);
            return;
        }

        processFile(uploadedFile);
    } catch (error) {
        logger.error('Error in handleFileUpload', error);
        fileError.value = 'An error occurred while processing the file';
        emit('error', fileError.value);
    }
};

const removeFile = (index) => {
    files.value.splice(index, 1);
    previewUrls.value.splice(index, 1);
    emit('update:files', files.value);
};

const processFile = (file) => {
    files.value.push(file);
    const reader = new FileReader();
    reader.onload = (e) => {
        previewUrls.value.push(e.target.result);
        logger.info('File processed successfully', { fileName: file.name });
        emit('update:files', files.value);
    };
    reader.onerror = (e) => {
        logger.error('Error reading file', { fileName: file.name, error: e.target.error });
        fileError.value = 'Error reading file. Please try again.';
        emit('error', fileError.value);
    };
    reader.readAsDataURL(file);
};
</script>