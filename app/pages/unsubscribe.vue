<script setup lang="ts">
  const route = useRoute()
  const token = route.query.token as string
  const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
  const message = ref('')

  definePageMeta({
    layout: 'simple',
    auth: false // Publicly accessible
  })

  useHead({
    title: 'Unsubscribe'
  })

  async function handleUnsubscribe() {
    if (!token) {
      status.value = 'error'
      message.value = 'Invalid unsubscribe link.'
      return
    }

    status.value = 'loading'
    try {
      const response = await $fetch<any>('/api/auth/unsubscribe', {
        method: 'POST',
        body: { token }
      })

      if (response.success) {
        status.value = 'success'
        message.value = response.message
      }
    } catch (err: any) {
      status.value = 'error'
      message.value = err.data?.statusMessage || 'An error occurred while processing your request.'
    }
  }

  // Auto-trigger if token is present
  onMounted(() => {
    if (token) {
      handleUnsubscribe()
    } else {
      status.value = 'error'
      message.value = 'No unsubscribe token provided.'
    }
  })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="max-w-md w-full text-center">
      <div class="mb-8">
        <img src="/media/logo.webp" alt="Coach Watts" class="h-16 mx-auto" />
      </div>

      <UCard>
        <template #header>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Email Subscriptions</h1>
        </template>

        <div class="py-4">
          <div v-if="status === 'loading'" class="flex flex-col items-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-12 h-12 animate-spin text-primary-500 mb-4"
            />
            <p class="text-gray-600 dark:text-gray-400">Processing your request...</p>
          </div>

          <div v-else-if="status === 'success'" class="space-y-4">
            <div class="flex justify-center">
              <div class="bg-success-100 dark:bg-success-900/30 p-3 rounded-full">
                <UIcon
                  name="i-heroicons-check-circle"
                  class="w-12 h-12 text-success-600 dark:text-success-400"
                />
              </div>
            </div>
            <p class="text-lg font-medium text-gray-900 dark:text-white">{{ message }}</p>
            <p class="text-sm text-gray-500">
              You can always update your preferences later in your profile settings.
            </p>
            <div class="pt-4">
              <UButton to="/dashboard" color="neutral" variant="outline">Go to Dashboard</UButton>
            </div>
          </div>

          <div v-else-if="status === 'error'" class="space-y-4">
            <div class="flex justify-center">
              <div class="bg-error-100 dark:bg-error-900/30 p-3 rounded-full">
                <UIcon
                  name="i-heroicons-exclamation-circle"
                  class="w-12 h-12 text-error-600 dark:text-error-400"
                />
              </div>
            </div>
            <p class="text-lg font-medium text-gray-900 dark:text-white">Unsubscribe Failed</p>
            <p class="text-sm text-gray-500">{{ message }}</p>
            <div class="pt-4">
              <UButton to="/login" color="primary">Login to Settings</UButton>
            </div>
          </div>
        </div>
      </UCard>

      <p class="mt-8 text-xs text-gray-400">Coach Watts AI Powered Endurance Coaching</p>
    </div>
  </div>
</template>
