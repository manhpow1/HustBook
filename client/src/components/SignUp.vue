<template>
  <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
    <h2 class="text-2xl font-bold mb-4 text-gray-800">Sign Up</h2>
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="phonenumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
        <input v-model="phonenumber" type="tel" id="phonenumber" required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          :class="{ 'border-red-500': phoneError }" />
        <p v-if="phoneError" class="mt-2 text-sm text-red-600">
          {{ phoneError }}
        </p>
      </div>
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <input v-model="password" type="password" id="password" required
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          :class="{ 'border-red-500': passwordError }" />
        <p v-if="passwordError" class="mt-2 text-sm text-red-600">
          {{ passwordError }}
        </p>
      </div>
      <button type="submit" :disabled="isLoading"
        class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
        {{ isLoading ? "Signing up..." : "Sign Up" }}
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
      phoneError: "",
      passwordError: "",
      isLoading: false,
    };
  },
  methods: {
    handleSignupSuccess(verifyCode) {
      this.signupSuccess = true;
      this.verificationCode = verifyCode;
      this.error = "";
      // Redirect to complete profile page after a short delay
      setTimeout(() => {
        this.$router.push("/complete-profile");
      }, 3000);
    },

    validatePhone() {
      if (!/^0\d{9}$/.test(this.phonenumber)) {
        this.phoneError = "Invalid phone number format";
        return false;
      }
      this.phoneError = "";
      return true;
    },
    validatePassword() {
      if (
        this.password.length < 6 ||
        this.password.length > 10 ||
        /[^a-zA-Z0-9]/.test(this.password) ||
        this.password === this.phonenumber
      ) {
        this.passwordError =
          "Password must be 6-10 characters long, contain only letters and numbers, and not match the phone number";
        return false;
      }
      this.passwordError = "";
      return true;
    },
    async handleSubmit() {
      if (!this.validatePhone() || !this.validatePassword()) {
        return;
      }

      this.isLoading = true;

      try {
        const response = await axios.post(
          "http://localhost:3000/api/auth/signup",
          {
            phonenumber: this.phonenumber,
            password: this.password,
            uuid: "device-uuid",
          }
        );

        if (response.data.code === "1000") {
          this.$emit("signup-success", response.data.data.verifyCode);
          this.clearForm();
        }
      } catch (error) {
        console.error("Error occurred:", error);
        if (error.response) {
          this.$emit("signup-error", error.response.data.message);
        } else if (error.request) {
          this.$emit("signup-error", "An error occurred. Please try again.");
        } else {
          this.$emit(
            "signup-error",
            "An unexpected error occurred. Please try again."
          );
        }
      } finally {
        this.isLoading = false;
      }
    },
    clearForm() {
      this.phonenumber = "";
      this.password = "";
      this.phoneError = "";
      this.passwordError = "";
    },
  },
};
</script>