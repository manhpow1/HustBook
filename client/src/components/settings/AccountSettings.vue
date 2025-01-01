<template>
    <div class="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                    Manage your account settings and preferences
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="personal" class="w-full">
                    <TabsList class="grid w-full grid-cols-3">
                        <TabsTrigger value="personal">Personal Info</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal">
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>
                                    Update your personal details
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form @submit.prevent="updatePersonalInfo" class="space-y-4">
                                    <div class="grid grid-cols-2 gap-4">
                                        <div class="space-y-2">
                                            <Label for="firstName">First Name</Label>
                                            <Input id="firstName" v-model="personalInfo.firstName" :disabled="isLoading"
                                                placeholder="Enter first name" />
                                        </div>
                                        <div class="space-y-2">
                                            <Label for="lastName">Last Name</Label>
                                            <Input id="lastName" v-model="personalInfo.lastName" :disabled="isLoading"
                                                placeholder="Enter last name" />
                                        </div>
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="email">Email</Label>
                                        <Input id="email" v-model="personalInfo.email" type="email"
                                            :disabled="isLoading" placeholder="Enter email address" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="phone">Phone Number</Label>
                                        <Input id="phone" v-model="personalInfo.phone" type="tel" :disabled="isLoading"
                                            placeholder="Enter phone number" />
                                    </div>

                                    <Alert v-if="personalInfoError" variant="destructive">
                                        <AlertCircle class="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{{ personalInfoError }}</AlertDescription>
                                    </Alert>

                                    <Button type="submit" :disabled="isLoading">
                                        <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                                        {{ isLoading ? 'Saving...' : 'Save Changes' }}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle>Security Settings</CardTitle>
                                <CardDescription>
                                    Manage your password and security preferences
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form @submit.prevent="updatePassword" class="space-y-4">
                                    <div class="space-y-2">
                                        <Label for="currentPassword">Current Password</Label>
                                        <Input id="currentPassword" v-model="passwordChange.currentPassword"
                                            type="password" :disabled="isLoading"
                                            placeholder="Enter current password" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="newPassword">New Password</Label>
                                        <Input id="newPassword" v-model="passwordChange.newPassword" type="password"
                                            :disabled="isLoading" placeholder="Enter new password" />
                                    </div>

                                    <div class="space-y-2">
                                        <Label for="confirmPassword">Confirm Password</Label>
                                        <Input id="confirmPassword" v-model="passwordChange.confirmPassword"
                                            type="password" :disabled="isLoading" placeholder="Confirm new password" />
                                    </div>

                                    <Alert v-if="passwordError" variant="destructive">
                                        <AlertCircle class="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{{ passwordError }}</AlertDescription>
                                    </Alert>

                                    <Button type="submit" :disabled="isLoading || !isPasswordValid">
                                        <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                                        {{ isLoading ? 'Updating...' : 'Update Password' }}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from '@/components/ui/toast'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'
import { AlertCircle, Loader2Icon } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import logger from '@/services/logging'

// Initialize stores and composables
const settingsStore = useSettingsStore()
const userStore = useUserStore()
const { toast } = useToast()

// State
const isLoading = ref(false)
const personalInfoError = ref(null)
const passwordError = ref(null)

const personalInfo = ref({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
})

const passwordChange = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
})

const preferences = ref({
    emailNotifications: false,
    twoFactorEnabled: false
})

// Computed
const isPasswordValid = computed(() => {
    return (
        passwordChange.value.newPassword &&
        passwordChange.value.confirmPassword &&
        passwordChange.value.newPassword === passwordChange.value.confirmPassword &&
        passwordChange.value.newPassword.length >= 8
    )
})

// Methods
const updatePersonalInfo = async () => {
    try {
        isLoading.value = true
        personalInfoError.value = null

        logger.debug('Updating personal information', { data: personalInfo.value })

        const success = await userStore.updateUserProfile({
            firstName: personalInfo.value.firstName,
            lastName: personalInfo.value.lastName,
            email: personalInfo.value.email,
            phone: personalInfo.value.phone
        })

        if (success) {
            toast({
                title: 'Success',
                description: 'Personal information updated successfully'
            })
            logger.info('Personal information updated successfully')
        } else {
            throw new Error('Failed to update personal information')
        }
    } catch (err) {
        personalInfoError.value = err.message || 'An error occurred while updating'
        logger.error('Personal information update failed', { error: err })
        toast({
            title: 'Error',
            description: personalInfoError.value,
            variant: 'destructive'
        })
    } finally {
        isLoading.value = false
    }
}

const updatePassword = async () => {
    try {
        if (!isPasswordValid.value) {
            throw new Error('Please check your password inputs')
        }

        isLoading.value = true
        passwordError.value = null

        logger.debug('Updating password')

        const success = await userStore.changePassword(
            passwordChange.value.currentPassword,
            passwordChange.value.newPassword
        )

        if (success) {
            toast({
                title: 'Success',
                description: 'Password updated successfully'
            })
            logger.info('Password updated successfully')

            // Reset password fields
            passwordChange.value = {
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }
        } else {
            throw new Error('Failed to update password')
        }
    } catch (err) {
        passwordError.value = err.message || 'An error occurred while updating password'
        logger.error('Password update failed', { error: err })
        toast({
            title: 'Error',
            description: passwordError.value,
            variant: 'destructive'
        })
    } finally {
        isLoading.value = false
    }
}

// Load initial data
const loadUserData = async () => {
    try {
        const userData = await userStore.fetchUserProfile()
        if (userData) {
            personalInfo.value = {
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                email: userData.email || '',
                phone: userData.phone || ''
            }
        }
    } catch (err) {
        logger.error('Failed to load user data', { error: err })
        toast({
            title: 'Error',
            description: 'Failed to load user data',
            variant: 'destructive'
        })
    }
}

// Lifecycle hooks
onMounted(async () => {
    await loadUserData()
})
</script>