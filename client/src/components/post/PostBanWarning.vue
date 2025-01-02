<template>
    <Alert variant="destructive" class="mt-4">
        <AlertCircleIcon class="h-4 w-4" />
        <AlertTitle>Account Restricted</AlertTitle>
        <AlertDescription>
            {{ warningMessage }}
            <p v-if="showAppealLink" class="mt-2">
                <Button variant="link" class="p-0 h-auto underline hover:no-underline" @click="handleAppeal">
                    Appeal this restriction
                </Button>
            </p>
        </AlertDescription>
    </Alert>
</template>

<script setup>
import { computed } from 'vue'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon } from 'lucide-vue-next'
import { useToast } from '@/components/ui/toast'

const props = defineProps({
    banStatus: {
        type: String,
        required: true,
        validator(value) {
            return ['0', '1', '2'].includes(value) || value.includes(',')
        }
    }
})

const { toast } = useToast()

// Computed
const warningMessage = computed(() => {
    switch (props.banStatus) {
        case '1':
            return 'Your account has been banned due to violations of our community guidelines.'
        case '2':
            return 'You have been blocked from interacting with this content.'
        default:
            return props.banStatus.includes(',')
                ? 'Your account has partial restrictions in place.'
                : 'Your account is under review.'
    }
})

const showAppealLink = computed(() => {
    return ['1', '2'].includes(props.banStatus)
})

// Methods
const handleAppeal = () => {
    // This would typically open an appeal form or redirect to appeal page
    toast({
        description: "Appeal system coming soon. Please contact support.",
    })
}
</script>