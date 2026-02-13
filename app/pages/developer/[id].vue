<template>
  <UDashboardPanel id="developer-detail">
    <template #header>
      <UDashboardNavbar :title="app?.name || 'Loading...'">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            @click="navigateTo('/developer')"
          />
        </template>
        <template #right>
          <UButton
            label="Delete App"
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            @click="isDeleteModalOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="pending" class="p-6 space-y-8">
        <USkeleton class="h-64 w-full" />
        <USkeleton class="h-64 w-full" />
      </div>

      <div v-else-if="app" class="p-4 sm:p-6 space-y-8 max-w-4xl mx-auto">
        <!-- App Info & Logo -->
        <UCard>
          <template #header>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              Application Details
            </h3>
          </template>

          <div class="flex flex-col md:flex-row gap-8">
            <div class="flex flex-col items-center gap-4">
              <UAvatar
                :src="app.logoUrl || undefined"
                :alt="app.name"
                size="3xl"
                icon="i-heroicons-cube"
              />
              <div class="text-center">
                <UButton
                  label="Change Logo"
                  icon="i-heroicons-camera"
                  size="xs"
                  variant="outline"
                  @click="triggerLogoUpload"
                />
                <p class="text-[10px] text-gray-500 mt-2 max-w-[120px]">
                  PNG, JPG, GIF up to 5MB. Will be resized to 512x512px.
                </p>
              </div>
              <input
                ref="logoInput"
                type="file"
                class="hidden"
                accept="image/png,image/jpeg,image/gif,image/bmp,image/tiff"
                @change="onLogoFileChange"
              />
            </div>

            <UForm
              :schema="updateAppSchema"
              :state="updateForm"
              class="flex-1 space-y-4"
              @submit="onUpdateSubmit"
            >
              <UFormField label="Name" name="name" required>
                <UInput v-model="updateForm.name" class="w-full" />
              </UFormField>

              <UFormField label="Description" name="description">
                <UTextarea v-model="updateForm.description" class="w-full" />
              </UFormField>

              <UFormField label="Homepage URL" name="homepageUrl">
                <UInput v-model="updateForm.homepageUrl" class="w-full" />
              </UFormField>

              <div class="flex justify-end">
                <UButton type="submit" label="Save Changes" color="primary" :loading="updating" />
              </div>
            </UForm>
          </div>
        </UCard>

        <!-- OAuth Credentials -->
        <UCard>
          <template #header>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              OAuth Credentials
            </h3>
          </template>

          <div class="space-y-6">
            <UFormField label="Client ID" help="Public identifier for your application.">
              <UInput
                :model-value="app.clientId"
                readonly
                icon="i-heroicons-clipboard"
                class="w-full font-mono"
                @click="copyToClipboard(app.clientId, 'Client ID')"
              />
            </UFormField>

            <UFormField
              label="Client Secret"
              help="Keep this secret! Used to authenticate your application."
            >
              <div class="flex items-center gap-2">
                <UInput
                  :model-value="generatedSecret || '••••••••••••••••••••••••••••••••'"
                  readonly
                  :type="generatedSecret ? 'text' : 'password'"
                  class="flex-1 font-mono"
                />
                <UButton
                  v-if="generatedSecret"
                  icon="i-heroicons-clipboard"
                  color="neutral"
                  variant="ghost"
                  @click="copyToClipboard(generatedSecret, 'Client Secret')"
                />
                <UButton
                  label="Regenerate"
                  icon="i-heroicons-arrow-path"
                  color="warning"
                  variant="outline"
                  @click="isRegenerateModalOpen = true"
                />
              </div>
              <div
                v-if="generatedSecret"
                class="mt-2 text-xs font-bold text-yellow-600 dark:text-yellow-400"
              >
                Make sure to copy this secret now! You won't be able to see it again.
              </div>
            </UFormField>

            <UFormField label="Redirect URIs" help="Allowed callback URLs. One per line.">
              <UTextarea
                v-model="redirectUrisString"
                placeholder="https://example.com/callback"
                class="w-full"
              />
              <div class="flex justify-end mt-2">
                <UButton
                  label="Update Redirects"
                  size="xs"
                  variant="soft"
                  :loading="updating"
                  @click="onUpdateSubmit"
                />
              </div>
            </UFormField>
          </div>
        </UCard>

        <!-- App Stats -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <UCard>
            <div class="flex items-center gap-4">
              <div class="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                <UIcon name="i-heroicons-users" class="w-6 h-6 text-primary" />
              </div>
              <div>
                <p class="text-xs text-gray-500 uppercase font-bold tracking-widest">
                  Authorized Users
                </p>
                <p class="text-2xl font-bold">{{ app._count?.consents || 0 }}</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-4">
              <div class="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <UIcon name="i-heroicons-key" class="w-6 h-6 text-neutral-500" />
              </div>
              <div>
                <p class="text-xs text-gray-500 uppercase font-bold tracking-widest">
                  Active Tokens
                </p>
                <p class="text-2xl font-bold">{{ app._count?.tokens || 0 }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Incoming Webhook -->
        <UCard>
          <template #header>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              Incoming Webhook
            </h3>
          </template>

          <div class="space-y-6">
            <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">
              You can push data to Coach Watts using our generic webhook endpoint. We capture the
              raw request body and associate it with your application.
            </p>

            <UFormField label="Webhook URL" help="Your unique endpoint for pushing data.">
              <UInput
                :model-value="`https://coachwatts.com/api/webhooks/oauth/${app.clientId}`"
                readonly
                icon="i-heroicons-link"
                class="w-full font-mono"
                @click="
                  copyToClipboard(
                    `https://coachwatts.com/api/webhooks/oauth/${app.clientId}`,
                    'Webhook URL'
                  )
                "
              />
            </UFormField>

            <UFormField
              label="Webhook Secret"
              help="Used to sign or validate your webhook requests. Include this in your 'X-Webhook-Secret' header."
            >
              <div class="flex items-center gap-2">
                <UInput
                  :model-value="
                    generatedWebhookSecret ||
                    (app.webhookSecret ? '••••••••••••••••••••••••••••••••' : '')
                  "
                  placeholder="No secret generated yet"
                  readonly
                  :type="generatedWebhookSecret ? 'text' : 'password'"
                  class="flex-1 font-mono"
                />
                <UButton
                  v-if="generatedWebhookSecret || app.webhookSecret"
                  icon="i-heroicons-clipboard"
                  color="neutral"
                  variant="ghost"
                  @click="
                    copyToClipboard(generatedWebhookSecret || app.webhookSecret, 'Webhook Secret')
                  "
                />
                <UButton
                  :label="app.webhookSecret ? 'Regenerate' : 'Generate Secret'"
                  :icon="app.webhookSecret ? 'i-heroicons-arrow-path' : 'i-heroicons-plus'"
                  color="neutral"
                  variant="outline"
                  @click="isRegenerateWebhookModalOpen = true"
                />
              </div>
            </UFormField>

            <div class="flex justify-end pt-4">
              <UButton
                label="View Recent Logs"
                icon="i-heroicons-list-bullet"
                color="primary"
                variant="soft"
                @click="isLogsModalOpen = true"
              />
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Webhook Logs Modal -->
  <UModal
    v-model:open="isLogsModalOpen"
    title="Recent Webhook Logs"
    :ui="{ content: 'sm:max-w-4xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div v-if="loadingLogs" class="flex justify-center py-12">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
        </div>
        <div v-else-if="!logs?.length" class="text-center py-12 text-gray-500">
          No logs found for this application.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr class="text-left text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                <th class="pb-2 px-2">Time</th>
                <th class="pb-2 px-2">Status</th>
                <th class="pb-2 px-2">Secret</th>
                <th class="pb-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
              <template v-for="log in logs" :key="log.id">
                <tr class="text-sm">
                  <td class="py-3 px-2 whitespace-nowrap text-gray-500 font-medium">
                    {{ new Date(log.createdAt).toLocaleString() }}
                  </td>
                  <td class="py-3 px-2">
                    <UBadge
                      :color="log.status === 'PROCESSED' ? 'success' : 'error'"
                      variant="subtle"
                      size="xs"
                    >
                      {{ log.status }}
                    </UBadge>
                  </td>
                  <td class="py-3 px-2">
                    <UBadge
                      :color="log.error === 'SECRET_MATCHED' ? 'success' : 'warning'"
                      variant="soft"
                      size="xs"
                      class="font-mono"
                    >
                      {{ log.error || 'NONE' }}
                    </UBadge>
                  </td>
                  <td class="py-3 px-2 text-right">
                    <UButton
                      label="Inspect"
                      variant="ghost"
                      size="xs"
                      @click="selectedLog = selectedLog?.id === log.id ? null : log"
                    />
                  </td>
                </tr>
                <tr v-if="selectedLog?.id === log.id">
                  <td colspan="4" class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div class="space-y-4">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1">
                          <p class="text-[10px] font-bold text-gray-500 uppercase">Headers</p>
                          <div
                            class="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded overflow-auto max-h-48"
                          >
                            <pre class="text-[10px] font-mono">{{
                              JSON.stringify(log.headers, null, 2)
                            }}</pre>
                          </div>
                        </div>
                        <div class="space-y-1">
                          <p class="text-[10px] font-bold text-gray-500 uppercase">Query</p>
                          <div
                            class="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded overflow-auto max-h-48"
                          >
                            <pre class="text-[10px] font-mono">{{
                              JSON.stringify(log.query, null, 2)
                            }}</pre>
                          </div>
                        </div>
                      </div>
                      <div class="space-y-1">
                        <p class="text-[10px] font-bold text-gray-500 uppercase">Payload</p>
                        <div
                          class="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded overflow-auto max-h-96"
                        >
                          <VueJsonPretty
                            :data="log.payload"
                            :deep="2"
                            show-length
                            show-line
                            class="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between items-center w-full">
        <p class="text-[10px] text-gray-500">Showing last 50 requests</p>
        <UButton label="Close" color="neutral" variant="ghost" @click="isLogsModalOpen = false" />
      </div>
    </template>
  </UModal>

  <!-- Regenerate Secret Modal -->
  <UModal v-model:open="isRegenerateModalOpen" title="Regenerate Client Secret">
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">
        Are you sure you want to regenerate the client secret?
        <strong class="text-red-500">The old secret will stop working immediately.</strong>
        You will need to update your application with the new secret.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="isRegenerateModalOpen = false"
        />
        <UButton
          label="Regenerate"
          color="warning"
          :loading="regenerating"
          @click="onRegenerateSecret"
        />
      </div>
    </template>
  </UModal>

  <!-- Regenerate Webhook Secret Modal -->
  <UModal
    v-model:open="isRegenerateWebhookModalOpen"
    :title="app?.webhookSecret ? 'Regenerate Webhook Secret' : 'Generate Webhook Secret'"
  >
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">
        Are you sure you want to {{ app?.webhookSecret ? 'regenerate' : 'generate' }} the webhook
        secret?
        <span v-if="app?.webhookSecret" class="text-red-500 font-bold"
          >The old secret will stop working immediately.</span
        >
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="isRegenerateWebhookModalOpen = false"
        />
        <UButton
          :label="app?.webhookSecret ? 'Regenerate' : 'Generate'"
          color="warning"
          :loading="regeneratingWebhook"
          @click="onRegenerateWebhookSecret"
        />
      </div>
    </template>
  </UModal>

  <!-- Delete Modal -->
  <UModal v-model:open="isDeleteModalOpen" title="Delete Application">
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400 font-medium">
        Are you sure you want to delete <strong>{{ app?.name }}</strong
        >? This action is permanent and will revoke access for all
        {{ app?._count?.consents }} users.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="isDeleteModalOpen = false"
        />
        <UButton
          label="Delete Permanently"
          color="error"
          :loading="deleting"
          @click="onDeleteApp"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { z } from 'zod'
  import VueJsonPretty from 'vue-json-pretty'
  import 'vue-json-pretty/lib/styles.css'

  definePageMeta({
    middleware: 'auth'
  })

  const route = useRoute()
  const toast = useToast()
  const appId = route.params.id as string

  const { data: app, pending, refresh } = await useFetch<any>(`/api/developer/apps/${appId}`)

  useHead({
    title: computed(() =>
      app.value ? `${app.value.name} | Developer Portal` : 'Developer Portal'
    ),
    meta: [
      {
        name: 'description',
        content: 'Manage your OAuth application settings and credentials.'
      }
    ]
  })

  const updating = ref(false)
  const regenerating = ref(false)
  const regeneratingWebhook = ref(false)
  const deleting = ref(false)
  const isRegenerateModalOpen = ref(false)
  const isRegenerateWebhookModalOpen = ref(false)
  const isDeleteModalOpen = ref(false)
  const isLogsModalOpen = ref(false)
  const generatedSecret = ref('')
  const generatedWebhookSecret = ref('')

  const logs = ref<any[]>([])
  const loadingLogs = ref(false)
  const selectedLog = ref<any>(null)

  const logoInput = ref<HTMLInputElement | null>(null)

  const updateAppSchema = z.object({
    name: z.string().min(3).max(50),
    description: z.string().max(500).optional(),
    homepageUrl: z.string().url().optional().or(z.literal('')),
    redirectUris: z.array(z.string().url()).min(1).max(10)
  })

  const updateForm = reactive({
    name: '',
    description: '',
    homepageUrl: '',
    redirectUris: [] as string[]
  })

  const redirectUrisString = ref('')

  watch(
    app,
    (val) => {
      if (val) {
        updateForm.name = val.name
        updateForm.description = val.description || ''
        updateForm.homepageUrl = val.homepageUrl || ''
        updateForm.redirectUris = val.redirectUris || []
        redirectUrisString.value = (val.redirectUris || []).join('\n')
      }
    },
    { immediate: true }
  )

  watch(redirectUrisString, (val) => {
    updateForm.redirectUris = val
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s !== '')
  })

  watch(isLogsModalOpen, (val) => {
    if (val) {
      fetchLogs()
    }
  })

  async function fetchLogs() {
    loadingLogs.value = true
    try {
      logs.value = await $fetch(`/api/developer/apps/${appId}/webhook-logs`)
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to fetch logs',
        color: 'error'
      })
    } finally {
      loadingLogs.value = false
    }
  }

  async function onUpdateSubmit() {
    updating.value = true
    try {
      await $fetch(`/api/developer/apps/${appId}`, {
        method: 'PATCH',
        body: updateForm
      })
      toast.add({ title: 'Success', description: 'Application updated', color: 'success' })
      refresh()
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to update application',
        color: 'error'
      })
    } finally {
      updating.value = false
    }
  }

  async function onRegenerateSecret() {
    regenerating.value = true
    try {
      const data: any = await $fetch(`/api/developer/apps/${appId}/secret`, {
        method: 'POST'
      })
      generatedSecret.value = data.clientSecret
      isRegenerateModalOpen.value = false
      toast.add({ title: 'Success', description: 'New client secret generated', color: 'success' })
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to regenerate secret',
        color: 'error'
      })
    } finally {
      regenerating.value = false
    }
  }

  async function onRegenerateWebhookSecret() {
    regeneratingWebhook.value = true
    try {
      const data: any = await $fetch(`/api/developer/apps/${appId}/webhook-secret`, {
        method: 'POST'
      })
      generatedWebhookSecret.value = data.webhookSecret
      isRegenerateWebhookModalOpen.value = false
      toast.add({ title: 'Success', description: 'Webhook secret generated', color: 'success' })
      refresh()
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to generate webhook secret',
        color: 'error'
      })
    } finally {
      regeneratingWebhook.value = false
    }
  }

  async function onDeleteApp() {
    deleting.value = true
    try {
      await $fetch(`/api/developer/apps/${appId}`, {
        method: 'DELETE'
      })
      toast.add({ title: 'Success', description: 'Application deleted', color: 'success' })
      navigateTo('/developer')
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to delete application',
        color: 'error'
      })
    } finally {
      deleting.value = false
    }
  }

  function triggerLogoUpload() {
    logoInput.value?.click()
  }

  async function onLogoFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    try {
      toast.add({
        title: 'Uploading...',
        description: 'Please wait while we upload your logo.',
        color: 'neutral'
      })
      await $fetch(`/api/developer/apps/${appId}/logo`, {
        method: 'POST',
        body: formData
      })
      toast.add({ title: 'Success', description: 'Logo updated successfully', color: 'success' })
      refresh()
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to upload logo',
        color: 'error'
      })
    }
  }

  function copyToClipboard(text: string, label: string) {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.add({
      title: 'Copied',
      description: `${label} copied to clipboard`,
      color: 'success'
    })
  }
</script>
