import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SignUpPage from '../components/SignUpPage.vue'
import Login from '../components/Login.vue'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue')
    },
    {
        path: '/friends',
        name: 'Friends',
        component: () => import('../views/Friends.vue')
    },
    {
        path: '/messages',
        name: 'Messages',
        component: () => import('../views/Messages.vue')
    },
    {
        path: '/signup',
        name: 'SignUp',
        component: SignUpPage
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
  })

export default router