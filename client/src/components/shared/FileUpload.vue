<template>
    <div class="w-full">
        <div class="relative" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop">
            <div class="group relative border-2 border-dashed rounded-lg transition-colors" :class="[
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
                modelValue.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary cursor-pointer',
                className
            ]" @click.stop.prevent="triggerFileSelect">
                <slot name="trigger">
                    <div class="flex flex-col items-center justify-center space-y-2 p-4">
                        <div class="p-2 bg-background rounded-full ring-1 ring-border/10">
                            <UploadCloudIcon v-if="!isProcessing"
                                class="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                            <Loader2Icon v-else class="h-6 w-6 animate-spin text-primary" />
                        </div>
                        <div class="text-center space-y-1">
                            <p class="text-sm text-muted-foreground/80">
                                <span v-if="!isProcessing">
                                    Drop your files here, or
                                    <span class="text-primary">browse</span>
                                </span>
                                <span v-else>Processing files...</span>
                            </p>
                            <p class="text-xs text-muted-foreground">
                                Maximum {{ maxFiles }} files. {{ allowedTypesText }} (max {{ formatFileSize(maxFileSize)
                                }})
                            </p>
                        </div>
                    </div>
                </slot>
            </div>

            <input ref="fileInput" type="file" :accept="accept" class="hidden" @change="handleFileSelect"
                :multiple="maxFiles > 1" />
        </div>

        <div v-if="isProcessing" class="mt-2 space-y-1">
            <Progress :value="uploadProgress" class="w-full" />
            <p class="text-xs text-center text-muted-foreground">
                Processing files... {{ Math.round(uploadProgress) }}%
            </p>
        </div>

        <div v-if="error" class="mt-2">
            <Alert variant="destructive">
                <AlertCircle class="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UploadCloudIcon, Loader2Icon, AlertCircle } from 'lucide-vue-next'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useImageProcessing } from '@/composables/useImageProcessing'
import logger from '@/services/logging'

const props = defineProps({
    modelValue: {
        type: Array,
        default: () => []
    },
    maxFiles: {
        type: Number,
        default: 4
    },
    maxFileSize: {
        type: Number,
        default: 4 * 1024 * 1024 // 4MB
    },
    accept: {
        type: String,
        default: 'image/jpeg,image/png,image/gif'
    },
    className: {
        type: String,
        default: 'h-24'
    },
    mode: {
        type: String,
        default: 'add', // 'add' or 'edit'
        validator: (value) => ['add', 'edit'].includes(value)
    }
})

const emit = defineEmits(['update:modelValue', 'change', 'error'])

const { compressImage, validateImage } = useImageProcessing()

const fileInput = ref(null)
const isDragging = ref(false)
const isProcessing = ref(false)
const uploadProgress = ref(0)
const error = ref('')

const allowedTypesText = computed(() => {
    return props.accept.split(',').map(type => {
        return type.replace('image/', '').toUpperCase()
    }).join(', ')
})

const validateFiles = (files) => {
    if (!files?.length) return false

    const totalFiles = props.mode === 'edit' ? files.length : files.length + props.modelValue.length
    if (totalFiles > props.maxFiles) {
        error.value = `Maximum ${props.maxFiles} files allowed`
        return false
    }

    const invalidFiles = Array.from(files).filter(file => {
        if (file.size > props.maxFileSize) {
            error.value = `File ${file.name} exceeds ${formatFileSize(props.maxFileSize)}`
            return true
        }

        if (!props.accept.includes(file.type)) {
            error.value = `File ${file.name} must be ${allowedTypesText.value}`
            return true
        }

        return !validateImage(file)
    })

    return invalidFiles.length === 0
}

const processFiles = async (files) => {
    if (!validateFiles(files)) return

    isProcessing.value = true
    uploadProgress.value = 0
    error.value = ''

    try {
        const processedFiles = []
        const totalFiles = files.length

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const compressedFile = await compressImage(file)

            if (compressedFile) {
                processedFiles.push(compressedFile)
            }

            uploadProgress.value = ((i + 1) / totalFiles) * 100
        }

        emit('change', processedFiles)

    } catch (err) {
        error.value = 'Failed to process files'
        logger.error('File processing error:', err)
        emit('error', err)
    } finally {
        isProcessing.value = false
        uploadProgress.value = 0
    }
}

const formatFileSize = (bytes) => {
    const units = ['B', 'KB', 'MB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
}

const triggerFileSelect = () => {
    if (props.modelValue.length >= props.maxFiles) return
    fileInput.value?.click()
}

const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length) {
        processFiles(files)
    }
    event.target.value = ''
}

const handleDrop = (event) => {
    isDragging.value = false
    const files = Array.from(event.dataTransfer.files || [])
    if (files.length) {
        processFiles(files)
    }
}
</script>
