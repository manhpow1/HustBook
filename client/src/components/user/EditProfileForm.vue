<template>
    <Card>
        <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <div class="space-y-2">
                    <Label for="userName">Username</Label>
                    <Input id="userName" v-model="form.userName" :disabled="isLoading" placeholder="Enter your username"
                        :error="errors.userName" />
                    <p v-if="errors.userName" class="text-sm text-destructive">{{ errors.userName }}</p>
                </div>

                <div class="space-y-2">
                    <Label for="description">Bio</Label>
                    <Textarea id="description" v-model="form.description" :disabled="isLoading"
                        placeholder="Tell us about yourself" :error="errors.description" />
                    <p v-if="errors.description" class="text-sm text-destructive">{{ errors.description }}</p>
                </div>

                <div class="space-y-2">
                    <Label for="address">Address</Label>
                    <Input id="address" v-model="form.address" :disabled="isLoading" placeholder="Enter your address"
                        :error="errors.address" />
                    <p v-if="errors.address" class="text-sm text-destructive">{{ errors.address }}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="city">City</Label>
                        <Input id="city" v-model="form.city" :disabled="isLoading" placeholder="Enter your city"
                            :error="errors.city" />
                        <p v-if="errors.city" class="text-sm text-destructive">{{ errors.city }}</p>
                    </div>

                    <div class="space-y-2">
                        <Label for="country">Country</Label>
                        <Input id="country" v-model="form.country" :disabled="isLoading"
                            placeholder="Enter your country" :error="errors.country" />
                        <p v-if="errors.country" class="text-sm text-destructive">{{ errors.country }}</p>
                    </div>
                </div>

                <Alert v-if="error" variant="destructive" class="mt-4">
                    <AlertCircle class="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>

                <div class="flex justify-end space-x-4 mt-6">
                    <Button type="button" variant="outline" :disabled="isLoading" @click="resetForm">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="isLoading || !isFormValid">
                        <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isLoading ? 'Saving...' : 'Save Changes' }}
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useToast } from '@/components/ui/toast'
import { AlertCircle, Loader2Icon } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'vue-router'
import logger from '@/services/logging'

// Initialize stores and composables
const userStore = useUserStore()
const { toast } = useToast()
const router = useRouter()

// Form state
const form = ref({
    userName: '',
    description: '',
    address: '',
    city: '',
    country: '',
    link: '',
    cover_image: ''
})

const initialForm = { ...form.value }
const errors = ref({})
const isLoading = ref(false)
const error = ref(null)

// Validation rules
const validators = {
    userName: (value) => {
        if (!value?.trim()) return 'Username is required'
        if (value.length < 3) return 'Username must be at least 3 characters'
        if (value.length > 30) return 'Username must be less than 30 characters'
        return null
    },
    link: (value) => {
        if (!value) return null
        try {
            new URL(value)
            return null
        } catch {
            return 'Please enter a valid URL'
        }
    }
}

// Validate form fields
const validateField = (field, value) => {
    if (validators[field]) {
        const error = validators[field](value)
        errors.value[field] = error
        if (error) {
            toast({
                type: 'warning',
                title: 'Validation Error',
                description: `${field}: ${error}`
            })
        }
    }
}

// Watch for form changes and validate
watch(form, (newValues) => {
    Object.keys(newValues).forEach(field => {
        validateField(field, newValues[field])
    })
}, { deep: true })

// Computed values
const isFormValid = computed(() => {
    return !Object.values(errors.value).some(error => error) &&
        form.value.userName?.trim().length >= 3
})

// Methods
const resetForm = () => {
    form.value = { ...initialForm }
    errors.value = {}
    error.value = null
}

const handleSubmit = async () => {
    try {
        isLoading.value = true
        error.value = null

        logger.debug('Submitting profile update', { formData: form.value })

        const success = await userStore.updateUserProfile(form.value)

        if (success) {
            toast({
                type: 'success',
                title: 'Profile Updated',
                description: 'Your profile has been updated successfully'
            })
            logger.info('Profile updated successfully')
        } else {
            throw new Error('Failed to update profile')
        }
    } catch (err) {
        const errorMessage = err.message || 'An error occurred while updating your profile'
        error.value = errorMessage
        logger.error('Profile update failed', { error: err })
        toast({
            type: 'error',
            title: 'Update Failed',
            description: errorMessage
        })
    } finally {
        isLoading.value = false
    }
}

// Load initial data
const loadUserData = async () => {
    try {
        isLoading.value = true
        const userData = await userStore.getUserProfile()
        if (userData) {
            form.value = {
                userName: userData.userName || '',
                description: userData.description || '',
                address: userData.address || '',
                city: userData.city || '',
                country: userData.country || '',
                link: userData.link || '',
                cover_image: userData.cover_image || ''
            }
            let initialForm = { ...form.value }
            toast({
                type: 'success',
                title: 'Profile Loaded',
                description: 'Your profile data has been loaded successfully'
            })
        }
    } catch (err) {
        const errorMessage = 'Failed to load user data'
        logger.error(errorMessage, { error: err })
        error.value = errorMessage
        toast({
            type: 'error',
            title: 'Load Failed',
            description: errorMessage
        })
    } finally {
        isLoading.value = false
    }
}

// Lifecycle hooks
onMounted(async () => {
    await loadUserData()
})

// Handle unsaved changes
onBeforeRouteLeave((to, from, next) => {
    const hasChanges = JSON.stringify(form.value) !== JSON.stringify(initialForm)

    if (hasChanges && !isLoading.value) {
        const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
        next(confirmed)
    } else {
        next()
    }
})
</script>
