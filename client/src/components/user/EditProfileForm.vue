<template>
    <Card>
        <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent>
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <!-- Avatar Upload -->
                <div class="space-y-2">
                    <Label>Avatar</Label>
                    <div class="flex items-center gap-4">
                        <Avatar class="w-20 h-20">
                            <AvatarImage v-if="avatarPreview" :src="avatarPreview" />
                            <AvatarFallback>
                                {{
                                    form.userName
                                        ? form.userName
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)
                                        : "U"
                                }}
                            </AvatarFallback>
                        </Avatar>
                        <div class="flex-1">
                            <div class="flex gap-2">
                                <Input type="file" accept="image/*" @change="handleAvatarUpload"
                                    :disabled="isLoading" />
                                <Button v-if="form.avatar || form.existingAvatar" variant="outline" size="sm"
                                    @click="removeAvatar" :disabled="isLoading">
                                    <Trash2 class="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                            <p class="text-sm text-muted-foreground mt-1">
                                Recommended size: 400x400px
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Cover Photo Upload -->
                <div class="space-y-2">
                    <Label>Cover Photo</Label>
                    <div class="relative aspect-[3/1] bg-muted rounded-lg overflow-hidden">
                        <img v-if="coverPhotoPreview" :src="coverPhotoPreview" alt="Cover photo"
                            class="w-full h-full object-cover" />
                        <div class="absolute inset-0 flex items-center justify-center">
                            <div class="flex gap-2">
                                <Button variant="secondary">
                                    <label class="cursor-pointer">
                                        <Input type="file" accept="image/*" @change="handleCoverUpload"
                                            :disabled="isLoading" class="hidden" />
                                        <Upload class="w-4 h-4 mr-2" />
                                        Select image
                                    </label>
                                </Button>
                                <Button v-if="form.coverPhoto || form.existingCoverPhoto" variant="destructive"
                                    @click="removeCoverPhoto" :disabled="isLoading">
                                    <Trash2 class="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                    <p class="text-sm text-muted-foreground">
                        Recommended size: 1500x500px
                    </p>
                </div>

                <div class="space-y-2">
                    <Label for="userName">Username</Label>
                    <Input id="userName" v-model="form.userName" :disabled="isLoading" placeholder="Enter your username"
                        :error="errors.userName" />
                    <p v-if="errors.userName" class="text-sm text-destructive">
                        {{ errors.userName }}
                    </p>
                </div>

                <div class="space-y-2">
                    <Label for="bio">Bio</Label>
                    <Textarea id="bio" v-model="form.bio" :disabled="isLoading" placeholder="Tell us about yourself"
                        :error="errors.bio" />
                    <p v-if="errors.bio" class="text-sm text-destructive">
                        {{ errors.bio }}
                    </p>
                </div>

                <div class="space-y-2">
                    <Label for="address">Address</Label>
                    <Input id="address" v-model="form.address" :disabled="isLoading" placeholder="Enter your address"
                        :error="errors.address" />
                    <p v-if="errors.address" class="text-sm text-destructive">
                        {{ errors.address }}
                    </p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="city">City</Label>
                        <Input id="city" v-model="form.city" :disabled="isLoading" placeholder="Enter your city"
                            :error="errors.city" />
                        <p v-if="errors.city" class="text-sm text-destructive">
                            {{ errors.city }}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <Label for="country">Country</Label>
                        <Input id="country" v-model="form.country" :disabled="isLoading"
                            placeholder="Enter your country" :error="errors.country" />
                        <p v-if="errors.country" class="text-sm text-destructive">
                            {{ errors.country }}
                        </p>
                    </div>
                </div>

                <Alert v-if="error" variant="destructive" class="mt-4">
                    <AlertCircle class="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{{ error }}</AlertDescription>
                </Alert>

                <div class="flex justify-end space-x-4 mt-6">
                    <Button type="button" variant="outline" :disabled="isLoading" @click="resetForm">
                        Cancel
                    </Button>
                    <Button type="submit" :disabled="isLoading ||
                        !isFormValid ||
                        formState.pendingUploads ||
                        !hasChanges
                        ">
                        <Loader2Icon v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
                        {{
                            formState.pendingUploads
                                ? "Processing uploads..."
                                : isLoading
                                    ? "Saving..."
                                    : "Save Changes"
                        }}
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>
</template>

<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from "vue";
import { debounce } from "lodash-es";
import { storeToRefs } from "pinia";
import { onBeforeRouteLeave } from "vue-router";
import { useUserStore } from "@/stores/userStore";
import { useToast } from "@/components/ui/toast";
import { AlertCircle, Loader2Icon } from "lucide-vue-next";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { AvatarImage, Avatar, AvatarFallback } from "../ui/avatar";
import { Trash2, Upload } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "vue-router";
import logger from "@/services/logging";
import { useImageProcessing } from "@/composables/useImageProcessing";

// Initialize stores and composables
const userStore = useUserStore();
const { toast } = useToast();
const router = useRouter();
const { compressImage } = useImageProcessing();

// Form state
const defaultFormState = {
    userName: "",
    bio: "",
    address: "",
    city: "",
    country: "",
    avatar: null,
    coverPhoto: null,
    existingAvatar: "",
    existingCoverPhoto: "",
};

const form = ref({ ...defaultFormState });
const initialForm = ref({ ...defaultFormState });
const currentVersion = ref(0);
const errors = ref({});
const isLoading = ref(false);
const error = ref(null);
const formState = ref({
    isDirty: false,
    pendingUploads: false,
});

// Validation rules
const validators = {
    userName: (value) => {
        if (!value?.trim()) return "Username is required";
        if (value.length < 2) return "Username must be at least 2 characters";
        if (value.length > 50) return "Username must be less than 50 characters";
        if (!/^[\p{L}\s]*$/u.test(value))
            return "Username can only contain letters and spaces";
        return null;
    },
    bio: (value) => {
        if (value?.length > 200) return "Bio cannot exceed 200 characters";
        return null;
    },
    address: (value) => {
        if (value?.length > 100) return "Address cannot exceed 100 characters";
        return null;
    },
    city: (value) => {
        if (value?.length > 50) return "City cannot exceed 50 characters";
        return null;
    },
    country: (value) => {
        if (value?.length > 50) return "Country cannot exceed 50 characters";
        return null;
    },
};

// Validate form fields
const validateField = (field, value) => {
    if (validators[field]) {
        const error = validators[field](value);
        errors.value[field] = error;
        if (error) {
            toast({
                type: "warning",
                title: "Validation Error",
                description: `${field}: ${error}`,
            });
        }
    }
};

const userNameLowerCase = computed(() => {
    if (!form.value.userName) return [];
    const name = form.value.userName.toLowerCase().trim();
    const variations = [name];
    const parts = name.split(" ");
    for (let i = 1; i <= parts.length; i++) {
        variations.push(parts.slice(0, i).join(" "));
    }
    return [...new Set(variations)];
});

// Computed values
const isFormValid = computed(() => {
    return (
        !Object.values(errors.value).some((error) => error) &&
        form.value.userName?.trim().length >= 3
    );
});

// Methods
const handleAvatarUpload = debounce(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        formState.value.pendingUploads = true;
        const compressedFile = await compressImage(file, 400, 400, 0.8);
        if (compressedFile) {
            form.value.avatar = compressedFile;
            formState.value.isDirty = true;
        }
    } catch (err) {
        toast({
            type: "error",
            title: "Error",
            description: "Cannot process avatar image",
        });
    }
}, 500);

const handleCoverUpload = debounce(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        formState.value.pendingUploads = true;
        const compressedFile = await compressImage(file, 1500, 500, 0.8);
        if (compressedFile) {
            form.value.coverPhoto = compressedFile;
            formState.value.isDirty = true;
        }
    } catch (err) {
        toast({
            type: "error",
            title: "Error",
            description: "Cannot process cover photo",
        });
    } finally {
        formState.value.pendingUploads = false;
    }
}, 500);

const resetForm = () => {
    form.value = { ...initialForm.value };
    errors.value = {};
    error.value = null;
};

const handleSubmit = async () => {
    if (isLoading.value || formState.value.pendingUploads || !hasChanges.value) {
        return;
    }

    try {
        isLoading.value = true;
        error.value = null;

        // Validate
        const validationErrors = {};
        Object.keys(validators).forEach((field) => {
            const error = validators[field]?.(form.value[field]);
            if (error) validationErrors[field] = error;
        });

        if (Object.keys(validationErrors).length > 0) {
            errors.value = validationErrors;
            toast({
                type: "warning",
                description: "Please fix validation errors",
            });
            return;
        }

        const userId = userStore.userData?.userId;
        if (!userId) throw new Error("User ID not found");

        const updateData = {
            userName: form.value.userName,
            bio: form.value.bio,
            address: form.value.address,
            city: form.value.city,
            country: form.value.country,
            version: form.value.version || currentVersion.value,
        };

        // Chỉ thêm files nếu có thay đổi
        if (form.value.avatar) updateData.avatar = form.value.avatar;
        if (form.value.coverPhoto) updateData.coverPhoto = form.value.coverPhoto;
        if (form.value.existingAvatar === "") updateData.existingAvatar = "";
        if (form.value.existingCoverPhoto === "")
            updateData.existingCoverPhoto = "";

        let result = null;
        let retries = 3;

        while (retries > 0) {
            try {
                result = await userStore.updateUserProfile(userId, updateData);
                if (result && result.data) {
                    form.value.version = result.data.version;
                    initialForm.value.version = result.data.version;
                }
                break;
            } catch (err) {
                if (err.message?.includes("concurrent modifications") && retries > 1) {
                    const userData = await userStore.getUserProfile();
                    updateData.version = userData.version;
                    form.value.version = userData.version;
                    retries--;
                    continue;
                }
                throw err;
            }
        }

        if (result) {
            // Reset form state with updated data
            form.value = {
                userName: result.data.userName || "",
                bio: result.data.bio || "",
                address: result.data.address || "",
                city: result.data.city || "",
                country: result.data.country || "",
                avatar: null,
                coverPhoto: null,
                existingAvatar: result.data.avatar || "",
                existingCoverPhoto: result.data.coverPhoto || "",
            };

            currentVersion.value = result.data.version;
            initialForm.value = { ...form.value };
            formState.value.isDirty = false;

            await userStore.fetchUserProfile();

            toast({
                title: "Success",
                description: "Profile updated successfully",
            });
        }
    } catch (err) {
        error.value = err.message || "Update failed";
        toast({
            title: "Error",
            description: error.value,
            variant: "destructive",
        });
    } finally {
        isLoading.value = false;
    }
};

// Load initial data
const loadUserData = async () => {
    try {
        isLoading.value = true;
        const userData = await userStore.getUserProfile();

        if (userData) {
            form.value = {
                userName: userData.userName || "",
                bio: userData.bio || "",
                address: userData.address || "",
                city: userData.city || "",
                country: userData.country || "",
                avatar: null,
                coverPhoto: null,
                existingAvatar: userData.avatar || "",
                existingCoverPhoto: userData.coverPhoto || "",
                version: userData.version || 0,
            };

            currentVersion.value = userData.version || 0;
            initialForm.value = { ...form.value };
        }
    } catch (err) {
        error.value = "Cannot load user data";
        toast({
            title: "Error",
            description: error.value,
            variant: "destructive",
        });
    } finally {
        isLoading.value = false;
    }
};

const debouncedValidation = debounce((newValues) => {
    const errors = {};
    // Validate all fields at once
    Object.keys(validators).forEach((field) => {
        if (validators[field] && newValues[field] !== undefined) {
            const error = validators[field](newValues[field]);
            if (error) errors[field] = error;
        }
    });

    // Only update errors if there are any changes
    if (Object.keys(errors).length > 0) {
        errors.value = errors;
    }
}, 300);

watch(
    [form],
    () => {
        formState.value.isDirty = hasChanges.value;
    },
    { deep: true }
);

watch(() => userStore.userData?.version, async (newVersion) => {
    if (newVersion !== undefined && newVersion !== currentVersion.value) {
        await loadUserData();
    }
});

const hasChanges = computed(() => {
    const basicFieldsChanged = Object.keys(form.value).some(
        (key) => form.value[key] !== initialForm.value[key]
    );

    return basicFieldsChanged || form.value.avatar || form.value.coverPhoto;
});

const avatarPreview = computed(() => {
    if (form.value.avatar instanceof File) {
        return URL.createObjectURL(form.value.avatar);
    }
    return form.value.existingAvatar || "";
});

const coverPhotoPreview = computed(() => {
    if (form.value.coverPhoto instanceof File) {
        return URL.createObjectURL(form.value.coverPhoto);
    }
    return form.value.existingCoverPhoto || "";
});

const hasFormChanged = computed(() => {
    const formKeys = Object.keys(form.value).filter(
        (key) => key !== "avatar" && key !== "coverPhoto"
    );

    const hasBasicFieldsChanged = formKeys.some(
        (key) => form.value[key] !== initialForm.value[key]
    );

    const hasNewFiles = form.value.avatar || form.value.coverPhoto;

    return hasBasicFieldsChanged || hasNewFiles;
});

// Lifecycle hooks
onMounted(async () => {
    await loadUserData();
});

// Handle unsaved changes
onBeforeRouteLeave((to, from, next) => {
    if (hasFormChanged.value && !isLoading.value) {
        const confirmed = window.confirm(
            "You have unsaved changes. Are you sure you want to leave?"
        );
        next(confirmed);
    } else {
        next();
    }
});

onBeforeUnmount(() => {
    if (avatarPreview.value?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview.value);
    }
    if (coverPhotoPreview.value?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPhotoPreview.value);
    }
    // Cancel any pending debounced operations
    debouncedValidation.cancel();
    handleAvatarUpload.cancel();
    handleCoverUpload.cancel();
});

const removeAvatar = () => {
    form.value.avatar = null;
    form.value.existingAvatar = "";
};

const removeCoverPhoto = () => {
    form.value.coverPhoto = null;
    form.value.existingCoverPhoto = "";
};
</script>
