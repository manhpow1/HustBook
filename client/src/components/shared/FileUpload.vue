<template>
    <div>
        <label for="file-upload" class="block text-sm font-medium text-gray-700 mb-2">
            Upload Images (Max 4)
        </label>
        <div class="image-grid" :class="[`grid-${previewUrls.length}`]">
            <div v-for="(preview, index) in previewUrls" :key="index" class="image-container">
                <img :src="preview" alt="Preview" class="preview-image" />
                <button @click="removeFile(index)" type="button" class="remove-button" aria-label="Remove image">
                    <XIcon class="w-4 h-4" />
                </button>
            </div>
            <label v-if="previewUrls.length < 4" for="file-upload" class="upload-label">
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
import { ref } from 'vue'
import { XIcon, UploadCloudIcon } from 'lucide-vue-next'

const props = defineProps({
    maxFiles: { type: Number, default: 4 },
    maxFileSize: { type: Number, default: 5 * 1024 * 1024 } // 5MB
})

const emit = defineEmits(['update:files', 'error'])

const previewUrls = ref([])
const fileError = ref('')

const handleFileUpload = (event) => {
    try {
        const uploadedFile = event.target.files[0]

        if (!uploadedFile) {
            logger.info('No file selected')
            return
        }

        if (previewUrls.value.length >= 4) {
            fileError.value = "You can upload a maximum of 4 images"
            logger.warn('Max image limit reached', { currentCount: previewUrls.value.length })
            return
        }

        if (uploadedFile.type.startsWith("video/")) {
            if (uploadedFile.size > 10 * 1024 * 1024) {
                fileError.value = "Video duration should be less than 60 seconds and size should be less than 10MB"
                logger.warn('Video file size too large', { size: uploadedFile.size, maxSize: 10 * 1024 * 1024 })
                return
            }

            const video = document.createElement("video")
            video.preload = "metadata"
            video.onloadedmetadata = () => {
                if (video.duration > 60) {
                    fileError.value = "Video duration should be less than 60 seconds and size should be less than 10MB"
                    logger.warn('Video duration too long', { duration: video.duration })
                } else {
                    processFile(uploadedFile)
                }
                URL.revokeObjectURL(video.src)
            }
            video.onerror = () => {
                fileError.value = "Error processing video file"
                logger.error('Error processing video file', { fileName: uploadedFile.name })
                URL.revokeObjectURL(video.src)
            }
            video.src = URL.createObjectURL(uploadedFile)
        } else if (uploadedFile.type.startsWith("image/")) {
            if (uploadedFile.size > MAX_FILE_SIZE) {
                fileError.value = "File size is too big (max 5MB for images, 10MB for videos)"
                logger.warn('Image file size too large', { size: uploadedFile.size, maxSize: MAX_FILE_SIZE })
                return
            }
            processFile(uploadedFile)
        } else {
            fileError.value = "Only image and video files are allowed"
            logger.warn('Invalid file type', { type: uploadedFile.type })
        }
    } catch (error) {
        logger.error('Error in handleFileUpload', error)
        fileError.value = "An error occurred while processing the file"
    }
}

const removeFile = (index) => {
    files.value.splice(index, 1)
    previewUrls.value.splice(index, 1)
}

const processFile = (file) => {
    files.value.push(file)
    const reader = new FileReader()
    reader.onload = (e) => {
        previewUrls.value.push(e.target.result)
        logger.info('File processed successfully', { fileName: file.name })
    }
    reader.onerror = (e) => {
        logger.error('Error reading file', { fileName: file.name, error: e.target.error })
        errorMessage.value = 'Error reading file. Please try again.'
    }
    reader.readAsDataURL(file)
}

</script>