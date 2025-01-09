import { useUserStore } from '../stores/userStore';

export const navItems = () => {
    const userStore = useUserStore();
    const userId = userStore.userData?.userId;

    return [
        { name: "Home", path: "/", icon: "HomeIcon" },
        { name: "Profile", path: userId ? `/profile/${userId}` : '/profile', icon: "UserIcon" },
        { name: "Friends", path: "/friends", icon: "UsersIcon" },
        { name: "Messages", path: "/messages", icon: "MessageCircleIcon" },
    ];
};
