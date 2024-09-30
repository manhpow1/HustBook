<template>
    <div v-if="banStatus !== '0'" class="mt-4 p-4 bg-red-100 rounded-lg">
        <p class="text-red-700 flex items-center">
            <AlertTriangleIcon class="w-5 h-5 mr-2" />
            {{ getBanReason(banStatus) }}
        </p>
    </div>
</template>

<script setup>
import { AlertTriangleIcon } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps({
    banStatus: {
        type: String,
        required: true
    }
})

const { t } = useI18n()

const getBanReason = (banStatus) => {
    if (banStatus === '1') return t('banReasonViolation')
    if (banStatus === '2') return t('banReasonBlocked')
    if (banStatus.includes(',')) return t('banReasonPartialBlock')
    return t('banReasonFlagged')
}
</script>