import { ref } from 'vue';
import { useToast } from '@/components/ui/toast';

export function useImageProcessing() {
    const toast = useToast();
    const isProcessing = ref(false);

    const compressImage = async (file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
        try {
            isProcessing.value = true;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast('Only image files are allowed', 'error');
                return null;
            }

            // Create image object
            const img = new Image();
            const imageUrl = URL.createObjectURL(file);
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            // Check minimum dimensions
            if (img.width < 100 || img.height < 100) {
                toast('Image dimensions too small. Minimum size is 100x100 pixels', 'error');
                return null;
            }

            // Calculate new dimensions while maintaining aspect ratio
            let newWidth = img.width;
            let newHeight = img.height;

            if (newWidth > maxWidth) {
                newHeight = Math.round((maxWidth * newHeight) / newWidth);
                newWidth = maxWidth;
            }

            if (newHeight > maxHeight) {
                newWidth = Math.round((maxHeight * newWidth) / newHeight);
                newHeight = maxHeight;
            }

            // Create canvas and compress image
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Convert to blob
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/jpeg', quality);
            });

            // Clean up
            URL.revokeObjectURL(imageUrl);

            // Create new file with compressed data
            const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });

            // Verify final file size
            if (compressedFile.size > 4 * 1024 * 1024) { // 4MB limit
                toast('Image file size is too large even after compression', 'error');
                return null;
            }

            return compressedFile;
        } catch (error) {
            console.error('Image compression error:', error);
            toast('Error processing image', 'error');
            return null;
        } finally {
            isProcessing.value = false;
        }
    };

    const validateImage = (file) => {
        // Validate file size (4MB)
        if (file.size > 4 * 1024 * 1024) {
            toast('File size too large. Maximum size is 4MB', 'error');
            return false;
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            toast('Invalid file type. Only JPG, PNG and GIF are allowed', 'error');
            return false;
        }

        return true;
    };

    return {
        isProcessing,
        compressImage,
        validateImage
    };
}
