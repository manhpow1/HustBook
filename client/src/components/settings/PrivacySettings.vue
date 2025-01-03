<template>
    <Card>
        <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
                Manage your blocked users and privacy
            </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
            <div>
                <h3 class="text-lg font-medium mb-4">Block New Users</h3>
                <div class="relative flex-1">
                    <Input v-model="searchQuery" placeholder="Search users to block" :disabled="loading" class="w-full">
                    <template #prefix>
                        <SearchIcon class="w-4 h-4 text-muted-foreground" />
                    </template>
                    </Input>
                </div>
                <div v-if="searchResults.length > 0" class="mt-4">
                    <h4 class="text-sm font-medium mb-2">Search Results</h4>
                    <div class="space-y-2">
                        <Card v-for="user in searchResults" :key="user.id">
                            <CardContent class="p-3 flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <Avatar>
                                        <AvatarImage :src="user.avatar || defaultAvatar" :alt="user.name" />
                                        <AvatarFallback>{{ getInitials(user.name) }}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p class="font-medium">{{ user.name }}</p>
                                        <p class="text-sm text-muted-foreground">{{ user.email }}</p>
                                    </div>
                                </div>
                                <Button variant="destructive" size="sm" :disabled="blockingUsers.has(user.id)"
                                    @click="blockUser(user.id)">
                                    <Loader2Icon v-if="blockingUsers.has(user.id)" class="mr-2 h-4 w-4 animate-spin" />
                                    {{ blockingUsers.has(user.id) ? 'Blocking...' : 'Block' }}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <Separator />
            <div>
                <h3 class="text-lg font-medium mb-4">Blocked Users</h3>
                <BlockedUsersList />
            </div>
        </CardContent>
    </Card>

    <AlertDialog :open="!!userIdToBlock">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Block User</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to block this user? They won't be able to interact with you.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="userIdToBlock = null">Cancel</AlertDialogCancel>
                <AlertDialogAction @click="confirmBlock" :disabled="isProcessing">
                    <Loader2Icon v-if="isProcessing" class="mr-2 h-4 w-4 animate-spin" />
                    {{ isProcessing ? 'Processing...' : 'Block' }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDebounce } from '@/composables/useDebounce';
import { useSearchStore } from '@/stores/searchStore';
import { useFriendStore } from '@/stores/friendStore';
import { useToast } from '@/components/ui/toast';
import defaultAvatar from '@/assets/avatar-default.svg';
import { SearchIcon, Loader2Icon } from 'lucide-vue-next';
import BlockedUsersList from '@/components/user/BlockedUsersList.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';

const searchStore = useSearchStore();
const friendStore = useFriendStore();
const { toast } = useToast();

const searchQuery = ref('');
const loading = ref(false);
const blockingUsers = ref(new Set());
const userIdToBlock = ref(null);
const isProcessing = ref(false);

// Using searchStore's existing search functionality
const searchResults = computed(() => searchStore.userSearchResults);

const getInitials = (name) => {
    return name
        ?.split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '??';
};

// Using searchStore's existing search method
const handleSearch = async () => {
    if (!searchQuery.value.trim()) {
        return;
    }

    loading.value = true;
    try {
        await searchStore.searchUsers({
            keyword: searchQuery.value,
            index: 0,
            count: 20
        });
    } catch (err) {
        toast({
            title: "Error",
            description: "Failed to search users",
            variant: "destructive"
        });
    } finally {
        loading.value = false;
    }
};

// Watch for search query changes with debounce
watch(searchQuery, useDebounce(() => {
    handleSearch();
}, 300));

const blockUser = (userId) => {
    userIdToBlock.value = userId;
};

// Using friendStore's existing block functionality
const confirmBlock = async () => {
    if (!userIdToBlock.value) return;

    isProcessing.value = true;
    blockingUsers.value.add(userIdToBlock.value);

    try {
        await friendStore.setBlock(userIdToBlock.value, 0);
        toast({
            title: "Success",
            description: "User blocked successfully"
        });
        searchStore.resetUserSearch();
    } catch (err) {
        toast({
            title: "Error",
            description: "Failed to block user",
            variant: "destructive"
        });
    } finally {
        isProcessing.value = false;
        blockingUsers.value.delete(userIdToBlock.value);
        userIdToBlock.value = null;
    }
};

// Cleanup on component unmount
onUnmounted(() => {
    searchStore.resetUserSearch();
});
</script>