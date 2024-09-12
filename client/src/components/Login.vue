<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
      <h2 class="text-2xl font-bold mb-4 text-gray-800">Login</h2>
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="phonenumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            v-model="phonenumber"
            type="tel"
            id="phonenumber"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
          <input
            v-model="password"
            type="password"
            id="password"
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoading ? 'Logging in...' : 'Log In' }}
        </button>
      </form>
    </div>
  </template>
  
  <script>
  import axios from "axios";
  
  export default {
    data() {
      return {
        phonenumber: "",
        password: "",
        isLoading: false,
      };
    },
    methods: {
      async handleSubmit() {
        this.isLoading = true;
        try {
          const response = await axios.post(
            "http://localhost:3000/api/auth/login",
            {
              phonenumber: this.phonenumber,
              password: this.password,
              deviceId: "device-uuid" // You might want to generate this dynamically
            }
          );
  
          if (response.data.code === "1000") {
            // Login successful
            this.$emit("login-success", response.data.data);
            // Here you might want to store the token and redirect to home page
            // For example:
            // localStorage.setItem('token', response.data.data.token);
            // this.$router.push('/home');
          } else {
            this.$emit("login-error", response.data.message);
          }
        } catch (error) {
          console.error("Login error:", error);
          if (error.response) {
            this.$emit("login-error", error.response.data.message);
          } else if (error.request) {
            this.$emit("login-error", "An error occurred. Please try again.");
          } else {
            this.$emit("login-error", "An unexpected error occurred. Please try again.");
          }
        } finally {
          this.isLoading = false;
        }
      },
    },
  };
  </script>