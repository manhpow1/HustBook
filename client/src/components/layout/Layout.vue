<template>
  <div class="min-h-screen flex flex-col bg-background">
    <header
      class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav class="container flex h-16 items-center">
        <div class="flex items-center gap-4 flex-1 lg:flex-initial">
          <router-link to="/" aria-label="Home">
            <img class="h-8 w-auto" src="../../assets/logo.svg" alt="HUSTBOOK" />
          </router-link>
          <div class="flex-1 lg:w-auto">
            <SearchPosts />
          </div>
        </div>

        <div class="flex items-center justify-end gap-4 ml-auto">
          <NavigationMenu v-if="isLoggedIn" class="hidden xl:flex">
            <NavigationMenuList class="flex items-center gap-2 xl:gap-4 2xl:gap-6">
              <NavigationMenuItem v-for="item in navItems" :key="item.path">
                <NavigationMenuLink :href="item.path" :aria-label="item.name"
                  class="group inline-flex items-center px-2 xl:px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md transition-colors whitespace-nowrap"
                  :class="{ 'bg-accent text-accent-foreground': $route.path === item.path }">
                  <component :is="iconComponents[item.icon]"
                    class="h-4 w-4 mr-1.5 xl:mr-2.5 group-hover:text-accent-foreground transition-colors"
                    :class="{ 'text-accent-foreground': $route.path === item.path }" aria-hidden="true" />
                  {{ item.name }}
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div class="hidden xl:flex items-center gap-2 xl:gap-4" v-if="isLoggedIn">
            <NotificationTab />

            <DropdownMenu>
              <DropdownMenuTrigger class="focus:outline-none">
                <Avatar class="h-8 w-8 lg:h-9 lg:w-9 hover:ring-2 hover:ring-primary/20 transition-all">
                  <AvatarImage :src="user?.avatar" :alt="user?.userName || 'User avatar'" />
                  <AvatarFallback class="bg-primary/10">
                    <User class="h-4 w-4 text-primary" aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-56">
                <div class="flex items-center gap-2 p-2">
                  <Avatar class="h-8 w-8">
                    <AvatarImage :src="user?.avatar" :alt="user?.userName || 'User avatar'" />
                    <AvatarFallback class="bg-primary/10">
                      <User class="h-4 w-4 text-primary" aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                  <div class="flex flex-col space-y-1">
                    <p class="text-sm font-medium leading-none">{{ user?.userName }}</p>
                    <p class="text-xs leading-none text-muted-foreground">{{ user?.email }}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="cursor-pointer" asChild>
                  <router-link to="/profile" class="flex items-center">
                    <UserIcon class="mr-2 h-4 w-4" />
                    Profile
                  </router-link>
                </DropdownMenuItem>
                <DropdownMenuItem class="cursor-pointer" asChild>
                  <router-link to="/settings" class="flex items-center">
                    <Settings class="mr-2 h-4 w-4" />
                    Settings
                  </router-link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="cursor-pointer text-red-600 focus:text-red-600" @click="handleLogout">
                  <LogOut class="mr-2 h-4 w-4" />
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
            <SheetTrigger class="hidden md:block xl:hidden">
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu class="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" class="w-full max-w-xs">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav class="flex flex-col space-y-4 mt-4">
                <div class="mb-4">
                  <SearchPosts />
                </div>
                <template v-if="isLoggedIn">
                  <router-link v-for="item in navItems" :key="item.path" :to="item.path"
                    class="flex items-center px-3 py-2 hover:bg-accent rounded-md transition-colors text-sm"
                    :class="{ 'bg-accent text-accent-foreground': $route.path === item.path }">
                    <component :is="iconComponents[item.icon]" class="h-4 w-4 mr-2.5"
                      :class="{ 'text-accent-foreground': $route.path === item.path }" />
                    {{ item.name }}
                  </router-link>
                  <NotificationTab />
                </template>
                <template v-else>
                  <div class="space-y-2">
                    <Button variant="outline" class="w-full" asChild>
                      <router-link to="/login">Login</router-link>
                    </Button>
                    <Button class="w-full" asChild>
                      <router-link to="/signup">Signup</router-link>
                    </Button>
                  </div>
                </template>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>

    <main class="flex-1 container py-6">
      <slot></slot>
    </main>

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
import { computed } from "vue";
import { useUserStore } from "@/stores/userStore";
import { storeToRefs } from "pinia";
import { useHead } from "@unhead/vue";
import { useRouter } from "vue-router";
import { navItems } from "@/config/navigation";
import SearchPosts from "@/components/search/SearchPosts.vue";
import NotificationTab from "@/components/notification/NotificationTab.vue";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
// Icons
import {
  Home,
  User,
  Users,
  MessageCircle,
  Settings,
  Facebook,
  Twitter,
  Instagram,
  Menu,
} from "lucide-vue-next";

const iconComponents = { Home, User, Users, MessageCircle, Settings };

const userStore = useUserStore();
const router = useRouter();
const { isLoggedIn, user } = storeToRefs(userStore);
const currentYear = computed(() => new Date().getFullYear());

const handleLogout = async () => {
  try {
    await userStore.logout();
    router.push("/login");
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

// SEO
useHead({
  title: "HUSTBOOK - Connecting HUST Students and Alumni",
  meta: [
    {
      name: "description",
      content:
        "HUSTBOOK is a social networking platform for students and alumni of Hanoi University of Science and Technology.",
    },
    {
      property: "og:title",
      content: "HUSTBOOK - Connecting HUST Students and Alumni",
    },
    {
      property: "og:description",
      content: "Join HUSTBOOK to connect with fellow HUST students and alumni.",
    },
    {
      property: "og:image",
      content: "/og-image.jpg",
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
  ],
});
</script>
