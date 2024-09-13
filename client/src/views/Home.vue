<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold mb-4">Welcome to HustBook</h1>
    <p class="mb-4">This is a clone of Facebook for educational purposes.</p>
    <button @click="showSignUp = true" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      Sign Up
    </button>
    <SignUp v-if="showSignUp" @close="showSignUp = false" />
  </div>
</template>

<script>
import SignUp from '../components/SignUp.vue'

export default {
  name: 'Home',
  components: {
    SignUp
  },
  data() {
    return {
      showSignUp: false
    }
  }
}
</script>