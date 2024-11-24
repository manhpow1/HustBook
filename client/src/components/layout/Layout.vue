<template>
  <div class="flex flex-col min-h-screen bg-gray-100">
    <!-- Navigation -->
    <nav class="bg-white shadow-lg sticky top-0 z-50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <router-link to="/" class="flex-shrink-0">
              <img class="h-8 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
            </router-link>
            <div class="hidden sm:block sm:ml-6">
              <div class="flex space-x-4">
                <div class="relative">
                  <SearchPosts />
                </div>
              </div>
            </div>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <template v-if="isLoggedIn">
              <router-link v-for="item in navItems" :key="item.path" :to="item.path"
                class="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition duration-300"
                :aria-current="$route.path === item.path ? 'page' : undefined">
                <component :is="iconComponents[item.icon]" class="h-5 w-5 inline-block mr-1" />
                {{ item.name }}
              </router-link>
              <NotificationTab />
              <div class="ml-3 relative">
                <div>
                  <button @click="toggleUserMenu"
                    class="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    :aria-expanded="showUserMenu">
                    <UserIcon class="h-5 w-5" />
                  </button>
                </div>
                <transition name="menu-fade">
                  <div v-if="showUserMenu"
                    class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                    <router-link to="/profile" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Your Profile
                    </router-link>
                    <router-link to="/settings" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Settings
                    </router-link>                    
                  </div>
                </transition>
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
              <router-link to="/get-verify-code"
                class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition duration-300">
                Get Verification Code
              </router-link>
            </template>
          </div>
          <div class="flex items-center sm:hidden">
            <button @click="toggleMobileMenu"
              class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              :aria-expanded="showMobileMenu">
              <MenuIcon v-if="!showMobileMenu" class="h-6 w-6" />
              <XIcon v-else class="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
      <transition name="mobile-menu">
        <div v-if="showMobileMenu" class="sm:hidden">
          <div class="px-2 pt-2 pb-3 space-y-1">
            <router-link v-for="item in navItems" :key="item.path" :to="item.path"
              class="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
              :aria-current="$route.path === item.path ? 'page' : undefined">
              <component :is="iconComponents[item.icon]" class="h-5 w-5 inline-block mr-1" />
              {{ item.name }}
            </router-link>
            <NotificationTab />
            <LogoutButton v-if="isLoggedIn" @logout-success="handleLogoutSuccess" class="w-full text-left">
              Sign Out
            </LogoutButton>
          </div>
        </div>
      </transition>
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
              <li><a href="/privacy" class="text-blue-600 hover:text-blue-800">Privacy Policy</a></li>
              <li><a href="/terms" class="text-blue-600 hover:text-blue-800">Terms of Service</a></li>
              <li><a href="/contact" class="text-blue-600 hover:text-blue-800">Contact Us</a></li>
            </ul>
          </div>
          <div class="w-full md:w-1/3">
            <h3 class="text-lg font-semibold mb-2">Follow Us</h3>
            <div class="flex space-x-4">
              <a href="https://facebook.com/hustbook" target="_blank" rel="noopener noreferrer"
                class="text-gray-400 hover:text-blue-600">
                <FacebookIcon class="h-6 w-6" />
              </a>
              <a href="https://twitter.com/hustbook" target="_blank" rel="noopener noreferrer"
                class="text-gray-400 hover:text-blue-600">
                <TwitterIcon class="h-6 w-6" />
              </a>
              <a href="https://instagram.com/hustbook" target="_blank" rel="noopener noreferrer"
                class="text-gray-400 hover:text-blue-600">
                <InstagramIcon class="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
        <div class="mt-8 border-t border-gray-200 pt-8 text-center">
          <p class="text-gray-600">&copy; {{ currentYear }} HUSTBOOK. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/userStore'
import { useMenuState } from '../../composables/useMenuState'
import LogoutButton from '../auth/Logout.vue'
import { navItems } from '../../config/navigation'
import { useHead } from '@unhead/vue'
import SearchPosts from '../search/SearchPosts.vue'
import NotificationTab from '../notification/NotificationTab.vue'

const createAsyncComponent = (loader) => defineAsyncComponent({
  loader,
  error: () => ({ render: () => h('span', '⚠️') }),
  delay: 200,
  timeout: 3000
})

// Lazy-load icons
const HomeIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/house'))
const UserIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/user'))
const UsersIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/users'))
const MessageCircleIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/message-circle'))
const MenuIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/menu'))
const XIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/x'))
const FacebookIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/facebook'))
const TwitterIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/twitter'))
const InstagramIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/instagram'))
const CogIcon = createAsyncComponent(() => import('lucide-vue-next/dist/esm/icons/cog'))

const iconComponents = {
  HomeIcon,
  UserIcon,
  UsersIcon,
  MessageCircleIcon,
  CogIcon
}

const router = useRouter()
const userStore = useUserStore()
const { showUserMenu, showMobileMenu, toggleUserMenu, toggleMobileMenu } = useMenuState()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const currentYear = computed(() => new Date().getFullYear())

const handleLogoutSuccess = async () => {
  await userStore.logout()
  router.push('/login')
}

// SEO meta tags
useHead({
  title: 'HUSTBOOK - Connecting HUST Students and Alumni',
  meta: [
    { name: 'description', content: 'HUSTBOOK is a social networking platform for students and alumni of Hanoi University of Science and Technology.' },
    { property: 'og:title', content: 'HUSTBOOK - Connecting HUST Students and Alumni' },
    { property: 'og:description', content: 'Join HUSTBOOK to connect with fellow HUST students and alumni.' },
    { property: 'og:image', content: '/og-image.jpg' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
})
</script>

<style scoped>
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
  max-height: 300px;
  overflow: hidden;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>