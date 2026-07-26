<template>
  <div class="flex min-h-[40vh] items-center justify-center p-6">
    <div class="text-center space-y-3">
      <UIcon
        v-if="!errorMessage"
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-primary-500 mx-auto"
      />
      <UIcon v-else name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mx-auto" />
      <p class="text-sm text-muted">
        {{ errorMessage || 'Restarting onboarding…' }}
      </p>
      <div v-if="errorMessage" class="flex flex-wrap justify-center gap-2 pt-2">
        <UButton color="primary" size="sm" :loading="retrying" @click="restartOnboarding">
          Try again
        </UButton>
        <UButton color="neutral" variant="outline" size="sm" to="/dashboard">
          Go to dashboard
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  definePageMeta({
    layout: 'simple',
    middleware: 'auth'
  })

  useHead({
    title: 'Restart onboarding',
    meta: [{ name: 'robots', content: 'noindex, nofollow' }]
  })

  const route = useRoute()
  const errorMessage = ref<string | null>(null)
  const retrying = ref(false)

  async function restartOnboarding() {
    errorMessage.value = null
    retrying.value = true

    try {
      if (import.meta.client) {
        localStorage.removeItem('cw-onboarding-connect-later')
      }

      const full = route.query.full === '1' || route.query.full === 'true'

      await $fetch('/api/user/onboarding/restart', {
        method: 'POST',
        query: full ? { full: '1' } : undefined
      })

      await navigateTo('/dashboard', { replace: true })
    } catch (error: unknown) {
      console.error('Failed to restart onboarding:', error)
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { message?: string } }).data?.message
          : undefined
      errorMessage.value = message || 'Could not restart onboarding. Please try again.'
    } finally {
      retrying.value = false
    }
  }

  onMounted(() => {
    void restartOnboarding()
  })
</script>
