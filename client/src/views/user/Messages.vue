<template>
  <div class="flex h-full">
    <!-- Left Side: Conversations List -->
    <aside class="w-1/3 border-r border-gray-200 overflow-y-auto">
      <div class="flex justify-between items-center p-4">
        <h2 class="text-lg font-bold">Messages</h2>
        <button @click="createNewMessage" class="text-blue-600 hover:text-blue-800 transition">
          Create New Message
        </button>
      </div>
      <div v-if="chatStore.loadingConversations" class="p-4 text-center text-gray-600">
        Loading conversations...
      </div>
      <ul v-else class="divide-y divide-gray-200">
        <li v-for="convo in chatStore.conversations" :key="convo.id" @click="selectConversation(convo.id)"
          :class="['p-4 cursor-pointer hover:bg-gray-100', { 'bg-gray-200': chatStore.selectedConversationId === convo.id }]"
          :aria-selected="chatStore.selectedConversationId === convo.id">
          <div class="flex items-center space-x-3">
            <img :src="convo.Partner.avatar || '/default-avatar.png'" alt="Avatar" class="h-8 w-8 rounded-full" />
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ convo.Partner.userName || 'User' }}</p>
              <p class="text-sm text-gray-500 truncate">
                {{ convo.LastMessage.message || 'No messages yet' }}
              </p>
            </div>
            <span v-if="convo.LastMessage.unread === '1'" class="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
          </div>
        </li>
      </ul>
    </aside>

    <!-- Right Side: Selected Conversation -->
    <section class="flex-1 flex flex-col">
      <div v-if="!chatStore.selectedConversationId" class="flex-1 flex items-center justify-center text-gray-500">
        Select a conversation or create a new one.
      </div>
      <div v-else class="flex-1 flex flex-col">
        <!-- Messages header -->
        <header class="border-b border-gray-200 p-4 flex items-center space-x-4">
          <button @click="showProfile = !showProfile" class="text-gray-700 hover:text-gray-900">
            i
          </button>
          <h2 class="text-lg font-bold">Chat</h2>
          <div class="ml-auto">
            <!-- Add a button to quickly scroll down if messages are long -->
            <button @click="scrollToBottom" class="text-gray-700 hover:text-gray-900">↓</button>
          </div>
        </header>

        <!-- Messages list -->
        <div ref="messageList" class="flex-1 overflow-y-auto p-4 space-y-4">
          <div v-if="chatStore.loadingMessages" class="text-center text-gray-500">Loading messages...</div>
          <template v-else>
            <div v-if="chatStore.messages.length === 0" class="text-center text-gray-500">
              No messages yet. Start the conversation!
            </div>
            <div v-for="msg in chatStore.messages" :key="msg.messageId" :class="messageClasses(msg)">
              <div class="inline-block px-3 py-2 rounded-lg max-w-xs break-words"
                :class="msg.sender.id === userStore.uid ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'">
                <span v-html="formatMessageContent(msg.message)"></span>
                <span v-if="isMessagePending(msg)" class="ml-1 text-xs text-gray-500 italic">(sending...)</span>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {{ formatDate(msg.created) }}
              </div>
            </div>
          </template>
        </div>

        <!-- Input box -->
        <footer class="border-t border-gray-200 p-4 flex items-center space-x-2">
          <input v-model="messageContent" @keyup.enter="sendMessage" type="text" placeholder="Type your message..."
            class="flex-1 border border-gray-300 rounded p-2 focus:ring focus:border-blue-500" />
          <button @click="sendMessage" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Send</button>
        </footer>
      </div>
    </section>

    <!-- Profile Sidebar -->
    <aside v-if="showProfile" class="absolute right-0 top-0 bottom-0 w-64 bg-white border-l border-gray-200 p-4 z-40">
      <h3 class="font-bold text-lg">Profile</h3>
      <p class="text-sm text-gray-600 mt-2">Profile details and block option</p>
      <hr class="my-4" />
      <button @click="blockUser" class="text-red-600 hover:text-red-800">Block User</button>
    </aside>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { useChatStore } from '../../stores/chatStore';
import { useUserStore } from '../../stores/userStore';
import { formatDate } from '../../utils/helpers';
import { sanitizeOutput } from '../../utils/sanitize';

// UI State
const showProfile = ref(false);
const messageContent = ref('');

// Access stores
const chatStore = useChatStore();
const userStore = useUserStore();

// On mount, fetch conversations
onMounted(async () => {
  await chatStore.fetchConversations();
});

// Select a conversation and load messages
const selectConversation = async (conversationId) => {
  await chatStore.fetchMessages(conversationId);
  // Mark as read after loading messages
  await chatStore.markAsRead();
  scrollToBottom();
};

// Create a new message action (redirect to contacts page or open a modal)
const createNewMessage = () => {
  // Implementation depends on your UX design
  // E.g., router.push('/select-contact')
};

// Send message via store action
const sendMessage = async () => {
  if (!messageContent.value.trim()) return;
  await chatStore.sendMessage(messageContent.value.trim());
  messageContent.value = '';
  nextTick(() => {
    scrollToBottom();
  });
};

// Scroll to bottom of message list
const messageList = ref(null);
const scrollToBottom = () => {
  nextTick(() => {
    if (messageList.value) {
      messageList.value.scrollTop = messageList.value.scrollHeight;
    }
  });
};

// Determine if message is still pending (temp message)
const isMessagePending = (msg) => msg.messageId.startsWith('temp_');

// Format message content: 
// - Replace emoticons with images
// - Linkify URLs and phone numbers
function formatMessageContent(content) {
  // Example: Replace ':)' with an emoji image
  const replaced = content
    .replace(/:\)/g, '😀')
    .replace(/=b/g, '👍');
  // Linkify URLs
  const urlified = replaced.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">$1</a>'
  );
  // Detect phone numbers (simple regex for demonstration)
  const phoneified = urlified.replace(
    /\b0\d{9}\b/g,
    '<a href="tel:$&" class="text-green-600 underline">$&</a>'
  );
  return sanitizeOutput(phoneified);
}

// Apply conditional classes to messages (align right if from current user)
const messageClasses = (msg) => {
  const isCurrentUser = msg.sender && msg.sender.id === userStore.uid;
  return [
    'flex flex-col',
    isCurrentUser ? 'items-end' : 'items-start'
  ];
};

// Block user action
const blockUser = async () => {
  // This would call setBlock endpoint with type = 0 (block)
  // After blocking, maybe close the sidebar or refresh conversation list
  console.log('Blocking user functionality here');
};
</script>