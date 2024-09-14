<template>
    <div class="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
        <h2 class="text-2xl font-bold mb-4 text-gray-800">Get Verification Code</h2>
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
                <label for="phonenumber" class="block text-sm font-medium text-gray-700">Phone Number</label>
                <input v-model="phonenumber" type="tel" id="phonenumber" required
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    :class="{ 'border-red-500': phoneError }" />
                <p v-if="phoneError" class="mt-2 text-sm text-red-600">{{ phoneError }}</p>
            </div>
            <button type="submit" :disabled="isButtonDisabled"
                class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                {{ isLoading ? 'Sending...' : 'Get Verification Code' }}
            </button>
        </form>
        <div v-if="successMessage" class="mt-4 p-4 bg-green-100 rounded-md">
            <p class="text-green-700">{{ successMessage }}</p>
        </div>
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
            phoneError: "",
            isLoading: false,
            successMessage: "",
            errorMessage: "",
            cooldownTime: 0,
        };
    },
    computed: {
        isButtonDisabled() {
            return this.isLoading || this.cooldownTime > 0;
        }
    },
    methods: {
        validatePhone() {
            console.log("validatePhone called with:", this.phonenumber);
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
        async handleSubmit() {
            console.log("handleSubmit called");
            this.phoneError = "";
            this.errorMessage = "";
            this.successMessage = "";

            if (!this.validatePhone()) {
                console.log("Phone validation failed");
                return;
            }

            if (this.cooldownTime > 0) {
                console.log("Cooldown active, preventing request");
                this.errorMessage = `Please wait ${this.cooldownTime} seconds before requesting a new code.`;
                return;
            }

            this.isLoading = true;
            try {
                console.log("Sending request to server");
                const response = await axios.post("http://localhost:3000/api/auth/get_verify_code", { phonenumber: this.phonenumber });

                console.log("API Response:", response.data);

                if (response.data.code === "1000") {
                    this.successMessage = `Verification code sent successfully. (Code: ${response.data.data.verifyCode})`;
                    this.startCooldown();
                } else {
                    this.errorMessage = response.data.message || "Unknown error occurred";
                }
            } catch (error) {
                console.error("Error getting verification code:", error);
                if (error.response && error.response.data) {
                    this.errorMessage = error.response.data.message || "Server error occurred";
                } else if (error.request) {
                    this.errorMessage = "Unable to connect to the server";
                } else {
                    this.errorMessage = "An unexpected error occurred. Please try again.";
                }
            } finally {
                this.isLoading = false;
            }
            console.log("Updated component data:", this.$data);
        },
        startCooldown() {
            console.log("startCooldown called");
            this.cooldownTime = 120;
            const timer = setInterval(() => {
                this.cooldownTime--;
                console.log("Cooldown time:", this.cooldownTime);
                if (this.cooldownTime <= 0) {
                    clearInterval(timer);
                    this.cooldownTime = 0;
                }
            }, 1000);
        }
    },
};
</script>