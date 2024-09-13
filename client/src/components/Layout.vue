<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Sidebar -->
    <nav class="w-64 bg-white shadow-lg">
      <div class="p-4">
        <h1 class="text-2xl font-bold text-blue-600">HustBook</h1>
      </div>
      <ul class="mt-4">
        <li v-for="item in navItems" :key="item.path" class="mb-2">
          <router-link :to="item.path" class="block px-4 py-2 text-gray-700 hover:bg-blue-100 hover:text-blue-600">
            {{ item.name }}
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- Main content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h2 class="text-xl font-semibold text-gray-800">{{ currentPage }}</h2>
          <button class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Log out
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200">
        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <slot></slot>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
export default {
  name: "Layout",
  data() {
    return {
      navItems: [
        { name: "Home", path: "/" },
        { name: "Profile", path: "/profile" },
        { name: "Friends", path: "/friends" },
        { name: "Messages", path: "/messages" },
      ],
      currentPage: "Home",
    };
  },
};
</script>