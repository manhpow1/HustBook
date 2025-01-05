<template>
    <Card>
        <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <!-- Avatar Upload -->
                <div class="space-y-2">
                    <Label>Profile Picture</Label>
                    <div class="flex items-center gap-4">
                        <img v-if="form.avatar" :src="URL.createObjectURL(form.avatar)" class="w-16 h-16 rounded-full object-cover" />
                        <img v-else-if="form.cover_image" :src="form.cover_image" class="w-16 h-16 rounded-full object-cover" />
                        <div v-else class="w-16 h-16 rounded-full bg-gray-200"></div>
                        <div class="flex-1">
                            <Input 
                                type="file"
                                accept="image/*"
                                @change="handleAvatarUpload"
                                :disabled="isLoading"
                                class="w-full"
                            />
                            <p class="text-xs text-muted-foreground mt-1">Recommended size: 400x400px</p>
                        </div>
                    </div>
                </div>

                <!-- Cover Photo Upload -->
                <div class="space-y-2">
                    <Label>Cover Photo</Label>
                    <div class="relative">
                        <img v-if="form.coverPhoto" :src="URL.createObjectURL(form.coverPhoto)" class="w-full h-48 object-cover rounded-lg" />
                        <img v-else-if="form.cover_image" :src="form.cover_image" class="w-full h-48 object-cover rounded-lg" />
                        <div v-else class="w-full h-48 bg-gray-200 rounded-lg"></div>
                        <Input 
                            type="file"
                            accept="image/*"
                            @change="handleCoverUpload"
                            :disabled="isLoading"
                            class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                        <p class="text-xs text-muted-foreground mt-1">Recommended size: 1500x500px</p>
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="userName">Username</Label>
                    <Input id="userName" v-model="form.userName" :disabled="isLoading" placeholder="Enter your username"
                        :error="errors.userName" />
                    <p v-if="errors.userName" class="text-sm text-destructive">{{ errors.userName }}</p>
                </div>

                <div class="space-y-2">
                    <Label for="bio">Bio</Label>
                    <Textarea id="bio" v-model="form.bio" :disabled="isLoading"
                        placeholder="Tell us about yourself" :error="errors.bio" />
                    <p v-if="errors.bio" class="text-sm text-destructive">{{ errors.bio }}</p>
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
import { storeToRefs } from 'pinia'
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
    bio: '',
    address: '',
    city: '', 
    country: '',
    coverPhoto: null,
    avatar: null
})

const initialForm = JSON.parse(JSON.stringify(form.value))
const errors = ref({})
const isLoading = ref(false)
const error = ref(null)

// Validation rules
const validators = {
    userName: (value) => {
        if (!value?.trim()) return 'Username is required'
        if (value.length < 2) return 'Username must be at least 2 characters'
        if (value.length > 50) return 'Username must be less than 50 characters'
        if (!/^[a-zA-Z\s]*$/.test(value)) return 'Username can only contain letters and spaces'
        return null
    },
    bio: (value) => {
        if (value?.length > 200) return 'Bio cannot exceed 200 characters'
        return null
    },
    address: (value) => {
        if (value?.length > 100) return 'Address cannot exceed 100 characters'
        return null
    },
    city: (value) => {
        if (value?.length > 50) return 'City cannot exceed 50 characters'
        return null
    },
    country: (value) => {
        if (value?.length > 50) return 'Country cannot exceed 50 characters'
        return null
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
const handleAvatarUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({
                type: 'warning',
                title: 'File too large',
                description: 'Profile picture must be less than 5MB'
            })
            return
        }
        form.value.avatar = file
    }
}

const handleCoverUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
        // Validate file type
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast({
                type: 'warning',
                title: 'Invalid file type',
                description: 'Only JPG, PNG and WEBP images are allowed'
            })
            return
        }
        
        // Validate file size
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({
                type: 'warning',
                title: 'File too large',
                description: 'Cover photo must be less than 5MB'
            })
            return
        }
        
        form.value.coverPhoto = file
    }
}

const resetForm = () => {
    form.value = { ...initialForm }
    errors.value = {}
    error.value = null
}

const handleSubmit = async () => {
    try {
        isLoading.value = true
        error.value = null

        const formData = new FormData()
        Object.entries(form.value).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                if (key === 'avatar' || key === 'coverPhoto') {
                    if (value instanceof File) {
                        formData.append(key, value)
                    }
                } else {
                    formData.append(key, value)
                }
            }
        })

        logger.debug('Submitting profile update', { formData: Object.fromEntries(formData) })

        const success = await userStore.updateUserProfile(formData)

        if (success) {
            toast({
                type: 'success',
                title: 'Profile Updated',
                description: 'Your profile has been updated successfully'
            })
            logger.info('Profile updated successfully')
            // Update version after successful update
            form.value.version = success.version
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
    bio: userData.bio || '',
    address: userData.address || '',
    city: userData.city || '',
    country: userData.country || '',
    avatar: null,
    coverPhoto: null
}
            initialForm = { ...form.value }
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
