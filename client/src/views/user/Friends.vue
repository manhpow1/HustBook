<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">Friends</h1>
    <div v-if="userStore.isLoggedIn">
      <div class="mb-8">
        <FriendRequestList />
      </div>
      <div class="mb-8">
        <FriendSuggestionList />
      </div>
      <div>
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
import FriendRequestList from '../../components/friend/FriendRequestList.vue';
import FriendSuggestionList from '../../components/friend/FriendSuggestionList.vue';
import FriendList from '../../components/friend/FriendList.vue';
const userStore = useUserStore();
</script>