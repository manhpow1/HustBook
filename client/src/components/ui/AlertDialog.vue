<template>
    <div :class="[
        'alert-dialog',
        'fixed top-0 left-0 w-full h-full flex items-center justify-center',
        'bg-black bg-opacity-50',
    ]">
        <div :class="[
            'alert-dialog-content',
            'max-w-lg w-full p-6 bg-white rounded-md shadow-md',
        ]">
            <slot name="header" />
            <slot name="body" />
            <slot name="footer" />
        </div>
    </div>
</template>

<script>
export default {
    components: {
        AlertDialogAction,
        AlertDialogCancel,
        AlertDialogContent,
        AlertDialogDescription,
        AlertDialogFooter,
        AlertDialogHeader,
        AlertDialogTitle,
    },
};
</script>