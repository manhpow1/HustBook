<!-- src/components/Layout.vue -->
<template>
  <div class="flex flex-col min-h-screen bg-gray-100">
    <!-- Navigation -->
    <nav class="bg-white shadow-md">
      <div class="container mx-auto px-6 py-3">
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <router-link to="/" class="text-2xl font-bold text-blue-600">HUSTBOOK</router-link>
          </div>
          <div class="flex items-center space-x-4">
            <template v-if="isLoggedIn">
              <router-link v-for="item in navItems" :key="item.path" :to="item.path"
                class="text-gray-700 hover:text-blue-600 transition duration-300">
                {{ item.name }}
              </router-link>
              <button @click="handleLogout"
                class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                Sign Out
              </button>
            </template>
            <template v-else>
              <router-link to="/login"
                class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                Sign In
              </router-link>
              <router-link to="/signup"
                class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                Sign Up
              </router-link>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main content -->
    <main class="flex-grow container mx-auto px-6 py-8">
      <slot></slot>
    </main>

    <!-- Footer -->
    <footer class="bg-white shadow-md mt-12">
      <div class="container mx-auto px-6 py-4">
        <p class="text-center text-gray-600">&copy; 2024 HUSTBOOK. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script>
import { useUserState } from '../userState'
import axios from 'axios';

export default {
  name: "Layout",
  setup() {
    const { isLoggedIn, logout } = useUserState()
    return { isLoggedIn, logout }
  },
  data() {
    return {
      navItems: [
        { name: "Home", path: "/" },
        { name: "Profile", path: "/profile" },
        { name: "Friends", path: "/friends" },
        { name: "Messages", path: "/messages" },
      ],
    };
  },
  methods: {
    async handleLogout() {
      try {
        const token = localStorage.getItem('token');
        await axios.post('http://localhost:3000/api/auth/logout', null, {
          headers: { Authorization: `Bearer ${token}` }
        });
        this.logout();
        this.$router.push('/login');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  }
};
</script>