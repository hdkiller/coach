<template>
  <UDashboardPanel id="developer">
    <template #header>
      <UDashboardNavbar title="Developer Portal">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            label="Create New App"
            icon="i-heroicons-plus"
            color="primary"
            @click="isCreateModalOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 sm:p-6 space-y-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Your OAuth Applications</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Build integrations that access Coach Watts user data securely.
          </p>
        </div>

        <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <USkeleton v-for="i in 3" :key="i" class="h-48 w-full" />
        </div>

        <div
          v-else-if="apps && apps.length === 0"
          class="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl"
        >
          <UIcon
            name="i-heroicons-cube"
            class="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4"
          />
          <h3 class="text-lg font-medium text-gray-900 dark:text-white">No applications yet</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Start by creating your first OAuth application.
          </p>
          <UButton
            label="Create New App"
            icon="i-heroicons-plus"
            color="primary"
            variant="ghost"
            class="mt-4"
            @click="isCreateModalOpen = true"
          />
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UCard
            v-for="app in apps"
            :key="app.id"
            class="flex flex-col hover:ring-2 hover:ring-primary-500 transition-shadow cursor-pointer"
            @click="navigateTo(`/developer/${app.id}`)"
          >
            <div class="flex items-start gap-4">
              <UAvatar
                :src="app.logoUrl || undefined"
                :alt="app.name"
                size="lg"
                icon="i-heroicons-cube"
              />
              <div class="min-w-0">
                <h3 class="font-bold text-gray-900 dark:text-white truncate">{{ app.name }}</h3>
                <p class="text-xs text-gray-500 truncate font-mono">{{ app.clientId }}</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-4 line-clamp-2 min-h-[3rem]">
              {{ app.description || 'No description provided.' }}
            </p>
            <template #footer>
              <div class="flex items-center justify-between">
                <UBadge :color="app.isPublic ? 'success' : 'neutral'" variant="subtle">
                  {{ app.isPublic ? 'Public' : 'Private' }}
                </UBadge>
                <span class="text-xs text-gray-400 font-medium"
                  >{{ app._count?.consents || 0 }} users</span
                >
              </div>
            </template>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create App Modal -->
  <UModal
    v-model:open="isCreateModalOpen"
    title="Create New Application"
    description="Dialog content and actions."
  >
    <template #body>
      <UForm
        :schema="createAppSchema"
        :state="createForm"
        class="space-y-4"
        @submit="onCreateSubmit"
      >
        <UFormField label="Name" name="name" required>
          <UInput v-model="createForm.name" placeholder="My Awesome App" />
        </UFormField>

        <UFormField label="Description" name="description">
          <UTextarea
            v-model="createForm.description"
            placeholder="A short description of what your app does."
          />
        </UFormField>

        <UFormField label="Homepage URL" name="homepageUrl">
          <UInput v-model="createForm.homepageUrl" placeholder="https://example.com" />
        </UFormField>

        <UFormField
          label="Redirect URIs"
          name="redirectUris"
          help="One URL per line. Must be valid URLs."
          required
        >
          <UTextarea v-model="redirectUrisString" placeholder="https://example.com/callback" />
        </UFormField>

        <div class="flex justify-end gap-3 mt-6">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="isCreateModalOpen = false"
          />
          <UButton type="submit" label="Create Application" color="primary" :loading="creating" />
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- Success Modal for Client Secret -->
  <UModal
    v-model:open="isSuccessModalOpen"
    title="Application Created Successfully"
    description="Dialog content and actions."
  >
    <template #body>
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        title="Save your Client Secret!"
        description="For security reasons, we only show this secret once. If you lose it, you will have to regenerate it."
        class="mb-6"
      />

      <div class="space-y-4">
        <UFormField label="Client ID">
          <UInput
            :model-value="newApp?.clientId"
            readonly
            icon="i-heroicons-clipboard"
            @click="copyToClipboard(newApp?.clientId, 'Client ID')"
          />
        </UFormField>

        <UFormField label="Client Secret">
          <UInput
            :model-value="newApp?.clientSecret"
            readonly
            :type="isKeyVisible ? 'text' : 'password'"
            icon="i-heroicons-clipboard"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="ghost"
                :icon="isKeyVisible ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                size="xs"
                @click="isKeyVisible = !isKeyVisible"
              />
            </template>
          </UInput>
        </UFormField>
        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-heroicons-clipboard"
            size="sm"
            @click="copyToClipboard(newApp?.clientSecret, 'Client Secret')"
          >
            Copy Secret
          </UButton>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton
        label="I have saved the secret"
        color="primary"
        block
        @click="isSuccessModalOpen = false"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { z } from 'zod'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Developer Portal',
    meta: [
      {
        name: 'description',
        content: 'Manage your OAuth applications and build integrations with Coach Watts.'
      }
    ]
  })

  const toast = useToast()

  const { data: apps, pending, refresh } = await useFetch<any[]>('/api/developer/apps')

  const isCreateModalOpen = ref(false)
  const isSuccessModalOpen = ref(false)
  const creating = ref(false)
  const isKeyVisible = ref(false)
  const newApp = ref<any>(null)

  const createAppSchema = z.object({
    name: z.string().min(3).max(50),
    description: z.string().max(500).optional(),
    homepageUrl: z.string().url().optional().or(z.literal('')),
    redirectUris: z.array(z.string().url()).min(1).max(10)
  })

  const createForm = reactive({
    name: '',
    description: '',
    homepageUrl: '',
    redirectUris: [] as string[]
  })

  const redirectUrisString = ref('')

  watch(redirectUrisString, (val) => {
    createForm.redirectUris = val
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s !== '')
  })

  async function onCreateSubmit() {
    creating.value = true
    try {
      const data = await $fetch('/api/developer/apps', {
        method: 'POST',
        body: createForm
      })

      newApp.value = data
      isCreateModalOpen.value = false
      isSuccessModalOpen.value = true
      refresh()

      // Reset form
      createForm.name = ''
      createForm.description = ''
      createForm.homepageUrl = ''
      createForm.redirectUris = []
      redirectUrisString.value = ''
    } catch (error: any) {
      toast.add({
        title: 'Error',
        description: error.data?.message || 'Failed to create application',
        color: 'error'
      })
    } finally {
      creating.value = false
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
