<template>
  <div class="container mx-auto p-4">
    <div class="flex flex-col lg:flex-row h-[80vh] gap-4">
      <!-- Conversations Sidebar -->
      <Card class="lg:w-1/3 h-full">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Messages</span>
            <Button variant="outline" size="sm" @click="createNewMessage">
              <PlusCircleIcon class="h-4 w-4 mr-2" />
              New Message
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent class="p-0 h-[calc(100%-4rem)]">
          <ScrollArea class="h-full">
            <div v-if="chatStore.loadingConversations" class="p-4">
              <div v-for="i in 5" :key="i" class="flex items-center space-x-4 mb-4">
                <Skeleton class="h-12 w-12 rounded-full" />
                <div class="space-y-2">
                  <Skeleton class="h-4 w-[200px]" />
                  <Skeleton class="h-4 w-[160px]" />
                </div>
              </div>
            </div>
            <div v-else-if="!chatStore.conversations.length" class="p-4 text-center text-muted-foreground">
              No conversations yet
            </div>
            <div v-else class="divide-y">
              <button v-for="conversation in chatStore.conversations" :key="conversation.conversationId"
                @click="selectConversation(conversation.conversationId)"
                class="w-full p-4 hover:bg-accent text-left transition-colors"
                :class="{ 'bg-accent': chatStore.selectedConversationId === conversation.conversationId }">
                <div class="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage :src="conversation.Partner.avatar" :alt="conversation.Partner.userName" />
                    <AvatarFallback>{{ getInitials(conversation.Partner.userName) }}</AvatarFallback>
                  </Avatar>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <p class="font-medium truncate">{{ conversation.Partner.userName }}</p>
                      <span v-if="conversation.LastMessage?.created" class="text-xs text-muted-foreground">
                        {{ formatTimeAgo(conversation.LastMessage.created) }}
                      </span>
                    </div>
                    <p class="text-sm text-muted-foreground truncate">
                      {{ conversation.LastMessage?.message || 'No messages yet' }}
                    </p>
                  </div>
                  <Badge v-if="conversation.LastMessage?.unread === '1'" variant="secondary">
                    New
                  </Badge>
                </div>
              </button>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <!-- Chat Area -->
      <Card class="flex-1 h-full">
        <div v-if="!chatStore.selectedConversationId"
          class="h-full flex items-center justify-center text-muted-foreground">
          Select a conversation or start a new one
        </div>
        <div v-else class="h-full flex flex-col">
          <CardHeader class="border-b">
            <CardTitle class="flex items-center space-x-4">
              <Button variant="ghost" size="icon" class="lg:hidden" @click="chatStore.selectedConversationId = null">
                <ArrowLeftIcon class="h-4 w-4" />
              </Button>
              <Avatar>
                <AvatarImage :src="selectedConversation?.Partner.avatar"
                  :alt="selectedConversation?.Partner.userName" />
                <AvatarFallback>
                  {{ getInitials(selectedConversation?.Partner.userName) }}
                </AvatarFallback>
              </Avatar>
              <span>{{ selectedConversation?.Partner.userName }}</span>
            </CardTitle>
          </CardHeader>

          <ScrollArea ref="messagesScroll" class="flex-1 p-4">
            <div v-if="chatStore.loadingMessages" class="space-y-4">
              <div v-for="i in 5" :key="i" class="flex items-start space-x-4">
                <Skeleton class="h-10 w-10 rounded-full" />
                <div class="space-y-2">
                  <Skeleton class="h-4 w-[200px]" />
                  <Skeleton class="h-4 w-[160px]" />
                </div>
              </div>
            </div>
            <div v-else-if="!chatStore.messages.length" class="text-center text-muted-foreground">
              No messages yet
            </div>
            <div v-else class="space-y-4">
              <div v-for="message in chatStore.messages" :key="message.messageId" class="flex items-start space-x-4"
                :class="{ 'justify-end': message.sender.id === userStore.userData?.userId }">
                <Avatar v-if="message.sender.id !== userStore.userData?.userId">
                  <AvatarImage :src="message.sender.avatar" :alt="message.sender.userName" />
                  <AvatarFallback>{{ getInitials(message.sender.userName) }}</AvatarFallback>
                </Avatar>
                <div class="rounded-lg p-4 max-w-[70%]" :class="[
                  message.sender.id === userStore.userData?.userId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                ]">
                  <p class="whitespace-pre-wrap break-words">{{ message.content || message.message }}</p>
                  <span class="text-xs opacity-70">{{ formatDate(message.created) }}</span>
                </div>
                <span v-if="message.sender.id === userStore.userData?.userId"
                  class="text-xs text-muted-foreground ml-2">
                  <CheckIcon v-if="message.status === 'sent'" class="h-4 w-4" />
                  <Loader2Icon v-else-if="message.status === 'sending'" class="h-4 w-4 animate-spin" />
                  <XCircleIcon v-else-if="message.status === 'error'" class="h-4 w-4 text-destructive"
                    :title="message.error" />
                </span>
              </div>
            </div>
          </ScrollArea>

          <CardFooter class="border-t p-4">
            <form @submit.prevent="sendMessage" class="flex space-x-2 w-full">
              <Input v-model="messageContent" placeholder="Type your message..." :disabled="chatStore.sendingMessage" />
              <Button type="submit" :disabled="!messageContent.trim() || chatStore.sendingMessage">
                <SendIcon v-if="!chatStore.sendingMessage" class="h-4 w-4" />
                <Loader2Icon v-else class="h-4 w-4 animate-spin" />
              </Button>
            </form>
          </CardFooter>
        </div>
      </Card>
    </div>

    <Dialog v-model:open="showNewMessageDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>
            Select a user to start a conversation with
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4 py-4">
          <Input v-model="searchQuery" placeholder="Search users..." @input="searchUsers" :disabled="searchLoading" />
          <ScrollArea class="h-[300px]">
            <div v-if="searchLoading" class="space-y-4">
              <div v-for="i in 3" :key="i" class="flex items-center space-x-4">
                <Skeleton class="h-10 w-10 rounded-full" />
                <div class="space-y-2">
                  <Skeleton class="h-4 w-[200px]" />
                  <Skeleton class="h-4 w-[100px]" />
                </div>
              </div>
            </div>
            <div v-else-if="searchError" class="text-center text-destructive p-4">
              {{ searchError }}
              <Button variant="outline" size="sm" class="mt-2" @click="searchUsers">
                Retry
              </Button>
            </div>
            <div v-else-if="!searchResults.length" class="text-center text-muted-foreground">
              No users found
            </div>
            <div v-else class="space-y-2">
              <button v-for="user in searchResults" :key="user.userId" @click="startConversation(user)"
                class="w-full p-2 flex items-center space-x-4 hover:bg-accent rounded-md transition-colors">
                <Avatar>
                  <AvatarImage :src="user.avatar" :alt="user.userName" />
                  <AvatarFallback>{{ getInitials(user.userName) }}</AvatarFallback>
                </Avatar>
                <span class="flex-1 text-left">{{ user.userName }}</span>
              </button>
              <Button v-if="searchStore.hasMoreUsers" variant="outline" size="sm" class="w-full"
                :disabled="searchLoading" @click="loadMore">
                <Loader2Icon v-if="searchLoading" class="mr-2 h-4 w-4 animate-spin" />
                Load More Results
              </Button>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { formatDistanceToNow } from 'date-fns';
import { useChatStore } from '@/stores/chatStore';
import { useSearchStore } from '@/stores/searchStore';
import { useUserStore } from '@/stores/userStore';
import { getSocket } from '@/services/socket';
import { useDebounce } from '@/composables/useDebounce';
import { PlusCircleIcon, ArrowLeftIcon, SendIcon, Loader2Icon, CheckIcon, XCircleIcon } from 'lucide-vue-next';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import logger from '@/services/logging';
import { formatDate, formatTimeAgo } from '@/utils/helpers';

const chatStore = useChatStore();
const userStore = useUserStore();
const searchStore = useSearchStore();

// Local state
const messageContent = ref('');
const messagesScroll = ref(null);
const showNewMessageDialog = ref(false);
const searchQuery = ref('');
const searchResults = ref([]);
const { isLoading: searchLoading, error: searchError } = storeToRefs(searchStore);

// Computed
const selectedConversation = computed(() => {
  return chatStore.conversations?.find?.(c => c.conversationId === chatStore.selectedConversationId);
});

// Methods
const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const selectConversation = async (conversationId) => {
  console.log('Selecting conversation:', { conversationId });
  chatStore.selectedConversationId = conversationId;
  try {
    await chatStore.fetchMessages(conversationId);
    await chatStore.markAsRead();
    logger.debug('Conversation loaded:', {
      conversationId,
      messageCount: chatStore.messages?.length || 0
    });
    scrollToBottom();
  } catch (error) {
    console.error('Failed to load conversation:', error);
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesScroll.value) {
      const scrollContainer = messagesScroll.value.$el;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  });
};

const createNewMessage = () => {
  showNewMessageDialog.value = true;
  searchQuery.value = '';
  searchResults.value = [];
};

const sendMessage = async () => {
  if (!messageContent.value.trim() || !chatStore.selectedConversationId) return;

  try {
    const socket = getSocket();
    logger.debug('Sending message:', {
      conversationId: chatStore.selectedConversationId,
      messageLength: messageContent.value.trim().length,
      recipientId: selectedConversation.value?.Partner?.userId,
      socketConnected: socket?.connected || false,
      socketId: socket?.id
    });

    await chatStore.sendMessage({
      conversationId: chatStore.selectedConversationId,
      message: messageContent.value.trim()
    });
    messageContent.value = '';
    await chatStore.fetchConversations();
    await chatStore.fetchMessages(chatStore.selectedConversationId);
    scrollToBottom();
  } catch (error) {
    logger.error('Failed to send message:', {
      error: error.message || error,
      conversationId: chatStore.selectedConversationId,
      stack: error.stack
    });
  }
};

const searchUsers = useDebounce(async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }
  try {
    const { users, total } = await searchStore.searchUsers({
      keyword: searchQuery.value,
      index: 0,
      count: 20
    });
    // Filter out current user and ensure user data format matches
    searchResults.value = users
      .filter(user => user.userId !== userStore.userData?.userId)
      .map(user => ({
        ...user,
        userName: user.userName || user.username || 'Unknown User',
        avatar: user.avatar || null
      }));
  } catch (error) {
    logger.error('Failed to search users:', error);
    toast({
      title: "Error",
      description: "Failed to search users",
      variant: "destructive"
    });
  }
}, 300);

const startConversation = async (user) => {
  try {
    const conversationId = await chatStore.createConversation(user.userId);
    showNewMessageDialog.value = false;
    await chatStore.fetchConversations();
    await selectConversation(conversationId);
  } catch (error) {
    logger.error('Failed to start conversation:', error);
  }
};

const setupSocketEvents = async (conversationId) => {
  const socket = getSocket();
  if (!socket) return;

  // Leave previous room if any
  if (chatStore.currentRoom) {
    socket.emit('leave_room', { conversationId: chatStore.currentRoom.split('_')[1] });
  }

  // Join new room with both conversationId and partnerId
  const conversation = chatStore.conversations.find(c => c.conversationId === conversationId);
  if (conversation) {
    socket.emit('join_room', {
      conversationId,
      partnerId: conversation.Partner.userId
    });
    chatStore.currentRoom = `conversation_${conversationId}`;
  }

  // Clean up existing listeners
  socket.off('onmessage');
  socket.off('message_sent');
  socket.off('message_error');
  socket.off('conversation_updated');

  // Set up new listeners
  socket.on('onmessage', (data) => {
    if (data.message.conversationId === conversationId) {
      chatStore.addMessage(data.message);
      chatStore.fetchConversations(); // Refresh conversations list
      nextTick(() => {
        scrollToBottom();
      });
    }
  });

  socket.on('message_sent', (data) => {
    if (data.conversationId === conversationId) {
      chatStore.confirmMessageSent(data.messageId);
      nextTick(() => {
        scrollToBottom();
      });
    }
  });

  socket.on('message_error', (error) => {
    if (error.conversationId === conversationId) {
      chatStore.handleMessageError(error);
    }
  });

  socket.on('conversation_updated', () => {
    chatStore.fetchConversations();
  });
};

async function loadMessages(conversationId) {
  try {
    await chatStore.fetchMessages(conversationId);
    await chatStore.markAsRead();
    setupSocketEvents(conversationId);
  } catch (error) {
    logger.error('Failed to load messages:', error);
  }
}

// Watchers
watch(() => chatStore.messages, () => {
  scrollToBottom();
}, { deep: true });

// Lifecycle
onMounted(async () => {
  await chatStore.fetchConversations();
  if (chatStore.selectedConversationId) {
    await loadMessages(chatStore.selectedConversationId);
  }
  await chatStore.initSocket();
  
  const socket = getSocket();
  if (socket) {
    // Clean up any existing listeners
    socket.off('conversation_updated');
    socket.off('onmessage');
    socket.off('message_sent');
    socket.off('message_error');
    
    // Set up global listeners
    socket.on('conversation_updated', () => {
      chatStore.fetchConversations();
    });
    
    socket.on('onmessage', async (data) => {
      const { message } = data;
      // Add message to current conversation if it matches
      if (message.conversationId === chatStore.selectedConversationId) {
        chatStore.addMessage(message);
        scrollToBottom();
        // Mark message as read since we're viewing it
        await chatStore.markAsRead();
      } else {
        // Update unread count for other conversations
        chatStore.incrementUnreadCount();
      }
      // Refresh conversations list to update last message
      await chatStore.fetchConversations();
    });

    socket.on('message_sent', async (data) => {
      await chatStore.confirmMessageSent(data.messageId);
      scrollToBottom();
    });

    socket.on('message_error', (error) => {
      chatStore.handleMessageError(error);
    });
  }
});
</script>
