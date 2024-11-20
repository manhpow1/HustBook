<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Friends</h1>
    <div v-if="userStore.isLoggedIn">
      <ErrorBoundary component-name="FriendRequests">
        <FriendRequests />
      </ErrorBoundary>
      <!-- Placeholder for future friend list or other friend-related components -->
      <div class="mt-8">
        <h2 class="text-2xl font-bold mb-4">Your Friends</h2>
        <p class="text-gray-600">Friend list component will be implemented here.</p>
      </div>
    </div>
    <div v-else>
      <p class="text-gray-600">Please log in to view your friends and friend requests.</p>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '../../stores/userStore';
import ErrorBoundary from '../../components/shared/ErrorBoundary.vue';
import FriendRequests from '../../components/user/FriendRequests.vue';
const userStore = useUserStore()
</script>