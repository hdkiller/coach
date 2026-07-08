<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Loading shared nutrition data...
        </p>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-12">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 max-w-md mx-auto">
        <UIcon
          name="i-heroicons-exclamation-triangle"
          class="w-12 h-12 text-red-500 mx-auto mb-4"
        />
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unavailable</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">{{ error }}</p>
        <UButton to="/" color="primary" variant="solid">Go Home</UButton>
      </div>
    </div>

    <div v-else-if="nutrition" class="space-y-6">
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <UAvatar :src="user?.image || undefined" :alt="user?.name || 'User'" size="xs" />
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ user?.name || 'Coach Wattz User' }} shared their nutrition
              </span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Daily Nutrition</h1>
            <div class="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div class="flex items-center gap-1">
                <span class="i-heroicons-calendar w-4 h-4" />
                {{ formatDate(nutrition.date) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-if="nutrition.calories != null"
          class="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/30 rounded-lg p-6 shadow-sm border border-orange-200 dark:border-orange-800/30"
        >
          <div class="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {{ nutrition.calories }}
          </div>
          <div class="text-sm text-orange-700 dark:text-orange-300 mt-1">Calories</div>
        </div>

        <div
          v-if="nutrition.protein != null"
          class="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 rounded-lg p-6 shadow-sm border border-red-200 dark:border-red-800/30"
        >
          <div class="text-3xl font-bold text-red-900 dark:text-red-100">
            {{ Math.round(nutrition.protein) }}g
          </div>
          <div class="text-sm text-red-700 dark:text-red-300 mt-1">Protein</div>
        </div>

        <div
          v-if="nutrition.carbs != null"
          class="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/30 rounded-lg p-6 shadow-sm border border-amber-200 dark:border-amber-800/30"
        >
          <div class="text-3xl font-bold text-amber-900 dark:text-amber-100">
            {{ Math.round(nutrition.carbs) }}g
          </div>
          <div class="text-sm text-amber-700 dark:text-amber-300 mt-1">Carbs</div>
        </div>

        <div
          v-if="nutrition.fat != null"
          class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-lg p-6 shadow-sm border border-blue-200 dark:border-blue-800/30"
        >
          <div class="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {{ Math.round(nutrition.fat) }}g
          </div>
          <div class="text-sm text-blue-700 dark:text-blue-300 mt-1">Fat</div>
        </div>
      </div>

      <UCard
        v-if="nutrition.overallScore != null"
        :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
      >
        <template #header>
          <h3 class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white">
            Nutrition Scores
          </h3>
        </template>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div v-if="nutrition.overallScore != null">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ nutrition.overallScore }}%
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Overall</div>
          </div>
          <div v-if="nutrition.macroBalanceScore != null">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ nutrition.macroBalanceScore }}%
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Macro Balance</div>
          </div>
          <div v-if="nutrition.qualityScore != null">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ nutrition.qualityScore }}%
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Quality</div>
          </div>
          <div v-if="nutrition.hydrationScore != null">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ nutrition.hydrationScore }}%
            </div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Hydration</div>
          </div>
        </div>
      </UCard>

      <UCard
        v-if="nutrition.aiAnalysis"
        :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cpu-chip" class="size-4 text-primary-500" />
            <h2
              class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
            >
              AI Analysis
            </h2>
          </div>
        </template>
        <p class="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {{ nutrition.aiAnalysis }}
        </p>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  const { formatDateTime } = useFormat()

  definePageMeta({
    layout: 'share'
  })

  const route = useRoute()
  const token = route.params.token as string

  const {
    data: shareData,
    pending: loading,
    error: fetchError
  } = (await useAsyncData<any>(`share-resource-nutrition-${token}`, () =>
    ($fetch as any)(`/api/share/${token}`)
  )) as any

  const nutrition = computed(() => shareData.value?.data)
  const user = computed(() => shareData.value?.user)

  const error = computed(() => {
    if (fetchError.value) {
      return (
        fetchError.value.data?.message ||
        'Failed to load nutrition data. The link may be invalid or expired.'
      )
    }
    return null
  })

  function formatDate(date: string | Date) {
    if (!date) return ''
    return formatDateTime(date, 'EEEE, MMMM d, yyyy')
  }

  const pageTitle = computed(() =>
    nutrition.value
      ? `Daily Nutrition - ${formatDate(nutrition.value.date)} | Coach Wattz`
      : 'Shared Nutrition | Coach Wattz'
  )
  const pageDescription = computed(() => 'View shared nutrition data on Coach Wattz.')

  useHead({
    title: pageTitle,
    meta: [
      { name: 'description', content: pageDescription },
      { property: 'og:title', content: pageTitle },
      { property: 'og:description', content: pageDescription },
      { property: 'og:type', content: 'article' },
      { property: 'article:published_time', content: computed(() => nutrition.value?.date) },
      { name: 'twitter:title', content: pageTitle },
      { name: 'twitter:description', content: pageDescription }
    ]
  })
</script>
