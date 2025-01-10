<template>
  <div class="flex items-center justify-center min-h-screen bg-background">
    <Card class="w-full max-w-md mx-auto">
      <CardHeader>
        <img
          class="mx-auto h-12 w-auto mb-6"
          src="../../assets/logo.svg"
          alt="HUSTBOOK"
        />
        <CardTitle
          class="text-2xl text-center flex items-center justify-center"
        >
          <UserPlus class="w-6 h-6 mr-2 text-primary" />
          Complete Your Profile
        </CardTitle>
        <CardDescription class="text-center">
          Please provide your information to complete the signup process
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
          <FormField v-slot="{ messages }" name="userName">
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  v-model="userName"
                  type="text"
                  :disabled="isLoading"
                  @blur="validateUserNameField"
                  placeholder="Enter your username"
                >
                  <template #prefix>
                    <User class="h-4 w-4 text-muted-foreground" />
                  </template>
                  <template #suffix>
                    <XCircle
                      v-if="userNameError"
                      class="h-4 w-4 text-destructive cursor-pointer"
                      @click="userName = ''"
                    />
                    <CheckCircle
                      v-else-if="userName && userName.length >= 3"
                      class="h-4 w-4 text-success"
                    />
                  </template>
                </Input>
              </FormControl>
              <FormMessage>{{ userNameError }}</FormMessage>
            </FormItem>
          </FormField>

          <FormField name="avatar">
            <FormItem>
              <FormLabel>Avatar</FormLabel>
              <FormControl>
                <div class="flex items-center space-x-4">
                  <Avatar v-if="avatarPreview">
                    <AvatarImage :src="avatarPreview" alt="Avatar preview" />
                    <AvatarFallback>{{
                      userName?.charAt(0)?.toUpperCase()
                    }}</AvatarFallback>
                  </Avatar>

                  <Button variant="outline" as="label" for="avatar-upload">
                    <Upload class="h-4 w-4 mr-2" />
                    {{ avatar ? "Change" : "Upload" }}
                    <input
                      id="avatar-upload"
                      type="file"
                      @change="handleFileChange"
                      accept="image/*"
                      class="sr-only"
                    />
                  </Button>

                  <Button
                    v-if="avatar"
                    variant="destructive"
                    size="icon"
                    @click="removeAvatar"
                  >
                    <Trash class="h-4 w-4" />
                  </Button>
                </div>
              </FormControl>
              <FormMessage>{{ avatarError }}</FormMessage>
            </FormItem>
          </FormField>

          <Button
            type="submit"
            class="w-full"
            :disabled="isLoading || !!userNameError"
            :loading="isLoading"
          >
            <UserPlus v-if="!isLoading" class="h-4 w-4 mr-2" />
            {{ isLoading ? "Updating..." : "Update Profile" }}
          </Button>
        </form>

        <Alert v-if="successMessage" variant="success" class="mt-4">
          <CheckCircle class="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{{ successMessage }}</AlertDescription>
        </Alert>

        <Alert v-if="errorMessage" variant="destructive" class="mt-4">
          <AlertCircle class="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {{ errorMessage }}
            <div
              v-if="errorMessage.includes('File upload failed')"
              class="mt-4 space-x-2"
            >
              <Button variant="secondary" @click="continueWithoutAvatar">
                <ArrowRight class="h-4 w-4 mr-2" />
                Continue without avatar
              </Button>
              <Button variant="outline" @click="retryUpload">
                <RefreshCw class="h-4 w-4 mr-2" />
                Try again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "../../stores/userStore";
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Upload,
  User,
  Trash,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-vue-next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useFormValidation } from "../../composables/useFormValidation";
import { useImageProcessing } from "../../composables/useImageProcessing";
import { sanitizeInput } from "../../utils/sanitize";
import { useToast } from "../ui/toast";
import { storeToRefs } from "pinia";
import logger from "@/services/logging";

const router = useRouter();
const userStore = useUserStore();
const { toast } = useToast();
const { validateField } = useFormValidation();
const {
  compressImage,
  validateImage,
  isProcessing: isCompressing,
} = useImageProcessing();

// Local state
const userName = ref("");
const error = ref(null);

// Store refs
const {
  user,
  isLoading,
  error: errorMessage,
  successMessage,
} = storeToRefs(userStore);
const userNameError = ref("");
const avatar = ref(null);
const avatarPreview = ref("");
const avatarError = ref("");

const { validateUsername } = useFormValidation();

const validateUserNameField = () => {
  try {
    userNameError.value = validateUsername(userName.value) || "";
  } catch (err) {
    logger.error("Username validation error:", err);
    userNameError.value = "Error validating username";
  }
};

const handleFileChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    // Validate file type and size
    if (!validateImage(file)) {
      event.target.value = "";
      toast({
        type: "error",
        title: "Invalid Image",
        description:
          "Please select a valid image file (jpg, png, gif under 5MB)",
      });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview.value = e.target.result;
    };
    reader.readAsDataURL(file);

    // Compress image
    const compressedFile = await compressImage(file);
    if (compressedFile) {
      const compressedSize = compressedFile.size / (1024 * 1024); // Size in MB
      avatar.value = compressedFile;
      avatarError.value = "";

      toast({
        type: "success",
        title: "Success",
        description: `Image processed successfully (${compressedSize.toFixed(
          2
        )}MB)`,
      });
    } else {
      removeAvatar();
      toast({
        type: "error",
        title: "Error",
        description: "Failed to process image. Please try a different file.",
      });
    }
  } catch (error) {
    logger.error("File handling error:", error);
    removeAvatar();
    toast({
      type: "error",
      title: "Error",
      description:
        error.message || "Failed to process image file. Please try again.",
    });
  } finally {
    // Reset file input if there was an error
    if (!avatar.value) {
      event.target.value = "";
    }
  }
};

const removeAvatar = () => {
  avatar.value = null;
  avatarPreview.value = "";
  avatarError.value = "";
  const fileInput = document.getElementById("avatar-upload");
  if (fileInput) fileInput.value = "";
};

const handleSubmit = async () => {
  if (isLoading.value) return;

  try {
    isLoading.value = true;
    error.value = null;
    errorMessage.value = null;

    if (!userName.value?.trim()) {
      toast({
        title: "Error",
        description: "Username is required",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("userName", userName.value.trim());

    if (avatar.value) {
      // Validate file size before upload
      if (avatar.value.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Avatar file must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      formData.append("avatar", avatar.value);
    }

    const response = await userStore.updateProfile(
      userName.value.trim(),
      avatar.value
    );

    if (response?.success) {
      toast({
        title: "Success",
        description: "Profile updated successfully",
        variant: "success",
      });

      router.push({ name: "Home" });
    }
  } catch (err) {
    errorMessage.value = err.message || "Failed to update profile";
    logger.error("Profile update error:", err);

    let errorMessage = "Failed to update profile";

    // Handle specific error cases
    if (err.code === "9999" && err.message.includes("Avatar")) {
      errorMessage = "Failed to upload avatar. Please try a different image.";
    } else if (err.code === "1003") {
      errorMessage = "Please wait a moment before trying again";
    }

    toast({
      title: "Error",
      description: errorMessage,
      variant: "destructive",
    });
  } finally {
    isLoading.value = false;
  }
};

const continueWithoutAvatar = () => {
  removeAvatar();
  handleSubmit();
};

const retryUpload = () => {
  avatarError.value = "";
  const fileInput = document.getElementById("avatar-upload");
  if (fileInput) fileInput.value = "";
};

onMounted(() => {
  if (!userStore.isLoggedIn) {
    router.push({ name: "Login" });
    return;
  }

  if (user.value) {
    userName.value = user.value.userName || "";
    if (user.value.avatar) {
      avatarPreview.value = user.value.avatar;
    }
  }
});

watch(
  () => errorMessage.value,
  (newError) => {
    if (newError) {
      toast({
        type: "error",
        title: "Error",
        description: newError,
      });
    }
  }
);

watch(
  () => successMessage.value,
  (newSuccess) => {
    if (newSuccess) {
      toast({
        type: "success",
        title: "Success",
        description: newSuccess,
      });
    }
  }
);
</script>

<style scoped>
input:focus,
button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
}

button .animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
