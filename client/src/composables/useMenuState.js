import { ref } from 'vue'

export function useMenuState() {
    const showUserMenu = ref(false)
    const showMobileMenu = ref(false)

    const toggleUserMenu = () => {
        showUserMenu.value = !showUserMenu.value
    }

    const toggleMobileMenu = () => {
        showMobileMenu.value = !showMobileMenu.value
    }

    return {
        showUserMenu,
        showMobileMenu,
        toggleUserMenu,
        toggleMobileMenu
    }
}