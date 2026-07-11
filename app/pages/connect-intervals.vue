<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="p('title', 'Connect Intervals.icu')">
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
                class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center overflow-hidden"
              >
                <img
                  src="/images/logos/intervals.png"
                  alt="Intervals.icu Logo"
                  class="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h2 class="text-xl font-semibold">{{ p('title', 'Connect Intervals.icu') }}</h2>
                <p class="text-sm text-muted">
                  {{
                    p('subtitle', 'Enter your Intervals.icu credentials to connect your account.')
                  }}
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
                    href="https://intervals.icu/settings"
                    target="_blank"
                    class="text-primary hover:underline"
                    >intervals.icu/settings</a
                  >
                </li>
                <li>2. Note your Athlete ID shown at the top (e.g., "i12345")</li>
                <li>3. Scroll to the "API Key" section and copy your API key</li>
                <li>4. Paste both values below</li>
              </ol>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">
                  Athlete ID <span class="text-red-500">*</span>
                </label>
                <UInput v-model="athleteId" placeholder="e.g., i12345" size="lg" />
                <p class="text-xs text-muted mt-1">
                  Shown at the top of intervals.icu/settings page
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium mb-2">
                  API Key <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  size="lg"
                />
                <p class="text-xs text-muted mt-1">
                  Find this in the "API Key" section at intervals.icu/settings
                </p>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton to="/dashboard" color="neutral" variant="outline">{{ cancel() }}</UButton>
              <UButton
                :loading="connecting"
                :disabled="!apiKey || !athleteId"
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
  const { p, back, cancel, failedTitle } = useConnectI18n('intervals')

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: () => p('title', 'Connect Intervals.icu'),
    meta: [
      {
        name: 'description',
        content: () =>
          p('meta', 'Connect your Intervals.icu account to import activities and training data.')
      }
    ]
  })

  const athleteId = ref('')
  const apiKey = ref('')
  const connecting = ref(false)

  const goBack = () => {
    router.push('/dashboard')
  }

  const connect = async () => {
    if (!athleteId.value || !apiKey.value) {
      toast.add({
        title: p('missing_title', 'Missing Information'),
        description: p('missing_desc', 'Please enter both your Athlete ID and API key'),
        color: 'error'
      })
      return
    }

    connecting.value = true
    try {
      const result = await $fetch('/api/integrations/intervals', {
        method: 'POST',
        body: {
          apiKey: apiKey.value,
          athleteId: athleteId.value || undefined
        }
      })

      // Trigger initial sync immediately
      await $fetch('/api/integrations/sync', {
        method: 'POST',
        body: {
          provider: 'intervals'
        }
      })

      toast.add({
        title: p('success_title', 'Connected!'),
        description: `Successfully connected to Intervals.icu as ${result.athlete.name}`,
        color: 'success'
      })

      // Navigate back to dashboard
      await router.push('/dashboard')
    } catch (error: any) {
      toast.add({
        title: failedTitle(),
        description: error.data?.message || p('failed_desc', 'Failed to connect to Intervals.icu'),
        color: 'error'
      })
    } finally {
      connecting.value = false
    }
  }
</script>
