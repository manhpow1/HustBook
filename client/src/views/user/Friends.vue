<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Friends</h1>
    <div v-if="userStore.isLoggedIn">
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-4">Friend Requests</h2>
        <FriendRequestList />
      </div>
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-4">Friend Suggestions</h2>
        <FriendSuggestionList />
      </div>
      <div>
        <h2 class="text-2xl font-semibold mb-4">Your Friends</h2>
        <FriendList />
      </div>
    </div>
    <div v-else>
      <p class="text-gray-600">Please log in to view your friends and friend requests.</p>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '../../stores/userStore';
import FriendRequestList from '../../components/user/FriendRequestList.vue';
import FriendSuggestionList from '../../components/user/FriendSuggestionList.vue';
import FriendList from '../../components/user/FriendList.vue';

const userStore = useUserStore();
</script>
