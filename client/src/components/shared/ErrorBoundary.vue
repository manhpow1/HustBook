<template>
    <div>
        <slot v-if="!error"></slot>
        <Alert v-else variant="destructive" role="alert" aria-live="assertive">
            <AlertCircleIcon class="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription class="mt-2">
                <div class="space-y-2">
                    <p class="text-sm">{{ error.message }}</p>

                    <Collapsible>
                        <CollapsibleTrigger
                            class="flex items-center text-sm text-destructive-foreground/70 hover:text-destructive-foreground">
                            <ChevronRight class="h-4 w-4 transition-transform ui-expanded:rotate-90" />
                            <span>Show error details</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <ScrollArea class="h-[200px] w-full rounded-md border p-4 mt-2">
                                <pre class="text-xs font-mono whitespace-pre-wrap">{{ formattedError }}</pre>
                            </ScrollArea>
                        </CollapsibleContent>
                    </Collapsible>

                    <div class="flex items-center justify-between mt-4">
                        <Button variant="outline" @click="resetError">
                            <RefreshCcwIcon class="mr-2 h-4 w-4" />
                            Try again
                        </Button>
                        <p class="text-xs text-destructive-foreground/70">
                            Error in component: {{ componentName }}
                        </p>
                    </div>
                </div>
            </AlertDescription>
        </Alert>

        <div v-if="loading" class="flex items-center justify-center p-8" role="status">
            <Loader2Icon class="h-8 w-8 animate-spin text-primary" />
            <span class="sr-only">Loading...</span>
        </div>
    </div>
</template>

<script setup>
import { ref, onErrorCaptured, provide, computed } from 'vue';
import { AlertCircleIcon, ChevronRight, RefreshCcwIcon, Loader2Icon } from 'lucide-vue-next';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useErrorHandler } from '@/utils/errorHandler';
import logger from '@/services/logging';

const props = defineProps({
    componentName: {
        type: String,
        required: true
    }
});

const error = ref(null);
const loading = ref(false);
const { handleError } = useErrorHandler();

// Format error for display
const formattedError = computed(() => {
    if (!error.value) return '';

    const errorDetails = {
        message: error.value.message,
        stack: error.value.stack,
        componentName: props.componentName,
        timestamp: new Date().toISOString(),
    };

    return JSON.stringify(errorDetails, null, 2);
});

// Reset error state and retry
const resetError = async () => {
    try {
        loading.value = true;
        error.value = null;
        // Emit event for parent to handle retry if needed
        emit('retry');
    } catch (err) {
        captureError(err);
    } finally {
        loading.value = false;
    }
};

// Error capture handler
const captureError = (err) => {
    error.value = err;
    logger.error(`Error in ${props.componentName}:`, err);
    handleError(err);
    return false; // Prevent error from propagating
};

// Provide error handler to child components
provide('handleError', handleError);

// Capture errors in child components
onErrorCaptured(captureError);

// Emit events
const emit = defineEmits(['retry']);
</script>