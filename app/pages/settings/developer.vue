<template>
  <div class="space-y-6">
    <UCard :ui="{ body: 'hidden' }">
      <template #header>
        <h2 class="text-xl font-bold uppercase tracking-tight text-gray-900 dark:text-white">
          {{ t('dev_header') }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('dev_description') }}
        </p>
      </template>
    </UCard>

    <!-- Version History Link -->
    <UCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="p-2 bg-neutral-50 dark:bg-neutral-900/20 rounded-lg shrink-0">
            <UIcon
              name="i-heroicons-list-bullet"
              class="w-6 h-6 text-neutral-600 dark:text-neutral-400"
            />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              {{ t('dev_section_version_title') }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ t('dev_section_version_desc') }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            to="/settings/changelog"
            color="neutral"
            variant="outline"
            icon="i-heroicons-list-bullet"
            size="sm"
            class="font-bold shrink-0"
          >
            {{ t('dev_button_changelog') }}
          </UButton>
          <UButton
            to="/settings/release-notes"
            color="neutral"
            variant="outline"
            icon="i-heroicons-sparkles"
            size="sm"
            class="font-bold shrink-0"
          >
            {{ t('dev_button_release_notes') }}
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Documentation Link -->
    <UCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg shrink-0">
            <UIcon
              name="i-heroicons-book-open"
              class="w-6 h-6 text-primary-600 dark:text-primary-400"
            />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              {{ t('dev_section_api_title') }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ t('dev_section_api_desc') }}
            </p>
          </div>
        </div>
        <UButton
          to="/_docs/scalar"
          target="_blank"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-top-right-on-square"
          size="sm"
          class="font-bold shrink-0"
        >
          {{ t('dev_button_view_docs') }}
        </UButton>
      </div>
    </UCard>

    <!-- Bug Reports Link -->
    <UCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg shrink-0">
            <UIcon name="i-heroicons-bug-ant" class="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              {{ t('dev_section_tickets_title') }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ t('dev_section_tickets_desc') }}
            </p>
          </div>
        </div>
        <UButton
          to="/help-center"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-right"
          size="sm"
          class="font-bold shrink-0"
        >
          {{ t('dev_button_get_help') }}
        </UButton>
      </div>
    </UCard>

    <!-- Browse Ingested Data Link -->
    <UCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg shrink-0">
            <UIcon
              name="i-heroicons-circle-stack"
              class="w-6 h-6 text-amber-600 dark:text-amber-400"
            />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              {{ t('dev_section_data_title') }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ t('dev_section_data_desc') }}
            </p>
          </div>
        </div>
        <UButton
          to="/data"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-right"
          size="sm"
          class="font-bold shrink-0"
        >
          {{ t('dev_button_view_data') }}
        </UButton>
      </div>
    </UCard>

    <!-- OAuth Developer Portal Link -->
    <UCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-3">
          <div class="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg shrink-0">
            <UIcon
              name="i-heroicons-code-bracket"
              class="w-6 h-6 text-blue-600 dark:text-blue-400"
            />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
              {{ t('dev_section_oauth_title') }}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {{ t('dev_section_oauth_desc') }}
            </p>
          </div>
        </div>
        <UButton
          to="/developer"
          color="neutral"
          variant="outline"
          icon="i-heroicons-arrow-right"
          size="sm"
          class="font-bold shrink-0"
        >
          {{ t('dev_button_open_portal') }}
        </UButton>
      </div>
    </UCard>

    <!-- API Keys List -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
            {{ t('dev_keys_header') }}
          </h3>
          <UButton
            color="primary"
            variant="solid"
            icon="i-heroicons-plus"
            size="sm"
            class="font-bold"
            @click="isCreateModalOpen = true"
          >
            {{ t('dev_button_create_key') }}
          </UButton>
        </div>
      </template>

      <div v-if="loading" class="space-y-4">
        <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
      </div>

      <div v-else-if="apiKeys.length === 0" class="py-8 text-center">
        <UIcon
          name="i-heroicons-key"
          class="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3"
        />
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('dev_keys_empty') }}
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t('dev_keys_col_name') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t('dev_keys_col_prefix') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t('dev_keys_col_last_used') }}
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                {{ t('dev_keys_col_created') }}
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="key in apiKeys" :key="key.id">
              <td
                class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"
              >
                {{ key.name }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                <code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded"
                  >{{ key.prefix }}...</code
                >
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ key.lastUsedAt ? formatDate(key.lastUsedAt) : t('dev_keys_last_used_never') }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(key.createdAt) }}
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  size="xs"
                  @click="confirmDelete(key)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Create Key Modal -->
    <UModal
      v-model:open="isCreateModalOpen"
      :title="t('dev_modal_create_title')"
      :description="t('dev_modal_create_desc')"
    >
      <template #body>
        <UFormField :label="t('dev_form_key_name')" :help="t('dev_help_key_name')">
          <UInput
            v-model="newKeyName"
            :placeholder="t('dev_form_key_placeholder')"
            @keyup.enter="createKey"
          />
        </UFormField>

        <div
          v-if="generatedKey"
          class="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-lg"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
            />
            <div>
              <p
                class="text-xs font-bold text-yellow-800 dark:text-yellow-300 uppercase tracking-tight"
              >
                {{ t('dev_modal_save_title') }}
              </p>
              <p class="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                {{ t('dev_modal_save_desc') }}
              </p>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <UInput
              readonly
              :value="generatedKey"
              class="flex-1 font-mono text-xs"
              :type="isKeyVisible ? 'text' : 'password'"
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
            <UButton
              color="neutral"
              variant="outline"
              icon="i-heroicons-clipboard"
              size="sm"
              @click="copyKey"
            >
              {{ t('quick_capture_preview_header').includes('előnézet') ? 'Másolás' : 'Copy' }}
            </UButton>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between w-full">
          <UButton
            :label="t('banner_exit')"
            color="neutral"
            variant="ghost"
            @click="closeCreateModal"
          />
          <UButton
            v-if="!generatedKey"
            :label="t('dev_button_create_key')"
            color="primary"
            :loading="creating"
            @click="createKey"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="isDeleteModalOpen"
      :title="t('dev_modal_revoke_title')"
      :description="t('dev_modal_revoke_desc')"
    >
      <template #footer>
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="isDeleteModalOpen = false"
        />
        <UButton
          :label="t('dev_button_revoke')"
          color="error"
          :loading="deleting"
          @click="deleteKey"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('settings')
  const toast = useToast()

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Developer Settings',
    meta: [
      { name: 'description', content: 'Manage your API keys and access developer documentation.' }
    ]
  })

  const loading = ref(true)
  const apiKeys = ref<any[]>([])
  const isCreateModalOpen = ref(false)
  const isDeleteModalOpen = ref(false)
  const isKeyVisible = ref(false)
  const newKeyName = ref('')
  const generatedKey = ref('')
  const keyToDelete = ref<any>(null)
  const creating = ref(false)
  const deleting = ref(false)

  async function fetchKeys() {
    loading.value = true
    try {
      apiKeys.value = await ($fetch as any)('/api/settings/api-keys')
    } catch (error) {
      console.error('Failed to fetch keys:', error)
      toast.add({ title: 'Error', description: 'Failed to load API keys', color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function createKey() {
    if (!newKeyName.value) return

    creating.value = true
    try {
      const response: any = await $fetch('/api/settings/api-keys', {
        method: 'POST',
        body: { name: newKeyName.value }
      })
      generatedKey.value = response.key
      await fetchKeys()
      toast.add({
        title: t.value('dev_toast_create_success_title'),
        description: t.value('dev_toast_create_success_desc'),
        color: 'success'
      })
    } catch (error) {
      console.error('Failed to create key:', error)
      toast.add({ title: 'Error', description: 'Failed to create API key', color: 'error' })
    } finally {
      creating.value = false
    }
  }

  function confirmDelete(key: any) {
    keyToDelete.value = key
    isDeleteModalOpen.value = true
  }

  async function deleteKey() {
    if (!keyToDelete.value) return

    deleting.value = true
    try {
      await $fetch(`/api/settings/api-keys/${keyToDelete.value.id}`, {
        method: 'DELETE'
      })
      await fetchKeys()
      isDeleteModalOpen.value = false
      toast.add({
        title: t.value('dev_toast_revoke_success_title'),
        description: t.value('dev_toast_revoke_success_desc'),
        color: 'success'
      })
    } catch (error) {
      console.error('Failed to delete key:', error)
      toast.add({ title: 'Error', description: 'Failed to revoke API key', color: 'error' })
    } finally {
      deleting.value = false
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(generatedKey.value)
    toast.add({ title: 'Copied', description: 'API key copied to clipboard', color: 'success' })
  }

  function closeCreateModal() {
    isCreateModalOpen.value = false
    generatedKey.value = ''
    newKeyName.value = ''
    isKeyVisible.value = false
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  onMounted(() => {
    fetchKeys()
  })
</script>
