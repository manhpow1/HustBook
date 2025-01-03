<template>
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Blocked Users</CardTitle>
                <CardDescription>Manage your blocked users list</CardDescription>
            </CardHeader>
            <CardContent>
                <div v-if="loading" class="space-y-4">
                    <Skeleton v-for="i in 3" :key="i" class="h-20 w-full" />
                </div>

                <Alert v-else-if="error" variant="destructive">
                    <AlertCircleIcon class="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>

                <Alert v-else-if="blockedUsers.length === 0">
                    <AlertTitle>No blocked users</AlertTitle>
                    <AlertDescription>
                        Your blocked users list is empty
                    </AlertDescription>
                </Alert>

                <ScrollArea v-else className="h-[400px] rounded-md border p-4">
                    <div class="space-y-4">
                        <Card v-for="user in blockedUsers" :key="user.userId">
                            <CardContent class="p-4">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-4">
                                        <Avatar>
                                            <AvatarImage :src="user.avatar || defaultAvatar" :alt="user.userName" />
                                            <AvatarFallback>{{ getInitials(user.userName) }}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 class="font-semibold">{{ user.userName }}</h3>
                                            <p class="text-sm text-muted-foreground">Blocked since {{
                                                formatDate(user.blockedAt) }}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" :disabled="processingIds.has(user.userId)"
                                        @click="confirmUnblock(user.userId)">
                                        <Loader2Icon v-if="processingIds.has(user.userIdd)"
                                            class="mr-2 h-4 w-4 animate-spin" />
                                        {{ processingIds.has(user.userId) ? 'Processing...' : 'Unblock' }}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>

                <div v-if="hasMore && !loading" class="mt-4 text-center">
                    <Button variant="outline" @click="loadMore" :disabled="isLoadingMore">
                        {{ isLoadingMore ? 'Loading...' : 'Load more' }}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <AlertDialog :open="!!userIdToUnblock" @update:open="userIdToUnblock = null">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Unblock User</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to unblock this user? They will be able to contact you again.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="userIdToUnblock = null">Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="unblockConfirmed">
                        <Loader2Icon v-if="isProcessing" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isProcessing ? 'Processing...' : 'Unblock' }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useFriendStore } from '@/stores/friendStore';
import { useToast } from '@/components/ui/toast';
import defaultAvatar from '@/assets/avatar-default.svg';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircleIcon, Loader2Icon } from 'lucide-vue-next';

const friendStore = useFriendStore();
const { toast } = useToast();

const loading = ref(true);
const error = ref(null);
const isLoadingMore = ref(false);
const isProcessing = ref(false);
const processingIds = ref(new Set());
const userIdToUnblock = ref(null);

const blockedUsers = computed(() => friendStore.blockedUsers);
const hasMore = computed(() => friendStore.hasMoreBlockedUsers);

const loadBlockedUsers = async () => {
    try {
        loading.value = true;
        error.value = null;
        await friendStore.getListBlocks();
    } catch (err) {
        error.value = 'Unable to load blocked users list';
    } finally {
        loading.value = false;
    }
};

const loadMore = async () => {
    if (isLoadingMore.value) return;
    isLoadingMore.value = true;
    try {
        await friendStore.getListBlocks();
    } catch (err) {
        toast({
            title: "Error",
            description: "Unable to load more data",
            variant: "destructive",
        });
    } finally {
        isLoadingMore.value = false;
    }
};

const confirmUnblock = (userId) => {
    userIdToUnblock.value = userId;
};

const unblockConfirmed = async () => {
    if (!userIdToUnblock.value) return;
    isProcessing.value = true;
    processingIds.value.add(userIdToUnblock.value);
    try {
        await friendStore.setBlock(userIdToUnblock.value, 1);
        toast({
            title: "Success",
            description: "User has been unblocked",
        });
    } catch (err) {
        toast({
            title: "Error",
            description: "Unable to unblock user",
            variant: "destructive",
        });
    } finally {
        isProcessing.value = false;
        processingIds.value.delete(userIdToUnblock.value);
        userIdToUnblock.value = null;
    }
};

const getInitials = (name) => {
    return name
        ?.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '??';
};

const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('vi-VN');
};

onMounted(loadBlockedUsers);
</script>