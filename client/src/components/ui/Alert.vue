<template>
    <div :class="[
        'alert',
        variant === 'success' ? 'bg-green-100 border-green-500' : '',
        variant === 'destructive' ? 'bg-red-100 border-red-500' : '',
        variant === 'info' ? 'bg-blue-100 border-blue-500' : '',
    ]" role="alert">
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <slot name="icon" />
                <div class="ml-2">
                    <slot name="title" />
                    <slot name="description" />
                </div>
            </div>
            <button v-if="dismissible" type="button" class="text-gray-500 hover:text-gray-700" @click="dismiss">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        variant: {
            type: String,
            default: 'info',
        },
        dismissible: {
            type: Boolean,
            default: false,
        },
        methods: {
            dismiss() {
                this.$emit('dismiss');
            },
        },
    }
}
</script>