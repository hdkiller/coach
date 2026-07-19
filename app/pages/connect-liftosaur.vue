<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="p('title', 'Connect Liftosaur')">
        <template #leading>
          <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" @click="goBack">
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
                class="w-12 h-12 rounded-lg bg-[#8356f6] flex items-center justify-center shrink-0"
              >
                <UIcon name="i-lucide-dumbbell" class="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 class="text-xl font-semibold">{{ p('title', 'Connect Liftosaur') }}</h2>
                <p class="text-sm text-muted">
                  {{
                    p(
                      'subtitle',
                      'Import completed strength workouts and optional body measurements.'
                    )
                  }}
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-6">
            <UAlert
              color="info"
              variant="soft"
              icon="i-heroicons-information-circle"
              title="Liftosaur Premium required"
              description="The Liftosaur REST API is available to accounts with an active Premium subscription."
            />

            <div class="bg-muted/50 p-4 rounded-lg">
              <h3 class="font-medium mb-2">Create an API key</h3>
              <ol class="text-sm text-muted space-y-2">
                <li>1. Open Liftosaur and go to Settings.</li>
                <li>2. Open API Keys and create a key for Coach Watts.</li>
                <li>3. Copy the key beginning with <code>lftsk_</code> and paste it below.</li>
              </ol>
              <UButton
                class="mt-3"
                color="neutral"
                variant="link"
                size="sm"
                to="https://www.liftosaur.com/doc/api"
                target="_blank"
                trailing-icon="i-heroicons-arrow-top-right-on-square"
              >
                Liftosaur API documentation
              </UButton>
            </div>

            <UForm :schema="schema" :state="state" @submit="connect">
              <UFormField name="apiKey" label="API Key" required>
                <UInput
                  v-model="state.apiKey"
                  type="password"
                  placeholder="lftsk_..."
                  size="lg"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <div class="flex justify-end gap-3 mt-6">
                <UButton to="/settings/apps" color="neutral" variant="outline">
                  {{ cancel() }}
                </UButton>
                <UButton type="submit" :loading="connecting">
                  {{ p('button', 'Connect') }}
                </UButton>
              </div>
            </UForm>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { z } from 'zod'

  const toast = useToast()
  const { p, back, cancel, failedTitle } = useConnectI18n('liftosaur')

  definePageMeta({ middleware: 'auth' })

  useHead({
    title: () => p('title', 'Connect Liftosaur'),
    meta: [
      {
        name: 'description',
        content: () =>
          p('meta', 'Connect Liftosaur to import strength workouts and body measurements.')
      }
    ]
  })

  const schema = z.object({
    apiKey: z
      .string()
      .trim()
      .startsWith('lftsk_', 'Enter a Liftosaur API key beginning with lftsk_')
  })
  const state = reactive({ apiKey: '' })
  const connecting = ref(false)

  async function goBack() {
    await navigateTo('/settings/apps')
  }

  async function connect() {
    connecting.value = true
    try {
      await $fetch('/api/integrations/liftosaur', {
        method: 'POST',
        body: { apiKey: state.apiKey }
      })

      await $fetch('/api/integrations/sync', {
        method: 'POST',
        body: { provider: 'liftosaur' }
      })

      toast.add({
        title: p('success_title', 'Connected!'),
        description: p('success_desc', 'Liftosaur is connected and the initial sync has started.'),
        color: 'success'
      })
      await navigateTo('/settings/apps')
    } catch (error: any) {
      toast.add({
        title: failedTitle(),
        description: error.data?.message || p('failed_desc', 'Failed to connect to Liftosaur'),
        color: 'error'
      })
    } finally {
      connecting.value = false
    }
  }
</script>
