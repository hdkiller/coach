<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading shared wellness data...</p>
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

    <div v-else-if="wellness" class="space-y-6">
      <!-- Header Section -->
      <div
        class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <UAvatar :src="user?.image || undefined" :alt="user?.name || 'User'" size="xs" />
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {{ user?.name || 'Coach Wattz User' }} shared their wellness
              </span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Daily Wellness</h1>
            <div class="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div class="flex items-center gap-1">
                <span class="i-heroicons-calendar w-4 h-4" />
                {{ formatDate(wellness.date) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-if="wellness.recoveryScore"
          class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 rounded-lg p-6 shadow-sm border border-green-200 dark:border-green-800/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="i-heroicons-heart w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="text-3xl font-bold text-green-900 dark:text-green-100">
            {{ wellness.recoveryScore }}%
          </div>
          <div class="text-sm text-green-700 dark:text-green-300 mt-1">Recovery Score</div>
        </div>

        <div
          v-if="wellness.readiness"
          class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-lg p-6 shadow-sm border border-blue-200 dark:border-blue-800/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="i-heroicons-bolt w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {{ wellness.readiness }}{{ wellness.readiness > 10 ? '%' : '/10' }}
          </div>
          <div class="text-sm text-blue-700 dark:text-blue-300 mt-1">Readiness</div>
        </div>

        <div
          v-if="wellness.sleepHours"
          class="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/30 rounded-lg p-6 shadow-sm border border-indigo-200 dark:border-indigo-800/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="i-heroicons-moon w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div class="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
            {{ wellness.sleepHours.toFixed(1) }}h
          </div>
          <div class="text-sm text-indigo-700 dark:text-indigo-300 mt-1">Sleep Duration</div>
        </div>

        <div
          v-if="wellness.hrv"
          class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-lg p-6 shadow-sm border border-purple-200 dark:border-purple-800/30"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="i-lucide-heart-pulse w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div class="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {{ Math.round(wellness.hrv) }}
          </div>
          <div class="text-sm text-purple-700 dark:text-purple-300 mt-1">HRV (rMSSD)</div>
        </div>
      </div>

      <!-- AI Analysis Section (Read Only) -->
      <UCard
        v-if="wellness.aiAnalysisJson"
        :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-cpu-chip" class="size-4 text-primary-500" />
            <h2
              class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
            >
              AI Integrity Audit
            </h2>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Executive Summary -->
          <div
            class="p-5 bg-primary-50 dark:bg-primary-950/10 rounded-xl border border-primary-100 dark:border-primary-900/50"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <UIcon name="i-heroicons-light-bulb" class="size-5" />
                <span class="text-xs font-black uppercase tracking-widest">Executive Take</span>
              </div>
              <UBadge
                v-if="wellness.aiAnalysisJson.status"
                :class="getStatusBadgeClass(wellness.aiAnalysisJson.status)"
                variant="soft"
                size="sm"
              >
                {{ formatStatus(wellness.aiAnalysisJson.status) }}
              </UBadge>
            </div>
            <p class="text-sm leading-relaxed text-primary-900 dark:text-primary-100 font-medium">
              {{ wellness.aiAnalysisJson.executive_summary }}
            </p>
          </div>

          <!-- Analysis Sections -->
          <div
            v-if="wellness.aiAnalysisJson.sections"
            class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800"
          >
            <div
              v-for="(section, index) in wellness.aiAnalysisJson.sections"
              :key="index"
              class="space-y-3"
            >
              <div class="flex items-center justify-between">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {{ section.title }}
                </h4>
                <span
                  v-if="section.status || section.type"
                  :class="getStatusBadgeClass(section.status || section.type)"
                  class="text-[9px] font-bold uppercase tracking-tighter"
                >
                  {{ formatStatus(section.status || section.type) }}
                </span>
              </div>
              <div
                class="p-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800/50"
              >
                <ul v-if="section.analysis_points?.length" class="space-y-2">
                  <li
                    v-for="(point, pIndex) in section.analysis_points"
                    :key="pIndex"
                    class="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 leading-normal"
                  >
                    <UIcon
                      name="i-heroicons-chevron-double-right"
                      class="size-3 mt-0.5 text-primary-500 shrink-0"
                    />
                    <span>{{ point }}</span>
                  </li>
                </ul>
                <p v-else class="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {{ section.content }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Detailed Metrics Section -->
      <UCard :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }">
        <template #header>
          <h3 class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white">
            Detailed Biometrics
          </h3>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
          <!-- Heart Rate -->
          <WellnessMetricRow
            v-if="wellness.restingHr"
            label="Resting Heart Rate"
            :value="`${wellness.restingHr} bpm`"
          />
          <WellnessMetricRow
            v-if="wellness.avgSleepingHr"
            label="Avg Sleeping HR"
            :value="`${wellness.avgSleepingHr} bpm`"
          />
          <WellnessMetricRow
            v-if="wellness.hrv"
            label="HRV (rMSSD)"
            :value="`${Math.round(wellness.hrv)} ms`"
          />
          <WellnessMetricRow
            v-if="wellness.hrvSdnn"
            label="HRV SDNN"
            :value="`${Math.round(wellness.hrvSdnn)} ms`"
          />
          <WellnessMetricRow
            v-if="wellness.spO2"
            label="Blood Oxygen (SpO2)"
            :value="`${wellness.spO2.toFixed(1)}%`"
          />

          <!-- Sleep -->
          <WellnessMetricRow
            v-if="wellness.sleepHours"
            label="Sleep Duration"
            :value="`${wellness.sleepHours.toFixed(1)}h`"
          />
          <WellnessMetricRow
            v-if="wellness.sleepScore"
            label="Sleep Score"
            :value="`${wellness.sleepScore}%`"
          />
          <WellnessMetricRow
            v-if="wellness.sleepQuality"
            label="Sleep Quality"
            :value="`${wellness.sleepQuality}/10`"
          />

          <!-- Physical -->
          <WellnessMetricRow
            v-if="wellness.weight"
            label="Weight"
            :value="`${wellness.weight.toFixed(2)} kg`"
          />
          <WellnessMetricRow
            v-if="wellness.ctl"
            label="CTL (Fitness)"
            :value="wellness.ctl.toFixed(1)"
          />
          <WellnessMetricRow
            v-if="wellness.atl"
            label="ATL (Fatigue)"
            :value="wellness.atl.toFixed(1)"
          />

          <!-- Subjective -->
          <WellnessMetricRow
            v-if="wellness.soreness"
            label="Soreness"
            :value="`${wellness.soreness}/10`"
          />
          <WellnessMetricRow
            v-if="wellness.fatigue"
            label="Fatigue"
            :value="`${wellness.fatigue}/10`"
          />
          <WellnessMetricRow
            v-if="wellness.stress"
            label="Stress"
            :value="`${wellness.stress}/10`"
          />
          <WellnessMetricRow v-if="wellness.mood" label="Mood" :value="`${wellness.mood}/10`" />
          <WellnessMetricRow
            v-if="wellness.motivation"
            label="Motivation"
            :value="`${wellness.motivation}/10`"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
  const { formatDate: baseFormatDate, formatDateTime } = useFormat()

  // Public share page - accessible to everyone
  definePageMeta({
    layout: 'share'
  })

  const route = useRoute()
  const token = route.params.token as string

  const {
    data: shareData,
    pending: loading,
    error: fetchError
  } = await useFetch<any>(`/api/share/${token}`)

  const wellness = computed(() => shareData.value?.data)
  const user = computed(() => shareData.value?.user)

  const error = computed(() => {
    if (fetchError.value) {
      return (
        fetchError.value.data?.message ||
        'Failed to load wellness data. The link may be invalid or expired.'
      )
    }
    return null
  })

  // Formatters
  function formatDate(date: string | Date) {
    if (!date) return ''
    return formatDateTime(date, 'EEEE, MMMM d, yyyy')
  }

  function formatStatus(status: string) {
    if (!status) return ''
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  function getStatusBadgeClass(status: string) {
    const baseClass = 'font-black uppercase text-[10px] px-2 py-0.5'
    const normalized = (status || '').toLowerCase()
    if (normalized === 'optimal' || normalized === 'ready')
      return `${baseClass} text-green-700 dark:text-green-400`
    if (normalized === 'good') return `${baseClass} text-blue-700 dark:text-blue-400`
    if (normalized === 'caution') return `${baseClass} text-yellow-700 dark:text-yellow-400`
    if (normalized === 'attention' || normalized === 'rest_required' || normalized === 'rest')
      return `${baseClass} text-red-700 dark:text-red-400`
    return `${baseClass} text-gray-700 dark:text-gray-400`
  }

  const pageTitle = computed(() =>
    wellness.value
      ? `Daily Wellness - ${formatDate(wellness.value.date)} | Coach Wattz`
      : 'Shared Wellness | Coach Wattz'
  )
  const pageDescription = computed(() => {
    if (wellness.value) {
      const dateStr = formatDate(wellness.value.date)
      return `Check out this wellness data on Coach Wattz: ${dateStr}. Recovery: ${wellness.value.recoveryScore}%, HRV: ${Math.round(wellness.value.hrv)}ms.`.substring(
        0,
        160
      )
    }
    return 'View shared wellness data on Coach Wattz.'
  })

  useHead({
    title: pageTitle,
    meta: [
      { name: 'description', content: pageDescription },
      { property: 'og:title', content: pageTitle },
      { property: 'og:description', content: pageDescription },
      { property: 'og:type', content: 'article' },
      { property: 'article:published_time', content: computed(() => wellness.value?.date) },
      { name: 'twitter:title', content: pageTitle },
      { name: 'twitter:description', content: pageDescription }
    ]
  })
</script>
