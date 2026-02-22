<script setup lang="ts">
  import { refDebounced } from '@vueuse/core'

  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  useHead({
    title: 'AI Failed Requests'
  })

  // Options for filters
  const feedbackOptions = [
    { label: 'All Feedback', value: 'ANY' },
    { label: 'Thumbs Up', value: 'THUMBS_UP' },
    { label: 'Thumbs Down', value: 'THUMBS_DOWN' },
    { label: 'With Comment', value: 'COMMENT' }
  ]

  // Query Params State
  const page = ref(1)
  const limit = ref(20)
  const search = ref('')
  const feedback = ref(feedbackOptions[0])
  const operation = ref({ label: 'All Operations', value: '' })
  const model = ref({ label: 'All Models', value: '' })
  const userId = ref('')

  // Debounce search
  const searchDebounced = refDebounced(search, 500)

  // Fetch Data - strictly failures
  const { data, pending, refresh } = await useFetch('/api/admin/ai/logs', {
    query: computed(() => ({
      page: page.value,
      limit: limit.value,
      search: searchDebounced.value,
      feedback: feedback.value?.value === 'ANY' ? undefined : feedback.value?.value,
      operation: operation.value?.value || undefined,
      model: model.value?.value || undefined,
      status: 'failure',
      userId: userId.value || undefined
    })),
    watch: [page, limit, searchDebounced, feedback, operation, model, userId]
  })

  const operationOptions = computed(() => {
    const ops = data.value?.filters?.operations || []
    return [
      { label: 'All Operations', value: '' },
      ...ops.map((op) => ({ label: op.replace(/_/g, ' '), value: op }))
    ]
  })

  const modelOptions = computed(() => {
    const models = data.value?.filters?.models || []
    return [{ label: 'All Models', value: '' }, ...models.map((m) => ({ label: m, value: m }))]
  })

  // Table Columns
  const columns = [
    { key: 'createdAt', label: 'Time' },
    { key: 'user', label: 'User' },
    { key: 'operation', label: 'Operation' },
    { key: 'model', label: 'Model' },
    { key: 'error', label: 'Error' },
    { key: 'cost', label: 'Cost/Tokens' },
    { key: 'actions' }
  ]

  // Expand Row for details
  const expandedRows = ref<Set<string>>(new Set())
  const toggleExpand = (id: string) => {
    if (expandedRows.value.has(id)) {
      expandedRows.value.delete(id)
    } else {
      expandedRows.value.add(id)
    }
  }

  // Reset Filters
  const resetFilters = () => {
    search.value = ''
    feedback.value = feedbackOptions[0]!
    operation.value = { label: 'All Operations', value: '' }
    model.value = { label: 'All Models', value: '' }
    userId.value = ''
    page.value = 1
  }
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="`AI Failed Requests (${data?.pagination.total || 0})`">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            :loading="pending"
            @click="() => refresh()"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6">
        <UDashboardToolbar class="mb-4">
          <template #left>
            <div class="flex flex-wrap gap-4">
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Search errors..."
                class="w-64"
              />

              <USelectMenu
                v-model="operation"
                :items="operationOptions"
                option-attribute="label"
                placeholder="Operation"
                class="w-48"
              />

              <USelectMenu
                v-model="model"
                :items="modelOptions"
                option-attribute="label"
                placeholder="Model"
                class="w-48"
              />

              <UButton
                v-if="search || operation?.value || model?.value"
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="resetFilters"
              >
                Clear
              </UButton>
            </div>
          </template>
        </UDashboardToolbar>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    v-for="col in columns"
                    :key="col.key"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    :class="{
                      'text-right': col.key === 'cost' || col.key === 'actions'
                    }"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody
                class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"
              >
                <template v-for="log in data?.logs" :key="log.id">
                  <tr
                    class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    @click="toggleExpand(log.id)"
                  >
                    <td
                      class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                    >
                      <div class="flex flex-col">
                        <span>{{ new Date(log.createdAt).toLocaleDateString() }}</span>
                        <span class="text-xs">{{
                          new Date(log.createdAt).toLocaleTimeString()
                        }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <UAvatar
                          :src="log.user?.image || undefined"
                          :alt="log.user?.name || log.user?.email"
                          size="xs"
                        />
                        <div class="flex flex-col">
                          <span class="text-sm font-medium text-gray-900 dark:text-white">{{
                            log.user?.name || 'Unknown'
                          }}</span>
                          <span class="text-xs text-gray-500">{{ log.user?.email }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <UBadge color="neutral" variant="soft" size="xs" class="capitalize">
                        {{ log.operation.replace(/_/g, ' ') }}
                      </UBadge>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {{ log.model }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex flex-col max-w-xs overflow-hidden">
                        <span class="text-xs font-bold text-red-600 dark:text-red-400 truncate">{{
                          log.errorType
                        }}</span>
                        <span class="text-xs text-gray-500 truncate italic">{{
                          log.errorMessage
                        }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                      <div class="flex flex-col items-end">
                        <span class="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          ${{ (log.estimatedCost || 0).toFixed(5) }}
                        </span>
                        <span class="text-xs text-gray-500 font-mono">
                          {{ log.totalTokens?.toLocaleString() || 0 }} toks
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                      <UButton
                        :icon="
                          expandedRows.has(log.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
                        "
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        @click.stop="toggleExpand(log.id)"
                      />
                    </td>
                  </tr>
                  <!-- Details Row -->
                  <tr v-if="expandedRows.has(log.id)" class="bg-gray-50 dark:bg-gray-800/50">
                    <td colspan="7" class="p-4">
                      <div class="space-y-4">
                        <div
                          class="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800"
                        >
                          <h4
                            class="font-bold text-red-700 dark:text-red-400 text-sm mb-1 uppercase tracking-tight"
                          >
                            Full Error Message
                          </h4>
                          <pre
                            class="whitespace-pre-wrap text-xs font-mono text-red-800 dark:text-red-300"
                            >{{ log.errorMessage }}</pre
                          >
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 class="font-semibold mb-2 text-gray-700 dark:text-gray-300">
                              Request Context
                            </h4>
                            <dl class="space-y-1">
                              <div class="flex justify-between">
                                <dt class="text-gray-500">Operation:</dt>
                                <dd class="capitalize">{{ log.operation.replace(/_/g, ' ') }}</dd>
                              </div>
                              <div class="flex justify-between">
                                <dt class="text-gray-500">Model:</dt>
                                <dd class="font-mono">{{ log.model }}</dd>
                              </div>
                              <div class="flex justify-between">
                                <dt class="text-gray-500">Duration:</dt>
                                <dd class="font-mono">{{ log.durationMs }}ms</dd>
                              </div>
                              <div class="flex justify-between">
                                <dt class="text-gray-500">Log ID:</dt>
                                <dd class="font-mono text-xs">{{ log.id }}</dd>
                              </div>
                            </dl>
                          </div>
                        </div>

                        <div class="flex justify-end gap-2">
                          <UButton
                            :to="`/admin/llm/logs/${log.id}`"
                            label="View Full Log Trace"
                            color="primary"
                            variant="soft"
                            size="xs"
                            icon="i-lucide-external-link"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr v-if="!data?.logs.length && !pending">
                  <td colspan="7" class="p-8 text-center text-gray-500">
                    <UIcon name="i-lucide-search" class="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    No failed requests found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-end mt-4">
          <UPagination v-model="page" :page-count="limit" :total="data?.pagination.total || 0" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
