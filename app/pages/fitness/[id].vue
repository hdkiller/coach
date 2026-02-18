<template>
  <UDashboardPanel id="fitness-detail">
    <template #header>
      <UDashboardNavbar :title="navTitle">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>

            <UButton
              icon="i-heroicons-share"
              color="neutral"
              variant="outline"
              size="sm"
              class="font-black uppercase tracking-widest text-[10px]"
              @click="isShareModalOpen = true"
            >
              <span class="hidden sm:inline">Share</span>
            </UButton>

            <UButton
              icon="i-heroicons-chat-bubble-left-right"
              color="primary"
              variant="solid"
              size="sm"
              class="font-black uppercase tracking-widest text-[10px]"
              @click="chatAboutWellness"
            >
              <span class="hidden sm:inline">New Chat</span>
              <span class="sm:hidden">Chat</span>
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center py-24">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <div v-else-if="error" class="p-6 text-center">
        <div
          class="p-4 bg-error-50 dark:bg-error-950/20 rounded-xl border border-error-100 dark:border-error-900/50"
        >
          <p class="text-error-600 dark:text-error-400 font-bold">{{ error }}</p>
          <UButton color="neutral" variant="ghost" to="/fitness" class="mt-4"
            >Back to Fitness</UButton
          >
        </div>
      </div>

      <div v-else-if="wellness" class="p-0 sm:p-6 space-y-4 sm:space-y-6 pb-24">
        <!-- Dashboard Branding -->
        <div class="px-4 sm:px-0">
          <div
            class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 italic mb-1"
          >
            <UIcon name="i-heroicons-calendar" class="size-3" />
            {{ formatDateUTC(wellness.date, 'EEEE, MMMM do yyyy') }}
          </div>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Daily Integrity
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Recovery Biometrics & Readiness Analysis
          </p>
        </div>

        <!-- 1. Key Metrics Summary Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 sm:px-0">
          <!-- Recovery -->
          <div
            v-if="wellness.recoveryScore"
            class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >Recovery</span
              >
              <UIcon name="i-heroicons-heart" class="size-3.5 text-green-500" />
            </div>
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {{ wellness.recoveryScore }}%
            </div>
            <div v-if="getTrend('recoveryScore')" class="mt-1 flex items-center gap-1">
              <UIcon
                :name="getTrend('recoveryScore')!.icon"
                class="size-3"
                :class="
                  getTrend('recoveryScore')!.class.includes('green')
                    ? 'text-green-500'
                    : 'text-red-500'
                "
              />
              <span
                class="text-[10px] font-bold uppercase tracking-tighter"
                :class="
                  getTrend('recoveryScore')!.class.includes('green')
                    ? 'text-green-600'
                    : 'text-red-600'
                "
              >
                {{ getTrend('recoveryScore')!.text }} vs baseline
              </span>
            </div>
          </div>

          <!-- Readiness -->
          <div
            v-if="wellness.readiness"
            class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >Readiness</span
              >
              <UIcon name="i-heroicons-bolt" class="size-3.5 text-blue-500" />
            </div>
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {{ wellness.readiness }}{{ wellness.readiness > 10 ? '%' : '' }}
            </div>
            <div v-if="getTrend('readiness')" class="mt-1 flex items-center gap-1">
              <UIcon
                :name="getTrend('readiness')!.icon"
                class="size-3"
                :class="
                  getTrend('readiness')!.class.includes('green') ? 'text-green-500' : 'text-red-500'
                "
              />
              <span
                class="text-[10px] font-bold uppercase tracking-tighter"
                :class="
                  getTrend('readiness')!.class.includes('green') ? 'text-green-600' : 'text-red-600'
                "
              >
                {{ getTrend('readiness')!.text }} vs baseline
              </span>
            </div>
          </div>

          <!-- Sleep -->
          <div
            v-if="wellness.sleepHours"
            class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >Sleep</span
              >
              <UIcon name="i-heroicons-moon" class="size-3.5 text-indigo-500" />
            </div>
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {{ wellness.sleepHours.toFixed(1)
              }}<span class="text-xs ml-1 text-gray-400 font-bold uppercase tracking-widest"
                >h</span
              >
            </div>
            <div v-if="getTrend('sleepHours')" class="mt-1 flex items-center gap-1">
              <UIcon
                :name="getTrend('sleepHours')!.icon"
                class="size-3"
                :class="
                  getTrend('sleepHours')!.class.includes('green')
                    ? 'text-green-500'
                    : 'text-red-500'
                "
              />
              <span
                class="text-[10px] font-bold uppercase tracking-tighter"
                :class="
                  getTrend('sleepHours')!.class.includes('green')
                    ? 'text-green-600'
                    : 'text-red-600'
                "
              >
                {{ getTrend('sleepHours')!.text }} vs baseline
              </span>
            </div>
          </div>

          <!-- HRV -->
          <div
            v-if="wellness.hrv"
            class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400"
                >HRV</span
              >
              <UIcon name="i-lucide-heart-pulse" class="size-3.5 text-purple-500" />
            </div>
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {{ Math.round(wellness.hrv)
              }}<span class="text-xs ml-1 text-gray-400 font-bold uppercase tracking-widest"
                >ms</span
              >
            </div>
            <div v-if="getTrend('hrv')" class="mt-1 flex items-center gap-1">
              <UIcon
                :name="getTrend('hrv')!.icon"
                class="size-3"
                :class="
                  getTrend('hrv')!.class.includes('green') ? 'text-green-500' : 'text-red-500'
                "
              />
              <span
                class="text-[10px] font-bold uppercase tracking-tighter"
                :class="
                  getTrend('hrv')!.class.includes('green') ? 'text-green-600' : 'text-red-600'
                "
              >
                {{ getTrend('hrv')!.text }} vs baseline
              </span>
            </div>
          </div>
        </div>

        <!-- 2. AI Analysis Section -->
        <UCard
          :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-cpu-chip" class="size-4 text-primary-500" />
                <h2
                  class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
                >
                  AI Integrity Audit
                </h2>
              </div>
              <UButton
                v-if="wellness.aiAnalysisStatus !== 'PROCESSING'"
                :icon="wellness.aiAnalysisJson ? 'i-heroicons-arrow-path' : 'i-heroicons-sparkles'"
                color="neutral"
                variant="ghost"
                size="xs"
                class="font-bold uppercase text-[10px] tracking-widest"
                :loading="analyzingWellness"
                @click="analyzeWellness"
              >
                {{ wellness.aiAnalysisJson ? 'Re-analyze' : 'Audit Performance' }}
              </UButton>
            </div>
          </template>

          <div v-if="wellness.aiAnalysisJson" class="space-y-6">
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

            <!-- Recommendations -->
            <div v-if="wellness.aiAnalysisJson.recommendations?.length" class="space-y-3">
              <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Protocol Adjustments
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  v-for="(rec, index) in wellness.aiAnalysisJson.recommendations"
                  :key="index"
                  class="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/40 border-l-4"
                  :class="getPriorityBorderClass(rec.priority)"
                >
                  <div class="flex items-center justify-between mb-1">
                    <h4
                      class="text-xs font-black uppercase tracking-tight text-gray-900 dark:text-white"
                    >
                      {{ rec.title }}
                    </h4>
                    <span
                      v-if="rec.priority"
                      :class="getPriorityBadgeClass(rec.priority)"
                      class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full"
                    >
                      {{ rec.priority }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-600 dark:text-gray-400 leading-normal">
                    {{ rec.description }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Detailed Sections -->
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

            <!-- Footer -->
            <div
              v-if="wellness.aiAnalyzedAt"
              class="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800"
            >
              <div class="text-[10px] font-bold uppercase text-gray-400 italic">
                Processed via System Agent v4 • {{ formatLongDate(wellness.aiAnalyzedAt) }}
              </div>
              <AiFeedback
                v-if="wellness.llmUsageId"
                :llm-usage-id="wellness.llmUsageId"
                :initial-feedback="wellness.feedback"
                :initial-feedback-text="wellness.feedbackText"
              />
            </div>
          </div>

          <div v-else-if="wellness.aiAnalysisStatus === 'PROCESSING'" class="py-12 text-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="size-8 animate-spin text-primary-500 mb-4"
            />
            <p class="text-xs font-black uppercase tracking-widest text-gray-500">
              Synthesizing Biometric Data...
            </p>
          </div>

          <div v-else class="py-12 text-center flex flex-col items-center">
            <UIcon
              name="i-heroicons-sparkles"
              class="size-12 text-gray-200 dark:text-gray-800 mb-4"
            />
            <h3 class="text-sm font-black uppercase tracking-widest text-gray-400">
              Intelligence Unavailable
            </h3>
            <p class="text-xs text-gray-500 mt-2 mb-6 max-w-xs mx-auto">
              No AI audit has been performed for this session. Run the analysis to unlock recovery
              insights.
            </p>
            <UButton
              color="primary"
              variant="solid"
              class="font-black uppercase tracking-widest text-[10px] px-6"
              @click="analyzeWellness"
              >Audit Integrity</UButton
            >
          </div>
        </UCard>

        <!-- 3. Heart Rate & Vitals -->
        <UCard
          :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
        >
          <template #header>
            <h3
              class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
            >
              Cardiovascular Detail
            </h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
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
            <WellnessMetricRow
              v-if="wellness.respiration"
              label="Respiration Rate"
              :value="`${wellness.respiration.toFixed(1)} br/min`"
            />
            <WellnessMetricRow
              v-if="wellness.systolic && wellness.diastolic"
              label="Blood Pressure"
              :value="`${wellness.systolic}/${wellness.diastolic} mmHg`"
            />
          </div>
        </UCard>

        <!-- 4. Sleep & Subjective -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <UCard :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-0' }">
            <template #header>
              <div class="px-4 sm:px-6 py-4 flex items-center justify-between">
                <h3
                  class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
                >
                  Sleep Quality
                </h3>
                <span v-if="wellness.sleepScore" class="text-xl font-black text-indigo-500"
                  >{{ wellness.sleepScore }}%</span
                >
              </div>
            </template>
            <div class="p-4 sm:p-6 space-y-4">
              <WellnessMetricRow
                v-if="wellness.sleepHours"
                label="Duration"
                :value="`${wellness.sleepHours.toFixed(1)}h`"
              />
              <WellnessMetricRow
                v-if="wellness.sleepQuality"
                label="Quality Score"
                :value="`${wellness.sleepQuality}/10`"
              />
              <SleepAnalysis v-if="sleepData" :sleep="sleepData" class="mt-6" />
            </div>
          </UCard>

          <UCard
            :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
          >
            <template #header>
              <h3
                class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
              >
                Subjective Markers
              </h3>
            </template>
            <div class="space-y-4">
              <WellnessMetricRow
                v-if="wellness.soreness"
                label="Muscle Soreness"
                :value="`${wellness.soreness}/10`"
                :sub-label="getSorenessLabel(wellness.soreness)"
              />
              <WellnessMetricRow
                v-if="wellness.fatigue"
                label="Fatigue"
                :value="`${wellness.fatigue}/10`"
                :sub-label="getFatigueLabel(wellness.fatigue)"
              />
              <WellnessMetricRow
                v-if="wellness.stress"
                label="Stress"
                :value="`${wellness.stress}/10`"
                :sub-label="getStressLabel(wellness.stress)"
              />
              <WellnessMetricRow
                v-if="wellness.mood"
                label="Mood"
                :value="`${wellness.mood}/10`"
                :sub-label="getMoodLabel(wellness.mood)"
              />
              <WellnessMetricRow
                v-if="wellness.motivation"
                label="Motivation"
                :value="`${wellness.motivation}/10`"
                :sub-label="getMotivationLabel(wellness.motivation)"
              />
            </div>
          </UCard>
        </div>

        <!-- 5. Physical Metrics -->
        <UCard
          :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
        >
          <template #header>
            <h3
              class="text-base font-black uppercase tracking-widest text-gray-900 dark:text-white"
            >
              Body Composition
            </h3>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <WellnessMetricRow
              v-if="wellness.weight"
              label="Weight"
              :value="`${wellness.weight.toFixed(2)} kg`"
            />
            <WellnessMetricRow
              v-if="wellness.bodyFat"
              label="Body Fat"
              :value="`${wellness.bodyFat.toFixed(1)}%`"
            />
            <WellnessMetricRow
              v-if="wellness.abdomen"
              label="Abdominal Circumference"
              :value="`${wellness.abdomen} cm`"
            />
            <WellnessMetricRow
              v-if="wellness.vo2max"
              label="VO2 Max"
              :value="`${wellness.vo2max.toFixed(1)}`"
            />
            <WellnessMetricRow
              v-if="wellness.skinTemp"
              label="Skin Temperature"
              :value="`${wellness.skinTemp.toFixed(1)}°C`"
            />
            <WellnessMetricRow
              v-if="wellness.menstrualPhase"
              label="Cycle Phase"
              :value="wellness.menstrualPhase"
              class="text-purple-500"
            />
          </div>
        </UCard>

        <!-- 6. Raw Technical Data -->
        <div class="space-y-4 px-4 sm:px-0">
          <JsonViewer
            v-if="wellness.rawJson"
            title="Telemetry Source (JSON)"
            :data="wellness.rawJson"
            filename="wellness-raw.json"
          />
          <JsonViewer
            v-if="wellness.history"
            title="Audit History"
            :data="wellness.history"
            filename="wellness-history.json"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Share Modal -->
  <UModal
    v-model:open="isShareModalOpen"
    title="Share Insight"
    description="Generate a transient access token to share this wellness record."
  >
    <template #body>
      <div class="space-y-4">
        <div v-if="generatingShareLink" class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
        </div>
        <div v-else-if="shareLink" class="space-y-4">
          <div
            class="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
          >
            <div class="flex gap-2">
              <UInput v-model="shareLink" readonly class="flex-1" />
              <UButton
                icon="i-heroicons-clipboard"
                color="neutral"
                variant="solid"
                @click="copyToClipboard"
              >
                Copy
              </UButton>
            </div>
          </div>
          <p
            class="text-[10px] font-bold uppercase tracking-widest text-gray-500 text-center italic"
          >
            Expires in 30 days • Read-only access
          </p>
        </div>
        <div v-else class="flex flex-col items-center justify-center py-8 text-center">
          <UIcon name="i-heroicons-link" class="size-12 text-gray-200 dark:text-gray-800 mb-4" />
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Create a secure link to share this profile.
          </p>
          <UButton
            color="primary"
            block
            :loading="generatingShareLink"
            class="font-black uppercase tracking-widest text-[10px]"
            @click="generateShareLink"
          >
            Generate Token
          </UButton>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton
        label="Dismiss"
        color="neutral"
        variant="ghost"
        block
        class="font-black uppercase tracking-widest text-[10px]"
        @click="isShareModalOpen = false"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import SleepAnalysis from '~/components/fitness/SleepAnalysis.vue'
  import JsonViewer from '~/components/JsonViewer.vue'

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  const route = useRoute()
  const toast = useToast()
  const { formatDateUTC, timezone } = useFormat()
  const wellness = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  // Feature states
  const analyzingWellness = ref(false)
  const isShareModalOpen = ref(false)
  const shareLink = ref('')
  const generatingShareLink = ref(false)

  const { refresh: refreshRuns } = useUserRuns()

  // Computed
  const navTitle = computed(() => {
    if (!wellness.value) return 'Wellness Detail'
    return formatDateUTC(wellness.value.date, 'MMM do, yyyy')
  })

  const sleepData = computed(() => {
    return wellness.value?.rawJson?.sleep || null
  })

  // Fetch wellness data
  async function fetchWellness() {
    loading.value = true
    error.value = null

    try {
      const id = route.params.id as string
      wellness.value = await $fetch(`/api/wellness/${id}`)
    } catch (e: any) {
      console.error('Error fetching wellness:', e)
      error.value = e.data?.message || e.message || 'Failed to load wellness data'
    } finally {
      loading.value = false
    }
  }

  // Share functionality
  const generateShareLink = async () => {
    if (!wellness.value?.id) return

    generatingShareLink.value = true
    try {
      const response = await $fetch('/api/share/generate', {
        method: 'POST',
        body: {
          resourceType: 'WELLNESS',
          resourceId: wellness.value.id
        }
      })
      shareLink.value = response.url
    } catch (error) {
      console.error('Failed to generate share link:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to generate share link. Please try again.',
        color: 'error'
      })
    } finally {
      generatingShareLink.value = false
    }
  }

  const copyToClipboard = () => {
    if (!shareLink.value) return

    navigator.clipboard.writeText(shareLink.value)
    toast.add({
      title: 'Copied',
      description: 'Share link copied to clipboard.',
      color: 'success'
    })
  }

  // Chat functionality
  function chatAboutWellness() {
    if (!wellness.value) return
    navigateTo({
      path: '/chat',
      query: { wellnessId: wellness.value.id }
    })
  }

  // AI Analysis functionality
  async function analyzeWellness() {
    if (!wellness.value) return

    analyzingWellness.value = true
    try {
      const result = (await $fetch(`/api/wellness/${wellness.value.id}/analyze`, {
        method: 'POST'
      })) as any

      // If already completed, update immediately
      if (result.status === 'COMPLETED' && result.analysis) {
        wellness.value.aiAnalysisJson = result.analysis
        wellness.value.aiAnalyzedAt = result.analyzedAt
        wellness.value.aiAnalysisStatus = 'COMPLETED'
        wellness.value.llmUsageId = result.llmUsageId
        wellness.value.feedback = result.feedback
        wellness.value.feedbackText = result.feedbackText
        analyzingWellness.value = false

        toast.add({
          title: 'Analysis Ready',
          description: 'Wellness analysis is ready',
          color: 'success',
          icon: 'i-heroicons-check-circle'
        })
        return
      }

      // Update status and start polling
      wellness.value.aiAnalysisStatus = result.status || 'PROCESSING'
      refreshRuns()

      toast.add({
        title: 'Analysis Started',
        description: 'AI is analyzing your wellness data...',
        color: 'info',
        icon: 'i-heroicons-sparkles'
      })
    } catch (e: any) {
      console.error('Error triggering wellness analysis:', e)
      analyzingWellness.value = false
      toast.add({
        title: 'Analysis Failed',
        description: e.data?.message || 'Failed to start analysis',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
  }

  // Utility functions
  function formatLongDate(date: string | Date) {
    return formatDateUTC(date, 'EEEE, MMMM d, yyyy')
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

  function getPriorityBorderClass(priority: string) {
    const p = (priority || '').toLowerCase()
    if (p === 'high' || p === 'critical') return 'border-red-500'
    if (p === 'medium') return 'border-yellow-500'
    if (p === 'low') return 'border-blue-500'
    return 'border-gray-200 dark:border-gray-800'
  }

  function getPriorityBadgeClass(priority: string) {
    const baseClass = 'text-white'
    const p = (priority || '').toLowerCase()
    if (p === 'high' || p === 'critical') return `${baseClass} bg-red-500`
    if (p === 'medium') return `${baseClass} bg-yellow-500`
    if (p === 'low') return `${baseClass} bg-blue-500`
    return `${baseClass} bg-gray-500`
  }

  useHead(() => {
    const dateStr = wellness.value ? formatLongDate(wellness.value.date) : ''
    return {
      title: wellness.value ? `Audit: ${dateStr}` : 'Wellness Audit',
      meta: [
        {
          name: 'description',
          content: wellness.value
            ? `Biometric integrity audit for ${dateStr}.`
            : 'View daily wellness metrics including recovery, sleep, and HRV.'
        }
      ]
    }
  })

  // Load data on mount
  onMounted(() => {
    fetchWellness()
  })

  function getTrend(metric: string, inverse: boolean = false) {
    if (!wellness.value?.trends?.[metric]) return null

    const current = wellness.value[metric]
    const avg = wellness.value.trends[metric].avg7

    if (current === null || avg === null || avg === 0) return null

    const diff = current - avg
    const pct = (diff / avg) * 100
    const absPct = Math.abs(pct)

    // Don't show negligible trends
    if (absPct < 1) return null

    const isUp = diff > 0
    const isGood = inverse ? !isUp : isUp

    return {
      text: `${Math.round(absPct)}%`,
      icon: isUp ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down',
      class: isGood
        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
        : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
    }
  }

  function getSorenessLabel(val: number) {
    if (val <= 2) return 'None'
    if (val <= 4) return 'Light'
    if (val <= 6) return 'Moderate'
    if (val <= 8) return 'Heavy'
    return 'Severe'
  }

  function getFatigueLabel(val: number) {
    if (val <= 2) return 'Fresh'
    if (val <= 4) return 'Stable'
    if (val <= 6) return 'Tired'
    if (val <= 8) return 'Strained'
    return 'Exhausted'
  }

  function getStressLabel(val: number) {
    if (val <= 2) return 'Calm'
    if (val <= 4) return 'Nominal'
    if (val <= 6) return 'Elevated'
    if (val <= 8) return 'High'
    return 'Critical'
  }

  function getMoodLabel(val: number) {
    if (val >= 8) return 'Excellent'
    if (val >= 6) return 'Positive'
    if (val >= 4) return 'Neutral'
    if (val >= 2) return 'Low'
    return 'Depressed'
  }

  function getMotivationLabel(val: number) {
    if (val >= 8) return 'Peak'
    if (val >= 6) return 'High'
    if (val >= 4) return 'Disciplined'
    if (val >= 2) return 'Low'
    return 'Apathetic'
  }
</script>
