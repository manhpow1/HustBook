<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header
      class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav class="container flex h-16 items-center gap-4">
        <div class="flex items-center gap-4 flex-shrink-0">
          <router-link to="/" aria-label="Home">
            <img class="h-8 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
          </router-link>

          <SearchPosts class="hidden sm:block w-[300px]" />
        </div>

        <div class="flex-1 flex items-center justify-end gap-4">
          <NavigationMenu v-if="isLoggedIn" class="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem v-for="item in navItems" :key="item.path">
                <NavigationMenuLink :href="item.path" :aria-label="item.name">
                  <component :is="iconComponents[item.icon]" class="h-4 w-4 mr-2" aria-hidden="true" />
                  {{ item.name }}
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <NotificationTab v-if="isLoggedIn" />

          <div class="hidden md:flex items-center gap-4" v-if="isLoggedIn">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar>
                  <AvatarImage :src="user?.avatar" :alt="user?.userName || 'User avatar'" />
                  <AvatarFallback>
                    <User class="h-4 w-4" aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <router-link to="/profile">Profile</router-link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <router-link to="/settings">Settings</router-link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @click="handleLogout">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <template v-else>
            <Button variant="outline" asChild>
              <router-link to="/login">Sign In</router-link>
            </Button>
            <Button asChild>
              <router-link to="/signup">Sign Up</router-link>
            </Button>
          </template>

          <Sheet>
            <SheetTrigger class="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu class="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" class="w-72">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav class="flex flex-col space-y-4 mt-4">
                <SearchPosts class="w-full mb-4 sm:hidden" />
                <template v-if="isLoggedIn">
                  <router-link v-for="item in navItems" :key="item.path" :to="item.path"
                    class="flex items-center p-2 hover:bg-accent rounded-md">
                    <component :is="iconComponents[item.icon]" class="h-4 w-4 mr-2" />
                    {{ item.name }}
                  </router-link>
                  <NotificationTab />
                </template>
                <template v-else>
                  <Button variant="outline" class="w-full" asChild>
                    <router-link to="/login">Login</router-link>
                  </Button>
                  <Button class="w-full" asChild>
                    <router-link to="/signup">Signup</router-link>
                  </Button>
                </template>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="flex-1 container py-6">
      <slot></slot>
    </main>

    <!-- Footer -->
    <footer class="border-t bg-background">
      <div class="container py-8">
        <div class="grid gap-8 md:grid-cols-3">
          <div>
            <h3 class="font-semibold mb-4">About HUSTBOOK</h3>
            <p class="text-muted-foreground">Connecting students and alumni from HUST.</p>
          </div>
          <div>
            <h3 class="font-semibold mb-4">Quick Links</h3>
            <ul class="space-y-2">
              <li>
                <router-link to="/privacy" class="hover:underline">Privacy Policy</router-link>
              </li>
              <li>
                <router-link to="/terms" class="hover:underline">Terms of Service</router-link>
              </li>
              <li>
                <router-link to="/contact" class="hover:underline">Contact Us</router-link>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="font-semibold mb-4">Follow Us</h3>
            <div class="flex space-x-4">
              <Button variant="ghost" size="icon" asChild>
                <a href="https://facebook.com/hustbook" target="_blank" rel="noopener noreferrer">
                  <Facebook class="h-5 w-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://twitter.com/hustbook" target="_blank" rel="noopener noreferrer">
                  <Twitter class="h-5 w-5" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a href="https://instagram.com/hustbook" target="_blank" rel="noopener noreferrer">
                  <Instagram class="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t text-center text-muted-foreground">
          <p>&copy; {{ currentYear }} HUSTBOOK. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { storeToRefs } from 'pinia'
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'
import { navItems } from '@/config/navigation'
import SearchPosts from '@/components/search/SearchPosts.vue'
import NotificationTab from '@/components/notification/NotificationTab.vue'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
// Icons
import { Home, User, Users, MessageCircle, Settings, Facebook, Twitter, Instagram, Menu } from 'lucide-vue-next'

const iconComponents = { Home, User, Users, MessageCircle, Settings };

const userStore = useUserStore()
const router = useRouter()
const { isLoggedIn, user } = storeToRefs(userStore)
const currentYear = computed(() => new Date().getFullYear())

const handleLogout = async () => {
  try {
    await userStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// SEO
useHead({
  title: 'HUSTBOOK - Connecting HUST Students and Alumni',
  meta: [
    {
      name: 'description',
      content: 'HUSTBOOK is a social networking platform for students and alumni of Hanoi University of Science and Technology.'
    },
    {
      property: 'og:title',
      content: 'HUSTBOOK - Connecting HUST Students and Alumni'
    },
    {
      property: 'og:description',
      content: 'Join HUSTBOOK to connect with fellow HUST students and alumni.'
    },
    {
      property: 'og:image',
      content: '/og-image.jpg'
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image'
    }
  ]
})
</script>