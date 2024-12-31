<template>
    <div class="container space-y-6">
        <Tabs defaultValue="account" class="w-full">
            <TabsList class="grid w-full grid-cols-4">
                <TabsTrigger value="account">
                    <UserIcon class="mr-2 h-4 w-4" />
                    Account
                </TabsTrigger>
                <TabsTrigger value="privacy">
                    <ShieldIcon class="mr-2 h-4 w-4" />
                    Privacy
                </TabsTrigger>
                <TabsTrigger value="notifications">
                    <BellIcon class="mr-2 h-4 w-4" />
                    Notifications
                </TabsTrigger>
                <TabsTrigger value="help">
                    <HelpCircleIcon class="mr-2 h-4 w-4" />
                    Help
                </TabsTrigger>
            </TabsList>

            <TabsContent value="account" class="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                        <CardDescription>
                            Manage your account preferences and personal information
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AccountSettings />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="privacy" class="space-y-4">
                <PrivacySettings />
            </TabsContent>

            <TabsContent value="notifications" class="space-y-4">
                <NotificationSettings />
            </TabsContent>
        </Tabs>

        <Dialog v-model:open="showLogoutDialog">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Out</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to log out of your account?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" @click="showLogoutDialog = false">
                        Cancel
                    </Button>
                    <Button variant="destructive" @click="handleLogout" :disabled="isLoggingOut">
                        <Loader2Icon v-if="isLoggingOut" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isLoggingOut ? 'Logging out...' : 'Log Out' }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog v-model:open="showExitDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Exit Settings</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to exit? Any unsaved changes will be lost.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="handleExit">Exit</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { useToast } from '@/components/ui/toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/components/ui/link';
import AccountSettings from './AccountSettings.vue';
import PrivacySettings from './PrivacySettings.vue';
import NotificationSettings from './NotificationSettings.vue';
import { UserIcon, ShieldIcon, BellIcon, HelpCircleIcon, MailIcon, Loader2Icon, } from 'lucide-vue-next';

const router = useRouter();
const userStore = useUserStore();
const { toast } = useToast();

const showLogoutDialog = ref(false);
const showExitDialog = ref(false);
const isLoggingOut = ref(false);

const handleLogout = async () => {
    isLoggingOut.value = true;
    try {
        await userStore.logout();
        toast({
            title: 'Success',
            description: 'You have been logged out successfully',
        });
        router.push('/login');
    } catch (error) {
        toast({
            title: 'Error',
            description: 'Failed to log out. Please try again.',
            variant: 'destructive',
        });
    } finally {
        isLoggingOut.value = false;
        showLogoutDialog.value = false;
    }
};

const handleExit = () => {
    showExitDialog.value = false;
    router.push('/');
};

const contactSupport = () => {
    window.location.href = 'mailto:support@example.com';
};
</script>