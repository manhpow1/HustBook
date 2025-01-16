<template>
    <Card>
        <CardHeader>
            <CardTitle>Suggested Friends</CardTitle>
            <CardDescription>People you might know based on mutual connections</CardDescription>
        </CardHeader>

        <CardContent>
            <!-- Loading State -->
            <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton v-for="i in 3" :key="i" class="h-[160px] w-full" />
            </div>

            <!-- Error State -->
            <Alert v-else-if="error" variant="destructive">
                <AlertCircleIcon class="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{{ error }}</AlertDescription>
            </Alert>

            <!-- Empty State -->
            <Alert v-else-if="friendSuggestions.length === 0" variant="default">
                <AlertTitle>No Suggestions Available</AlertTitle>
                <AlertDescription>
                    We don't have any friend suggestions for you at the moment.
                </AlertDescription>
            </Alert>

            <!-- Suggestions List -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card v-for="suggestion in friendSuggestions" :key="suggestion.userId" class="relative">
                    <CardContent class="pt-6">
                        <div class="flex items-center gap-4 mb-4 cursor-pointer"
                            @click="navigateToProfile(suggestion.userId)">
                            <Avatar class="h-12 w-12">
                                <AvatarImage :src="suggestion.avatar || defaultAvatar" :alt="suggestion.userName" />
                                <AvatarFallback>{{ suggestion.userName.charAt(0) }}</AvatarFallback>
                            </Avatar>

                            <div class="flex-1 min-w-0">
                                <h3 class="font-semibold truncate">{{ suggestion.userName }}</h3>
                                <p class="text-sm text-muted-foreground">
                                    {{ suggestion.same_friends }} mutual friends
                                </p>
                            </div>
                        </div>

                        <div class="flex gap-2">
                            <Button class="flex-1" variant="default" size="sm"
                                :disabled="isProcessing(suggestion.userId) || friendStore.sentRequests.has(suggestion.userId)"
                                @click="sendFriendRequest(suggestion.userId)">
                                <Loader2Icon v-if="isProcessing(suggestion.userId)" class="mr-2 h-4 w-4 animate-spin" />
                                {{ isProcessing(suggestion.userId) ? 'Sending...' : 
                                   friendStore.sentRequests.has(suggestion.userId) ? 'Request Sent' : 'Add Friend' }}
                            </Button>

                            <Button variant="outline" size="sm" :disabled="isProcessing(suggestion.userId)"
                                @click="confirmBlock(suggestion.userId)">
                                <ShieldIcon class="mr-2 h-4 w-4" />
                                Block
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </CardContent>
    </Card>

    <!-- Block Confirmation Dialog -->
    <AlertDialog :open="!!confirmDialog">
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Block User</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to block this user? You won't receive any messages or friend requests from
                    them.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel @click="cancelBlock">Cancel</AlertDialogCancel>
                <AlertDialogAction @click="blockConfirmed" :disabled="isLoading">
                    <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                    {{ isLoading ? 'Blocking...' : 'Block' }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFriendStore } from '@/stores/friendStore';
import { useToast } from '@/components/ui/toast';
import defaultAvatar from '@/assets/avatar-default.svg';
import { AlertCircleIcon, Loader2Icon, ShieldIcon } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
// Import UI Components
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Store and composables setup
const friendStore = useFriendStore();
const { toast } = useToast();
const router = useRouter();

// State
const friendSuggestions = ref([]);
const loading = ref(true);
const error = ref(null);
const processingSuggestions = ref(new Set());
const confirmDialog = ref(false);
const userToBlock = ref(null);
const isLoading = ref(false);

// Methods
const isProcessing = (userId) => processingSuggestions.value.has(userId);

const sendFriendRequest = async (userId) => {
    if (processingSuggestions.value.has(userId)) return;

    processingSuggestions.value.add(userId);
    try {
        await friendStore.sendFriendRequest(userId);
        toast({
            title: "Success",
            description: "Friend request sent successfully"
        });
        friendSuggestions.value = friendSuggestions.value.filter(
            user => user.userId !== userId
        );
    } catch (err) {
        console.error(`Error sending friend request to user ID ${userId}:`, err);
        toast({
            title: "Error",
            description: "Failed to send friend request",
            variant: "destructive"
        });
    } finally {
        processingSuggestions.value.delete(userId);
    }
};

const confirmBlock = (userId) => {
    userToBlock.value = userId;
    confirmDialog.value = true;
};

const blockConfirmed = async () => {
    if (!userToBlock.value) return;

    isLoading.value = true;
    try {
        await friendStore.setBlock(userToBlock.value, 0);
        toast({
            title: "Success",
            description: "User blocked successfully"
        });
        friendSuggestions.value = friendSuggestions.value.filter(
            user => user.userId !== userToBlock.value
        );
    } catch (err) {
        console.error(`Error blocking user with ID ${userToBlock.value}:`, err);
        toast({
            title: "Error",
            description: "Failed to block user",
            variant: "destructive"
        });
    } finally {
        isLoading.value = false;
        confirmDialog.value = false;
        userToBlock.value = null;
    }
};

const cancelBlock = () => {
    confirmDialog.value = false;
    userToBlock.value = null;
};

const navigateToProfile = (userId) => {
    router.push(`/profile/${userId}`);
};

// Initialize
onMounted(async () => {
    try {
        loading.value = true;
        await friendStore.getListSuggestedFriends();
        friendSuggestions.value = friendStore.suggestedFriends;
    } catch (err) {
        error.value = 'Failed to load suggested friends';
        console.error('Error loading suggestions:', err);
    } finally {
        loading.value = false;
    }
});
</script>
