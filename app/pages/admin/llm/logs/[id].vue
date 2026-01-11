<script setup lang="ts">
  definePageMeta({
    layout: 'admin',
    middleware: ['auth', 'admin']
  })

  const route = useRoute()
  const id = route.params.id as string

  interface LlmUsage {
    id: string
    success: boolean
    createdAt: string
    model: string
    provider: string
    operation: string
    modelType: string | null
    totalTokens: number | null
    promptTokens: number | null
    completionTokens: number | null
    estimatedCost: number | null
    durationMs: number | null
    retryCount: number
    entityType: string | null
    entityId: string | null
    errorType: string | null
    errorMessage: string | null
    promptFull: string | null
    promptPreview: string | null
    responseFull: string | null
    responsePreview: string | null
    feedback: string | null
    feedbackText: string | null
    user?: {
      id: string
      name: string | null
      email: string
      image: string | null
    }
  }

  const { data, pending } = await useFetch<LlmUsage>(`/api/admin/stats/llm/${id}`)

  function formatNumber(num: number | null | undefined): string {
    if (!num || num === 0) return '0'
    return num.toLocaleString()
  }

  function formatOperation(op: string): string {
    return op
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  useHead({
    title: computed(() =>
      data.value ? `Admin: AI Log ${formatOperation(data.value.operation)}` : 'AI Log Detail'
    )
  })
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <!-- Header -->
    <div
      class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur z-10"
    >
      <div class="flex items-center gap-4">
        <UButton to="/admin/stats/llm" icon="i-lucide-arrow-left" color="neutral" variant="ghost" />
        <h1 class="text-xl font-semibold text-gray-900 dark:text-white">AI Usage Detail (Admin)</h1>
      </div>
      <div v-if="data?.user" class="flex items-center gap-2">
        <span class="text-xs text-gray-500">Requested by:</span>
        <UButton :to="`/admin/users/${data.user.id}`" color="neutral" variant="ghost" class="p-1">
          <div class="flex items-center gap-2">
            <UAvatar :src="data.user.image || undefined" :alt="data.user.name || ''" size="xs" />
            <span class="text-sm font-medium">{{ data.user.name || data.user.email }}</span>
          </div>
        </UButton>
      </div>
    </div>

    <div class="p-6 space-y-6">
      <div v-if="pending" class="flex items-center justify-center p-12">
        <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-gray-400" />
      </div>

      <template v-else-if="data">
        <!-- Main Stats Card -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon
                  :name="data.success ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                  :class="data.success ? 'text-green-500' : 'text-red-500'"
                  class="w-6 h-6"
                />
                <div>
                  <h2 class="text-xl font-bold">{{ formatOperation(data.operation) }}</h2>
                  <p class="text-sm text-gray-500">
                    {{ new Date(data.createdAt).toLocaleString() }}
                  </p>
                </div>
              </div>
              <UBadge :color="data.success ? 'success' : 'error'" variant="subtle">
                {{ data.success ? 'Success' : 'Failed' }}
              </UBadge>
            </div>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Model
              </div>
              <div class="font-semibold">{{ data.model }}</div>
              <UBadge v-if="data.modelType" color="neutral" size="xs" class="mt-1">{{
                data.modelType
              }}</UBadge>
            </div>

            <div>
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Tokens
              </div>
              <div class="font-semibold">{{ formatNumber(data.totalTokens) }}</div>
              <div class="text-xs text-gray-500">
                {{ data.promptTokens }} in / {{ data.completionTokens }} out
              </div>
            </div>

            <div>
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cost</div>
              <div class="font-semibold font-mono text-emerald-600">
                ${{ (data.estimatedCost || 0).toFixed(5) }}
              </div>
            </div>

            <div>
              <div class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                Duration
              </div>
              <div class="font-semibold">{{ ((data.durationMs || 0) / 1000).toFixed(2) }}s</div>
              <div v-if="data.retryCount > 0" class="text-xs text-orange-500">
                {{ data.retryCount }} retries
              </div>
            </div>
          </div>
        </UCard>

        <!-- Error Details (if failed) -->
        <UCard
          v-if="!data.success"
          class="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/10"
        >
          <template #header>
            <div class="flex items-center gap-2 text-red-600">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5" />
              <h2 class="text-lg font-semibold">Error Details</h2>
            </div>
          </template>
          <div class="space-y-4">
            <div>
              <div class="text-xs font-bold text-gray-500 uppercase mb-1">Error Type</div>
              <UBadge color="error" variant="soft">{{ data.errorType || 'Unknown' }}</UBadge>
            </div>
            <div>
              <div class="text-xs font-bold text-gray-500 uppercase mb-1">Message</div>
              <pre
                class="text-sm bg-white dark:bg-gray-900 p-4 rounded border border-red-100 dark:border-red-900 whitespace-pre-wrap font-mono text-red-600"
                >{{ data.errorMessage }}</pre
              >
            </div>
          </div>
        </UCard>

        <!-- Prompt Content -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-message-square" class="w-5 h-5 text-blue-500" />
              <h2 class="text-lg font-semibold">Prompt</h2>
            </div>
          </template>
          <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <pre class="text-sm whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">{{
              data.promptFull || data.promptPreview
            }}</pre>
          </div>
          <p
            v-if="!data.promptFull && data.promptPreview"
            class="mt-2 text-xs text-amber-500 italic"
          >
            Showing preview only (500 chars).
          </p>
        </UCard>

        <!-- Response Content -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-message-circle" class="w-5 h-5 text-green-500" />
              <h2 class="text-lg font-semibold">AI Response</h2>
            </div>
          </template>
          <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <pre class="text-sm whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">{{
              data.responseFull || data.responsePreview
            }}</pre>
          </div>
          <p
            v-if="!data.responseFull && data.responsePreview"
            class="mt-2 text-xs text-amber-500 italic"
          >
            Showing preview only (500 chars).
          </p>
        </UCard>

        <!-- Feedback -->
        <UCard v-if="data.feedback">
          <template #header>
            <h3 class="font-semibold">User Feedback</h3>
          </template>
          <div class="flex items-start gap-4">
            <UIcon
              :name="data.feedback === 'THUMBS_UP' ? 'i-lucide-thumbs-up' : 'i-lucide-thumbs-down'"
              :class="data.feedback === 'THUMBS_UP' ? 'text-green-500' : 'text-red-500'"
              class="w-6 h-6 mt-1"
            />
            <div>
              <div class="font-medium text-sm capitalize">
                {{ data.feedback.toLowerCase().replace('_', ' ') }}
              </div>
              <p
                v-if="data.feedbackText"
                class="text-sm text-gray-600 dark:text-gray-400 mt-1 italic"
              >
                "{{ data.feedbackText }}"
              </p>
            </div>
          </div>
        </UCard>
      </template>

      <UCard v-else>
        <div class="text-center py-12">
          <p class="text-gray-500">AI log record not found.</p>
        </div>
      </UCard>
    </div>
  </div>
</template>
