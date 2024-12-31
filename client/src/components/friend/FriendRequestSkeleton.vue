<template>
    <Card>
        <CardContent class="p-4">
            <!-- User Info Section -->
            <div class="flex items-center space-x-4">
                <!-- Avatar Skeleton -->
                <Skeleton class="h-12 w-12 rounded-full" />
                <!-- Name and Mutual Friends Skeleton -->
                <div class="space-y-2 flex-1">
                    <Skeleton class="h-4 w-24" />
                    <Skeleton class="h-3 w-32" />
                </div>
            </div>
            <!-- Action Buttons Skeleton -->
            <div class="mt-4 flex justify-between space-x-2">
                <Skeleton class="h-10 flex-1" />
                <Skeleton class="h-10 flex-1" />
            </div>
        </CardContent>
    </Card>
</template>

<script setup>
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
</script>