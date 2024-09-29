import { ref, computed } from 'vue'

export function useRateLimiter(maxAttempts, timeWindow) {
    const attempts = ref(0)
    const windowStart = ref(Date.now())

    const checkAndUpdateWindow = () => {
        const now = Date.now()
        if (now - windowStart.value > timeWindow) {
            attempts.value = 0
            windowStart.value = now
        }
    }

    const isRateLimited = computed(() => {
        checkAndUpdateWindow()
        return attempts.value >= maxAttempts
    })

    const rateLimitRemaining = computed(() => {
        checkAndUpdateWindow()
        if (!isRateLimited.value) return 0
        const remainingTime = Math.ceil((windowStart.value + timeWindow - Date.now()) / 1000)
        return Math.max(0, remainingTime)
    })

    const incrementAttempts = () => {
        checkAndUpdateWindow()
        attempts.value++
    }

    const reset = () => {
        attempts.value = 0
        windowStart.value = Date.now()
    }

    return {
        isRateLimited,
        rateLimitRemaining,
        incrementAttempts,
        reset
    }
}