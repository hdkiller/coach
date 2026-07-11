<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="p('title', 'Connect Hevy')">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            color="neutral"
            @click="
              () => {
                void goBack()
              }
            "
          >
            {{ back() }}
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-2xl mx-auto">
        <UCard>
          <template #header>
            <div class="flex items-center gap-4">
              <div
                class="w-12 h-12 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700"
              >
                <img
                  src="/images/logos/hevy-icon.png"
                  alt="Hevy Logo"
                  class="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h2 class="text-xl font-semibold">{{ p('title', 'Connect Hevy') }}</h2>
                <p class="text-sm text-muted">
                  {{ p('subtitle', 'Enter your Hevy API key to connect your account.') }}
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-6">
            <div class="bg-muted/50 p-4 rounded-lg">
              <h3 class="font-medium mb-2">Instructions</h3>
              <ol class="text-sm text-muted space-y-2">
                <li>
                  1. Go to
                  <a
                    href="https://hevy.com/settings?developer"
                    target="_blank"
                    class="text-primary hover:underline"
                    >hevy.com/settings</a
                  >
                  (Developer section)
                </li>
                <li>2. Generate or copy your API Key</li>
                <li>3. Paste it below</li>
              </ol>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">
                  API Key <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model="apiKey"
                  type="password"
                  placeholder="Enter your Hevy API key"
                  size="lg"
                />
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton to="/settings/apps" color="neutral" variant="outline">{{
                cancel()
              }}</UButton>
              <UButton
                :loading="connecting"
                :disabled="!apiKey"
                @click="
                  () => {
                    void connect()
                  }
                "
              >
                {{ p('button', 'Connect') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  const toast = useToast()
  const router = useRouter()
  const { p, back, cancel, failedTitle } = useConnectI18n('hevy')

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: () => p('title', 'Connect Hevy'),
    meta: [
      {
        name: 'description',
        content: () => p('meta', 'Connect your Hevy account to import strength training workouts.')
      }
    ]
  })

  const apiKey = ref('')
  const connecting = ref(false)

  const goBack = () => {
    router.push('/settings/apps')
  }

  const connect = async () => {
    if (!apiKey.value) {
      toast.add({
        title: p('missing_title', 'Missing Information'),
        description: p('missing_desc', 'Please enter your API key'),
        color: 'error'
      })
      return
    }

    connecting.value = true
    try {
      await $fetch('/api/integrations/hevy', {
        method: 'POST',
        body: {
          apiKey: apiKey.value
        }
      })

      // Trigger initial sync immediately
      await $fetch('/api/integrations/sync', {
        method: 'POST',
        body: {
          provider: 'hevy'
        }
      })

      toast.add({
        title: p('success_title', 'Connected!'),
        description: p('success_desc', 'Successfully connected to Hevy'),
        color: 'success'
      })

      // Navigate back to settings
      await router.push('/settings/apps')
    } catch (error: any) {
      toast.add({
        title: failedTitle(),
        description: error.data?.message || p('failed_desc', 'Failed to connect to Hevy'),
        color: 'error'
      })
    } finally {
      connecting.value = false
    }
  }
</script>
