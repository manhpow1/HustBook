<template>
    <Card>
        <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
                Manage your account privacy and blocked users
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

            <Separator />

            <div>
                <h3 class="text-lg font-medium mb-4">Privacy Options</h3>
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <Label htmlFor="profile-visibility">Profile Visibility</Label>
                            <p class="text-sm text-muted-foreground">Control who can see your profile</p>
                        </div>
                        <Select v-model="privacySettings.profileVisibility">
                            <SelectTrigger id="profile-visibility" class="w-[180px]">
                                <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="friends">Friends Only</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="flex items-center justify-between">
                        <div>
                            <Label htmlFor="message-settings">Message Settings</Label>
                            <p class="text-sm text-muted-foreground">Who can send you messages</p>
                        </div>
                        <Select v-model="privacySettings.messageSettings">
                            <SelectTrigger id="message-settings" class="w-[180px]">
                                <SelectValue placeholder="Select setting" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="everyone">Everyone</SelectItem>
                                <SelectItem value="friends">Friends Only</SelectItem>
                                <SelectItem value="none">No One</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div class="flex items-center space-x-2">
                        <Switch id="show-online-status" v-model="privacySettings.showOnlineStatus" />
                        <Label htmlFor="show-online-status">Show Online Status</Label>
                    </div>

                    <div class="flex items-center space-x-2">
                        <Switch id="allow-friend-requests" v-model="privacySettings.allowFriendRequests" />
                        <Label htmlFor="allow-friend-requests">Allow Friend Requests</Label>
                    </div>
                </div>
            </div>

            <div class="flex justify-end">
                <Button :disabled="isSaving" @click="saveSettings">
                    <Loader2Icon v-if="isSaving" class="mr-2 h-4 w-4 animate-spin" />
                    {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </Button>
            </div>
        </CardContent>
    </Card>
</template>

<script setup>
import { ref, reactive } from 'vue';
import defaultAvatar from '@/assets/avatar-default.svg';
import { useFriendStore } from '@/stores/friendStore';
import { useToast } from '@/components/ui/toast';
import { SearchIcon, Loader2Icon } from 'lucide-vue-next';
import BlockedUsersList from '@/components/user/BlockedUsersList.vue';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const friendStore = useFriendStore();
const { toast } = useToast();

const loading = ref(false);
const searchQuery = ref('');
const searchResults = ref([]);
const blockingUsers = ref(new Set());
const isSaving = ref(false);

const privacySettings = reactive({
    profileVisibility: 'friends',
    messageSettings: 'friends',
    showOnlineStatus: true,
    allowFriendRequests: true
});

const searchUsers = async () => {
    if (!searchQuery.value.trim()) {
        searchResults.value = [];
        return;
    }

    loading.value = true;
    try {
        const results = await friendStore.searchUsers(searchQuery.value);
        searchResults.value = results;
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to search users",
            variant: "destructive",
        });
    } finally {
        loading.value = false;
    }
};

const blockUser = async (userId) => {
    blockingUsers.value.add(userId);
    try {
        await friendStore.setBlock(userId, 0);
        searchResults.value = searchResults.value.filter(user => user.id !== userId);
        toast({
            title: "Success",
            description: "User blocked successfully",
        });
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to block user",
            variant: "destructive",
        });
    } finally {
        blockingUsers.value.delete(userId);
    }
};

const saveSettings = async () => {
    isSaving.value = true;
    try {
        // API call to save privacy settings
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
        toast({
            title: "Success",
            description: "Privacy settings updated successfully",
        });
    } catch (error) {
        toast({
            title: "Error",
            description: "Failed to save settings",
            variant: "destructive",
        });
    } finally {
        isSaving.value = false;
    }
};

const getInitials = (name) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

// Debounced search
watch(
    () => searchQuery.value,
    useDebounce(() => {
        searchUsers();
    }, 300)
);
</script>