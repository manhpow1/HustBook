<template>
  <div class="flex flex-col min-h-screen bg-gray-100">
    <!-- Navigation -->
    <nav class="bg-white shadow-lg sticky top-0 z-50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <router-link to="/" class="flex-shrink-0">
              <img class="h-8 w-auto" src="../../public/logo.svg" alt="HUSTBOOK" />
            </router-link>
            <div class="hidden sm:block sm:ml-6">
              <div class="flex space-x-4">
                <div class="relative">
                  <input type="text" placeholder="Search HUSTBOOK"
                    class="w-64 px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <SearchIcon class="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <template v-if="isLoggedIn">
              <router-link v-for="item in navItems" :key="item.path" :to="item.path"
                class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-300">
                <component :is="item.icon" class="h-5 w-5 inline-block mr-1" />
                {{ item.name }}
              </router-link>
              <div class="ml-3 relative">
                <div>
                  <button @click="toggleUserMenu"
                    class="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <!-- <img class="h-8 w-8 rounded-full" src="/placeholder.svg?height=32&width=32" alt="User avatar" /> -->
                    <UserIcon class="h-5 w-5" />
                  </button>
                </div>
                <div v-if="showUserMenu"
                  class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                  <router-link to="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Your Profile
                  </router-link>
                  <router-link to="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Settings
                  </router-link>
                  <button @click="handleLogout"
                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Sign Out
                  </button>
                </div>
              </div>
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
          <div class="flex items-center sm:hidden">
            <button @click="toggleMobileMenu"
              class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
              <MenuIcon v-if="!showMobileMenu" class="h-6 w-6" />
              <XIcon v-else class="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
      <div v-if="showMobileMenu" class="sm:hidden">
        <div class="px-2 pt-2 pb-3 space-y-1">
          <router-link v-for="item in navItems" :key="item.path" :to="item.path"
            class="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
            <component :is="item.icon" class="h-5 w-5 inline-block mr-1" />
            {{ item.name }}
          </router-link>
          <button v-if="isLoggedIn" @click="handleLogout"
            class="w-full text-left text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium">
            Sign Out
          </button>
        </div>
      </div>
    </nav>

    <!-- Main content -->
    <main class="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot></slot>
    </main>

    <!-- Footer -->
    <footer class="bg-white shadow-md mt-12">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex flex-wrap justify-between">
          <div class="w-full md:w-1/3 mb-6 md:mb-0">
            <h3 class="text-lg font-semibold mb-2">About HUSTBOOK</h3>
            <p class="text-gray-600">Connecting students and alumni from HUST.</p>
          </div>
          <div class="w-full md:w-1/3 mb-6 md:mb-0">
            <h3 class="text-lg font-semibold mb-2">Quick Links</h3>
            <ul class="space-y-2">
              <li><a href="#" class="text-blue-600 hover:text-blue-800">Privacy Policy</a></li>
              <li><a href="#" class="text-blue-600 hover:text-blue-800">Terms of Service</a></li>
              <li><a href="#" class="text-blue-600 hover:text-blue-800">Contact Us</a></li>
            </ul>
          </div>
          <div class="w-full md:w-1/3">
            <h3 class="text-lg font-semibold mb-2">Follow Us</h3>
            <div class="flex space-x-4">
              <a href="#" class="text-gray-400 hover:text-blue-600">
                <FacebookIcon class="h-6 w-6" />
              </a>
              <a href="#" class="text-gray-400 hover:text-blue-600">
                <TwitterIcon class="h-6 w-6" />
              </a>
              <a href="#" class="text-gray-400 hover:text-blue-600">
                <InstagramIcon class="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
        <div class="mt-8 border-t border-gray-200 pt-8 text-center">
          <p class="text-gray-600">&copy; 2024 HUSTBOOK. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useUserState } from '../userState'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { HomeIcon, UserIcon, UsersIcon, MessageCircleIcon, SearchIcon, MenuIcon, XIcon, FacebookIcon, TwitterIcon, InstagramIcon } from 'lucide-vue-next'

const { isLoggedIn, logout } = useUserState()
const router = useRouter()

const showUserMenu = ref(false)
const showMobileMenu = ref(false)

const navItems = [
  { name: "Home", path: "/", icon: HomeIcon },
  { name: "Profile", path: "/profile", icon: UserIcon },
  { name: "Friends", path: "/friends", icon: UsersIcon },
  { name: "Messages", path: "/messages", icon: MessageCircleIcon },
]

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const handleLogout = async () => {
  try {
    const token = localStorage.getItem('token')
    await axios.post('http://localhost:3000/api/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` }
    })
    logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

</script>