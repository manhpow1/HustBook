<template>
    <div v-if="password" class="mt-2 space-y-2">
        <!-- Strength Indicator -->
        <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-700">
                Password Strength:
                <span :class="strengthTextColor">{{ strengthText }}</span>
            </label>
            <span class="text-xs text-gray-500">{{ strengthScore }}/100</span>
        </div>

        <!-- Progress Bar -->
        <div class="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
                class="h-full transition-all duration-300 ease-out rounded-full"
                :class="strengthColor"
                :style="{ width: `${strengthScore}%` }"
                role="progressbar"
                :aria-valuenow="strengthScore"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`Password strength: ${strengthText}`"
            ></div>
        </div>

        <!-- Requirements List -->
        <ul class="space-y-1 text-sm" aria-label="Password requirements">
            <li v-for="(check, index) in checks" :key="index"
                class="flex items-center space-x-2"
                :class="check.passed ? 'text-green-600' : 'text-gray-500'"
            >
                <CheckCircleIcon v-if="check.passed" 
                    class="h-4 w-4 text-green-500" 
                    aria-hidden="true" 
                />
                <XCircleIcon v-else 
                    class="h-4 w-4 text-gray-400" 
                    aria-hidden="true" 
                />
                <span>{{ check.text }}</span>
            </li>
        </ul>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { CheckCircleIcon, XCircleIcon } from 'lucide-vue-next';
import { AUTH_CONFIG } from '../hooks';

const props = defineProps({
    password: {
        type: String,
        required: true
    }
});

// Password requirement checks
const checks = computed(() => [
    {
        text: `At least ${AUTH_CONFIG.PASSWORD_MIN_LENGTH} characters long`,
        passed: props.password.length >= AUTH_CONFIG.PASSWORD_MIN_LENGTH
    },
    {
        text: 'Contains uppercase letter',
        passed: /[A-Z]/.test(props.password)
    },
    {
        text: 'Contains lowercase letter',
        passed: /[a-z]/.test(props.password)
    },
    {
        text: 'Contains number',
        passed: /\d/.test(props.password)
    },
    {
        text: 'Contains only letters and numbers',
        passed: /^[a-zA-Z0-9]+$/.test(props.password)
    }
]);

// Calculate strength score (0-100)
const strengthScore = computed(() => {
    if (!props.password) return 0;
    
    let score = 0;
    
    // Length score (max 25)
    const lengthScore = Math.min(25, (props.password.length / AUTH_CONFIG.PASSWORD_MAX_LENGTH) * 25);
    score += lengthScore;

    // Character type scores (15 points each)
    if (/[A-Z]/.test(props.password)) score += 15;
    if (/[a-z]/.test(props.password)) score += 15;
    if (/\d/.test(props.password)) score += 15;
    
    // Complexity bonus (max 30)
    const uniqueChars = new Set(props.password).size;
    const complexityScore = Math.min(30, (uniqueChars / props.password.length) * 30);
    score += complexityScore;

    return Math.round(score);
});

// Strength text and colors based on score
const strengthText = computed(() => {
    const score = strengthScore.value;
    if (score < 25) return 'Very Weak';
    if (score < 50) return 'Weak';
    if (score < 75) return 'Moderate';
    if (score < 90) return 'Strong';
    return 'Very Strong';
});

const strengthColor = computed(() => {
    const score = strengthScore.value;
    if (score < 25) return 'bg-red-500';
    if (score < 50) return 'bg-orange-500';
    if (score < 75) return 'bg-yellow-500';
    if (score < 90) return 'bg-blue-500';
    return 'bg-green-500';
});

const strengthTextColor = computed(() => {
    const score = strengthScore.value;
    if (score < 25) return 'text-red-600';
    if (score < 50) return 'text-orange-600';
    if (score < 75) return 'text-yellow-600';
    if (score < 90) return 'text-blue-600';
    return 'text-green-600';
});
</script>

<style scoped>
.transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Fade transition for list items */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Check mark animations */
@keyframes check {
    0% {
        transform: scale(0.5);
        opacity: 0;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.text-green-600 svg {
    animation: check 0.2s ease-out forwards;
}
</style>
