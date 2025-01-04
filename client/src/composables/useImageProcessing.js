import { ref } from 'vue';
import { useToast } from '@/components/ui/toast';
import logger from '@/services/logging';

export function useImageProcessing() {
    const { toast } = useToast();
    const isProcessing = ref(false);

    const compressImage = async (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
        try {
            isProcessing.value = true;

            if (!validateImage(file)) {
                return null;
            }

            const img = new Image();
            const imageUrl = URL.createObjectURL(file);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            let { width, height } = calculateDimensions(img, maxWidth, maxHeight);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', quality);
            });

            URL.revokeObjectURL(imageUrl);

            const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });

            if (compressedFile.size > 5 * 1024 * 1024) {
                toast({
                    title: "Error",
                    description: "File size too large even after compression",
                    variant: "destructive"
                });
                return null;
            }

            return compressedFile;
        } catch (error) {
            console.error('Image compression error:', error);
            toast({
                title: "Error",
                description: "Failed to process image",
                variant: "destructive"
            });
            return null;
        } finally {
            isProcessing.value = false;
        }
    };

    const validateImage = (file) => {
        if (!file) return false;

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "Error",
                description: "File size must be less than 5MB",
                variant: "destructive"
            });
            return false;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: "Error",
                description: "Only JPG, PNG and GIF files are allowed",
                variant: "destructive"
            });
            return false;
        }

        return true;
    };

    const calculateDimensions = (img, maxWidth, maxHeight) => {
        let width = img.width;
        let height = img.height;

        if (width < 100 || height < 100) {
            toast({
                title: "Error",
                description: "Image dimensions must be at least 100x100 pixels",
                variant: "destructive"
            });
            throw new Error("Image too small");
        }

        if (width > maxWidth) {
            height = Math.round((maxWidth * height) / width);
            width = maxWidth;
        }

        if (height > maxHeight) {
            width = Math.round((maxHeight * width) / height);
            height = maxHeight;
        }

        return { width, height };
    };

    return {
        isProcessing,
        compressImage,
        validateImage
    };
}
