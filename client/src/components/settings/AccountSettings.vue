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
                <Tabs defaultValue="profile" class="w-full">
                    <TabsList class="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <EditProfileForm @profile-updated="handleProfileUpdate" />
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
import { useUserStore } from '@/stores/userStore'
import { AlertCircle, Loader2Icon } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import EditProfileForm from '@/components/user/EditProfileForm.vue'
import logger from '@/services/logging'

const userStore = useUserStore()
const { toast } = useToast()

// State
const isLoading = ref(false)
const passwordError = ref(null)
const passwordChange = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
const updatePassword = async () => {
    if (!isPasswordValid.value) return

    isLoading.value = true
    passwordError.value = null

    try {
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
            passwordChange.value = {
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }
        } else {
            throw new Error('Failed to update password')
        }
    } catch (error) {
        passwordError.value = error.message || 'Failed to update password'
        logger.error('Password update failed', { error })
        toast({
            title: 'Error',
            description: passwordError.value,
            variant: 'destructive'
        })
    } finally {
        isLoading.value = false
    }
}

const handleProfileUpdate = () => {
    toast({
        title: 'Success',
        description: 'Profile updated successfully'
    })
}
</script>