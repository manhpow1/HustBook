<template>
  <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">Login</h2>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="phonenumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
        <input v-model="phonenumber" type="tel" id="phonenumber" required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          :class="{ 'border-red-500': phoneError }" />
        <p v-if="phoneError" class="mt-2 text-sm text-red-600">{{ phoneError }}</p>
      </div>
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input v-model="password" type="password" id="password" required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          :class="{ 'border-red-500': passwordError }" />
        <p v-if="passwordError" class="mt-2 text-sm text-red-600">{{ passwordError }}</p>
      </div>
      <button type="submit" :disabled="isLoading"
        class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
        {{ isLoading ? 'Logging in...' : 'Log In' }}
      </button>
    </form>

    <!-- Success message -->
    <div v-if="loginSuccess" class="mt-4 p-4 bg-green-100 rounded-md">
      <p class="text-green-700">Login successful! Redirecting...</p>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="mt-4 p-4 bg-red-100 rounded-md">
      <p class="text-red-700">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      phonenumber: "",
      password: "",
      phoneError: "",
      passwordError: "",
      isLoading: false,
      loginSuccess: false,
      errorMessage: "",
      sendDeviceId: true,
    };
  },
  methods: {
    validatePhone() {
      console.log("Validating phone:", this.phonenumber);
      if (!this.phonenumber) {
        this.phoneError = "Phone number is required";
        return false;
      }
      if (!/^0\d{9}$/.test(this.phonenumber)) {
        this.phoneError = "Invalid phone number format";
        return false;
      }
      this.phoneError = "";
      return true;
    },
    validatePassword() {
      console.log("Validating password:", this.password);
      if (!this.password) {
        this.passwordError = "Password is required";
        return false;
      }
      if (this.password.length < 6 || this.password.length > 10) {
        this.passwordError = "Password must be 6-10 characters long and not match the phone number";
        return false;
      }
      if (this.password === this.phonenumber) {
        this.passwordError = "Password must not match the phone number";
        return false;
      }
      this.passwordError = "";
      return true;
    },
    async handleSubmit() {
      console.log("handleSubmit called");
      this.phoneError = "";
      this.passwordError = "";
      this.errorMessage = "";
      this.loginSuccess = false;

      const phoneValid = this.validatePhone();
      const passwordValid = this.validatePassword();

      console.log("Validation results:", { phoneValid, passwordValid });

      if (!phoneValid || !passwordValid) {
        console.log("Validation failed, not making API call");
        return;
      }

      this.isLoading = true;
      try {
        console.log("Attempting to make API call");
        const response = await axios.post(
          "http://localhost:3000/api/auth/login",
          {
            phonenumber: this.phonenumber,
            password: this.password,
            deviceId: this.sendDeviceId ? "device-uuid" : undefined
          }
        );
        console.log("API call successful", response.data);

        if (response.data.code === "1000") {
          this.loginSuccess = true;
          this.$emit("login-success", response.data.data);
          setTimeout(() => {
            // Navigate to home page after 2 seconds
            this.$router.push('/');
          }, 2000);
        } else {
          this.errorMessage = response.data.message;
          this.$emit("login-error", response.data.message);
        }
      } catch (error) {
        console.error("Login error:", error);
        if (error.response) {
          console.log("Error with response:", error.response.data);
          this.errorMessage = error.response.data.message;
          this.$emit("login-error", error.response.data.message);
        } else if (error.request) {
          console.log("Network error detected");
          this.errorMessage = "Unable to connect to the Internet";
          this.$emit("login-error", "Unable to connect to the Internet");
        } else {
          console.log("Unexpected error:", error.message);
          this.errorMessage = "An unexpected error occurred. Please try again.";
          this.$emit("login-error", "An unexpected error occurred. Please try again.");
        }
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>