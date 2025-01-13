<template>
    <div class="space-y-6">
        <Card class="p-4">
            <CardHeader>
                <CardTitle>Friends</CardTitle>
                <CardDescription>Manage your friends and connections</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="flex flex-col md:flex-row gap-4 mb-6">
                    <div class="relative flex-1">
                        <Input v-model="searchQuery" placeholder="Search friends" class="w-full" :disabled="loading">
                        <template #prefix>
                            <SearchIcon class="w-4 h-4 text-muted-foreground" />
                        </template>
                        </Input>
                    </div>

                    <Select v-model="sortByInternal" :disabled="loading">
                        <SelectTrigger class="w-full md:w-[180px]">
                            <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Sort by Name</SelectItem>
                            <SelectItem value="recent">Sort by Recent</SelectItem>
                            <SelectItem value="mutual">Sort by Mutual Friends</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <!-- Loading State -->
                <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton v-for="i in limit" :key="i" class="h-[120px] w-full" />
                </div>

                <!-- Error State -->
                <Alert v-else-if="error" variant="destructive">
                    <AlertCircleIcon class="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>

                <!-- Empty State -->
                <Alert v-else-if="limitedFriends.length === 0" variant="default">
                    <AlertTitle>No friends found</AlertTitle>
                    <AlertDescription>
                        Try adjusting your search or connect with new people.
                    </AlertDescription>
                </Alert>

                <!-- Friend List -->
                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card v-for="friend in limitedFriends" :key="friend.userId" class="relative">
                        <CardContent class="pt-6">
                            <div class="flex items-center gap-4 mb-4">
                                <Avatar class="h-10 w-10">
                                    <AvatarImage :src="friend.avatar || '@/assets/avatar-default.svg'" :alt="friend.userName" />
                                    <AvatarFallback>{{
                                        friend.userName.charAt(0)
                                        }}</AvatarFallback>
                                </Avatar>
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-semibold truncate">{{ friend.userName }}</h3>
                                    <p class="text-sm text-muted-foreground">
                                        {{ friend.mutualFriends }} mutual friends
                                    </p>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVerticalIcon class="h-4 w-4" />
                                            <span class="sr-only">Open menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem @click="viewProfile(friend.userId)">
                                            <UserIcon class="mr-2 h-4 w-4" />
                                            View Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem @click="confirmBlock(friend.userId)" class="text-red-600">
                                            <ShieldIcon class="mr-2 h-4 w-4" />
                                            Block User
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div class="flex justify-between">
                                <Button variant="outline" size="sm" @click="viewProfile(friend.userId)">
                                    View Profile
                                </Button>
                                <Button variant="secondary" size="sm" @click="sendMessage(friend.userId)">
                                    Message
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>

        <AlertDialog :open="!!confirmDialog">
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Block User</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to block this user? They will no longer be
                        able to send you messages or friend requests.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel @click="cancelBlock">Cancel</AlertDialogCancel>
                    <AlertDialogAction @click="blockConfirmed" :disabled="isProcessing">
                        <Loader2Icon v-if="isProcessing" class="mr-2 h-4 w-4 animate-spin" />
                        {{ isProcessing ? "Blocking..." : "Block" }}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "@/components/ui/toast";
import { useFriendStore } from "@/stores/friendStore";
import { useDebounce } from "@/composables/useDebounce";
import {
    AlertCircleIcon,
    Loader2Icon,
    MoreVerticalIcon,
    SearchIcon,
    ShieldIcon,
    UserIcon,
} from "lucide-vue-next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const props = defineProps({
    userId: {
        type: String,
        default: null,
    },
    limit: {
        type: Number,
        default: 6,
    },
    sortBy: {
        type: String,
        default: "recent",
    },
});

const router = useRouter();
const friendStore = useFriendStore();
const { toast } = useToast();

// State
const friends = ref([]);
const loading = ref(true);
const error = ref(null);
const searchQuery = ref("");
const sortByInternal = ref(props.sortBy);
const confirmDialog = ref(false);
const userToBlock = ref(null);
const isProcessing = ref(false);

// Debounced search
const debouncedSearch = ref("");
const doSearch = () => {
    debouncedSearch.value = searchQuery.value;
};
const debouncedSearchFn = useDebounce(doSearch, 300);

// Watchers
watch(searchQuery, () => {
    debouncedSearchFn();
});

// Computed
const filteredFriends = computed(() => {
    let result = friends.value.filter((friend) =>
        friend.userName.toLowerCase().includes(debouncedSearch.value.toLowerCase())
    );

    switch (sortByInternal.value) {
        case "name":
            result.sort((a, b) => a.userName.localeCompare(b.userName));
            break;
        case "recent":
            result.sort(
                (a, b) => new Date(b.friendshipDate) - new Date(a.friendshipDate)
            );
            break;
        case "mutual":
            result.sort((a, b) => b.mutualFriends - a.mutualFriends);
            break;
    }

    return result;
});

const limitedFriends = computed(() => {
    return filteredFriends.value.slice(0, props.limit);
});

// Methods
const userStore = useUserStore();

const effectiveUserId = computed(() => {
    return props.userId || userStore.userData?.userId;
});

const fetchFriends = async () => {
    try {
        if (!effectiveUserId.value) {
            error.value = "No user ID available";
            return;
        }

        loading.value = true;
        error.value = null;
        const params = {
            userId: effectiveUserId.value,
            index: 0,
            count: props.limit
        };
        await friendStore.getUserFriends(params);
        friends.value = friendStore.friends;
    } catch (err) {
        error.value = "Failed to load friends";
        console.error("Error fetching friends:", err);
    } finally {
        loading.value = false;
    }
};

const viewProfile = (friend) => {
    if (!friend?.userId) {
        console.error("Missing userId for friend:", friend);
        return;
    }
    router.push({ name: "UserProfile", params: { userId: friend.userId } });
};

const sendMessage = (userId) => {
    router.push({ name: "Messages", query: { userId } });
};

const confirmBlock = (userId) => {
    userToBlock.value = userId;
    confirmDialog.value = true;
};

const blockConfirmed = async () => {
    if (!userToBlock.value) return;

    isProcessing.value = true;
    try {
        await friendStore.setBlock(userToBlock.value, 0);
        toast({
            title: "Success",
            description: "User blocked successfully",
        });
        friends.value = friends.value.filter(
            (friend) => friend.userId !== userToBlock.value
        );
    } catch (err) {
        console.error(`Error blocking user with ID ${userToBlock.value}:`, err);
        toast({
            title: "Error",
            description: "Failed to block user",
            variant: "destructive",
        });
    } finally {
        isProcessing.value = false;
        confirmDialog.value = false;
        userToBlock.value = null;
    }
};

const cancelBlock = () => {
    confirmDialog.value = false;
    userToBlock.value = null;
};

// Lifecycle
onMounted(() => {
    fetchFriends();
});
</script>
