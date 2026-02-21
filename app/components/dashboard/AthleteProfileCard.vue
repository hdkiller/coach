<template>
  <UCard
    :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow' }"
    class="flex flex-col overflow-hidden"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-primary-500" />
          <h3 class="font-bold text-sm tracking-tight uppercase">Athlete Profile</h3>
        </div>
        <div class="flex items-center gap-1">
          <UButton
            to="/profile/settings"
            icon="i-heroicons-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            class="rounded-full"
          />
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="ghost"
            size="xs"
            class="rounded-full"
            @click="showSettingsModal = true"
          />
        </div>
      </div>
    </template>

    <!-- Loading skeleton -->
    <div v-if="userStore?.loading && !userStore?.profile" class="space-y-4 animate-pulse flex-grow">
      <div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
      </div>
      <div class="pt-2 border-t space-y-2">
        <div class="flex justify-between">
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
        <div class="flex justify-between">
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
        <div class="flex justify-between">
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      </div>
    </div>

    <!-- Actual profile data -->
    <div v-else-if="userStore?.profile" class="space-y-4 flex-grow">
      <!-- Profile Info Card - Clickable -->
      <NuxtLink
        to="/profile/athlete"
        class="group block w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:ring-primary-500/50 transition-all duration-200"
      >
        <div class="flex items-center justify-between mb-3">
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest"
          >
            Athlete's Profile
          </p>
          <div class="flex items-center gap-2">
            <UTooltip v-if="profileStatus.isStale" :text="profileStatus.label">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-500" />
            </UTooltip>
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-path"
              :loading="userStore?.generating"
              @click.prevent="userStore?.generateProfile"
            >
              Refresh
            </UButton>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-500 transition-colors"
            />
          </div>
        </div>

        <div class="mb-3">
          <div class="flex items-baseline gap-2">
            <div class="flex items-center gap-2">
              <span
                v-if="
                  userStore.profile.country &&
                  countries.find((c) => c.code === userStore.profile.country)
                "
                class="text-2xl"
                :title="countries.find((c) => c.code === userStore.profile.country)?.name"
              >
                {{ countries.find((c) => c.code === userStore.profile.country)?.flag }}
              </span>
              <p class="font-bold text-lg text-gray-900 dark:text-white">
                {{ userStore.profile.name || 'Athlete' }}
              </p>
            </div>
            <p
              v-if="userStore.profile.age"
              class="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest"
            >
              {{ userStore.profile.age }} <span class="text-[9px] opacity-70">yrs</span>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="metric in getVisibleMetrics('profileInfo')"
            :key="metric.key"
            class="space-y-1"
          >
            <div class="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
              <UIcon
                :name="metricConfigs[metric.key].icon"
                class="w-3 h-3"
                :class="metricConfigs[metric.key].iconColor"
              />
              {{ metricConfigs[metric.key].label }}
            </div>
            <div class="text-sm font-bold text-gray-900 dark:text-white">
              <template v-if="metric.key === 'maxHr'">
                <template v-if="userStore.currentMaxHr"
                  >{{ userStore.currentMaxHr }}
                  <span class="text-[9px] opacity-70">bpm</span></template
                >
                <template v-else-if="userStore.profile.estimatedMaxHR"
                  >~{{ userStore.profile.estimatedMaxHR }}
                  <span class="text-[9px] opacity-70">bpm</span></template
                >
                <UButton
                  v-else
                  to="/profile/settings"
                  icon="i-heroicons-pencil"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  class="-my-1"
                  @click.stop
                />
              </template>
              <template v-else-if="metric.key === 'restingHr'">
                <template v-if="userStore.profile.restingHr"
                  >{{ userStore.profile.restingHr }}
                  <span class="text-[9px] opacity-70">bpm</span></template
                >
                <UButton
                  v-else
                  to="/profile/settings"
                  icon="i-heroicons-pencil"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  class="-my-1"
                  @click.stop
                />
              </template>
              <template v-else-if="metric.key === 'lthr'">
                <template v-if="userStore.currentLthr"
                  >{{ userStore.currentLthr }}
                  <span class="text-[9px] opacity-70">bpm</span></template
                >
                <UButton
                  v-else
                  to="/profile/settings"
                  icon="i-heroicons-pencil"
                  color="neutral"
                  variant="soft"
                  size="xs"
                  class="-my-1"
                  @click.stop
                />
              </template>
              <template v-else-if="metric.key === 'age'">
                {{ userStore.profile.age || 'N/A' }} <span class="text-[9px] opacity-70">yrs</span>
              </template>
              <template v-else-if="metric.key === 'height'">
                <span class="font-bold">{{
                  formatHeight(userStore.profile.height, userStore.profile.heightUnits)
                }}</span>
              </template>
            </div>
          </div>
        </div>
      </NuxtLink>

      <!-- Training Load & Form Section -->
      <button
        class="group block w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:ring-primary-500/50 transition-all duration-200"
        @click="$emit('open-training-load')"
      >
        <div class="flex items-center justify-between mb-3">
          <p
            class="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest"
          >
            Training Load & Form
          </p>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-500 transition-colors"
          />
        </div>

        <div v-if="pmcLoading" class="grid grid-cols-3 gap-3 animate-pulse">
          <div v-for="i in 3" :key="i" class="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>

        <div v-else-if="pmcData?.summary" class="grid grid-cols-3 gap-3">
          <div
            v-for="metric in getVisibleMetrics('trainingLoad')"
            :key="metric.key"
            class="space-y-1"
          >
            <div class="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
              <UIcon
                :name="metricConfigs[metric.key].icon"
                class="w-3 h-3"
                :class="
                  metric.key === 'tsb'
                    ? getTSBIconColor(pmcData.summary.currentTSB)
                    : 'text-purple-500'
                "
              />
              {{ metricConfigs[metric.key].label }}
              <span class="text-[9px] font-normal lowercase opacity-70"
                >({{ metricConfigs[metric.key].sublabel }})</span
              >
            </div>
            <div class="flex items-center gap-2">
              <div
                class="text-sm font-bold"
                :class="
                  metric.key === 'tsb'
                    ? getTSBTextColor(pmcData.summary.currentTSB)
                    : 'text-gray-900 dark:text-white'
                "
              >
                <template v-if="metric.key === 'ctl'">
                  {{ (pmcData.summary.currentCTL ?? 0).toFixed(0) }}
                </template>
                <template v-else-if="metric.key === 'atl'">
                  {{ (pmcData.summary.currentATL ?? 0).toFixed(0) }}
                </template>
                <template v-else-if="metric.key === 'tsb'">
                  {{ (pmcData.summary.currentTSB ?? 0) > 0 ? '+' : ''
                  }}{{ (pmcData.summary.currentTSB ?? 0).toFixed(0) }}
                </template>
              </div>
              <TrendIndicator
                v-if="pmcData.data"
                :current="
                  metric.key === 'ctl'
                    ? pmcData.summary.currentCTL
                    : metric.key === 'atl'
                      ? pmcData.summary.currentATL
                      : pmcData.summary.currentTSB
                "
                :previous="
                  pmcData.data
                    .slice(-8, -1)
                    .map((d: any) =>
                      metric.key === 'ctl' ? d.ctl : metric.key === 'atl' ? d.atl : d.tsb
                    )
                "
                :type="metric.key === 'atl' ? 'lower-is-better' : 'higher-is-better'"
                compact
                icon-only
                show-value
              />
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-gray-500 italic text-center py-1">
          Connect Intervals.icu for training load data
        </div>
      </button>

      <!-- Performance Section - Clickable -->
      <NuxtLink
        to="/performance"
        class="group block w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:ring-primary-500/50 transition-all duration-200"
      >
        <div class="flex items-center justify-between mb-3">
          <p
            class="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest"
          >
            Core Performance
          </p>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-500 transition-colors"
          />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div
            v-for="metric in getVisibleMetrics('corePerformance')"
            :key="metric.key"
            class="space-y-1"
          >
            <div class="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
              <UIcon :name="metricConfigs[metric.key].icon" class="w-3 h-3 text-amber-500" />
              {{ metricConfigs[metric.key].label }}
            </div>
            <div class="flex items-center gap-2">
              <div class="text-sm font-bold text-gray-900 dark:text-white">
                <template v-if="metric.key === 'ftp'">
                  <template v-if="userStore.currentFtp"
                    >{{ userStore.currentFtp
                    }}<span class="text-[9px] opacity-70">W</span></template
                  >
                  <UButton
                    v-else
                    to="/profile/settings"
                    icon="i-heroicons-pencil"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="-my-1"
                    @click.stop
                  />
                </template>
                <template v-else-if="metric.key === 'weight'">
                  <template v-if="userStore.profile.weight"
                    >{{ userStore.profile.weight.toFixed(1)
                    }}<span class="text-[9px] opacity-70">{{
                      userStore.weightUnitLabel
                    }}</span></template
                  >
                  <UButton
                    v-else
                    to="/profile/settings"
                    icon="i-heroicons-pencil"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="-my-1"
                    @click.stop
                  />
                </template>
                <template v-else-if="metric.key === 'wKg'">
                  <template v-if="userStore.currentWkg">
                    {{ userStore.currentWkg.toFixed(2) }}
                  </template>
                  <UButton
                    v-else
                    to="/profile/settings"
                    icon="i-heroicons-pencil"
                    color="neutral"
                    variant="soft"
                    size="xs"
                    class="-my-1"
                    @click.stop
                  />
                </template>
                <template v-else-if="metric.key === 'wPrime'">
                  {{
                    userStore.currentWPrime
                      ? (userStore.currentWPrime / 1000).toFixed(1) + 'kJ'
                      : 'N/A'
                  }}
                </template>
                <template v-else-if="metric.key === 'thresholdPace'">
                  {{ userStore.currentThresholdPace || 'N/A' }}
                </template>
              </div>
              <TrendIndicator
                v-if="metric.key === 'ftp' && userStore.currentFtp && ftpHistory.length > 0"
                :current="userStore.currentFtp"
                :previous="ftpHistory.map((d: any) => d.ftp)"
                type="higher-is-better"
                compact
                icon-only
                show-value
              />
              <TrendIndicator
                v-else-if="
                  metric.key === 'weight' && userStore.profile.weight && weightHistory.length > 0
                "
                :current="userStore.profile.weight"
                :previous="weightHistory.map((d: any) => d.weight)"
                type="neutral"
                compact
                icon-only
                show-value
              />
              <TrendIndicator
                v-else-if="
                  metric.key === 'wKg' &&
                  userStore.currentFtp &&
                  userStore.profile.weight &&
                  wKgHistory.length > 0
                "
                :current="userStore.currentFtp / userStore.profile.weight"
                :previous="wKgHistory"
                type="higher-is-better"
                compact
                icon-only
                show-value
              />
            </div>
          </div>
        </div>
      </NuxtLink>

      <!-- Wellness Section - Clickable -->
      <button
        v-if="
          userStore.profile.recentHRV ||
          userStore.profile.restingHr ||
          userStore.profile.recentSleep ||
          userStore.profile.recentRecoveryScore
        "
        class="group w-full text-left p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 hover:ring-primary-500/50 transition-all duration-200"
        @click="$emit('open-wellness')"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <p
              class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest"
            >
              Latest Wellness
            </p>
            <UTooltip v-if="wellnessStatus.isStale" :text="wellnessStatus.label">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-500" />
            </UTooltip>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-primary-500 transition-colors"
          />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div v-for="metric in getVisibleMetrics('wellness')" :key="metric.key" class="space-y-1">
            <div class="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
              <UIcon :name="metricConfigs[metric.key].icon" class="w-3 h-3 text-indigo-500" />
              {{ metricConfigs[metric.key].label }}
            </div>
            <div class="flex items-center gap-2">
              <div class="text-sm font-bold text-gray-900 dark:text-white">
                <template v-if="metric.key === 'sleep'">
                  <template v-if="userStore.profile.recentSleep">
                    {{ userStore.profile.recentSleep.toFixed(1) }}
                    <span class="text-[9px] opacity-70">h</span>
                  </template>
                  <template v-else>N/A</template>
                </template>
                <template v-else-if="metric.key === 'hrv'">
                  <template v-if="userStore.profile.recentHRV">
                    {{ Math.round(userStore.profile.recentHRV) }}
                    <span class="text-[9px] opacity-70">ms</span>
                  </template>
                  <template v-else>N/A</template>
                </template>
                <template v-else-if="metric.key === 'rhr'">
                  <template v-if="userStore.profile.restingHr">
                    {{ userStore.profile.restingHr }} <span class="text-[9px] opacity-70">bpm</span>
                  </template>
                  <template v-else>N/A</template>
                </template>
                <template v-else-if="metric.key === 'recovery'">
                  <template v-if="userStore.profile.recentRecoveryScore">
                    {{ userStore.profile.recentRecoveryScore }}
                    <span class="text-[9px] opacity-70">%</span>
                  </template>
                  <template v-else>N/A</template>
                </template>
                <template v-else-if="metric.key === 'readiness'">
                  {{ userStore.profile.recentReadiness || 'N/A' }}
                </template>
                <template v-else-if="metric.key === 'fatigue'">
                  {{ userStore.profile.recentFatigue || 'N/A' }}
                </template>
                <template v-else-if="metric.key === 'stress'">
                  {{ userStore.profile.recentStress || 'N/A' }}
                </template>
                <template v-else-if="metric.key === 'mood'">
                  {{ userStore.profile.recentMood || 'N/A' }}
                </template>
                <template v-else-if="metric.key === 'spO2'">
                  <template v-if="userStore.profile.recentSpO2">
                    {{ userStore.profile.recentSpO2 }} <span class="text-[9px] opacity-70">%</span>
                  </template>
                  <template v-else>N/A</template>
                </template>
                <template v-else-if="metric.key === 'bloodPressure'">
                  {{
                    userStore.profile.recentSystolic
                      ? userStore.profile.recentSystolic + '/' + userStore.profile.recentDiastolic
                      : 'N/A'
                  }}
                </template>
                <template v-else-if="metric.key === 'respiration'">
                  <template v-if="userStore.profile.recentRespiration">
                    {{ userStore.profile.recentRespiration }}
                    <span class="text-[9px] opacity-70">brpm</span>
                  </template>
                  <template v-else>N/A</template>
                </template>
                <template v-else-if="metric.key === 'skinTemp'">
                  <template v-if="userStore.profile.recentSkinTemp">
                    {{ userStore.profile.recentSkinTemp }}
                    <span class="text-[9px] opacity-70">°C</span>
                  </template>
                  <template v-else>N/A</template>
                </template>
                <template v-else-if="metric.key === 'vo2max'">
                  {{ userStore.profile.recentVo2max || 'N/A' }}
                </template>
              </div>
              <TrendIndicator
                v-if="wellnessHistory.length > 0 && getValueForKey(metric.key)"
                :current="getValueForKey(metric.key)"
                :previous="getHistoryForKey(metric.key)"
                :type="
                  metric.key === 'rhr' || metric.key === 'fatigue' || metric.key === 'stress'
                    ? 'lower-is-better'
                    : 'higher-is-better'
                "
                compact
                icon-only
                show-value
              />
            </div>
          </div>
        </div>
      </button>

      <!-- Upcoming Events Section -->
      <div
        v-if="showUpcomingEventsSection"
        class="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 ring-1 ring-inset ring-gray-200 dark:ring-gray-700"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <p
              class="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest"
            >
              Upcoming Events
            </p>
            <UBadge color="neutral" variant="soft" size="xs">
              {{ upcomingEvents.length }}
            </UBadge>
          </div>
          <UButton
            to="/events"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-right"
          />
        </div>

        <div class="space-y-2">
          <NuxtLink
            v-for="event in upcomingEvents"
            :key="event.id"
            :to="`/events/${event.id}`"
            class="group flex items-center gap-3 rounded-lg p-2 hover:bg-white/70 dark:hover:bg-gray-700/40 transition-colors"
          >
            <div
              class="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 shrink-0"
            >
              <span class="text-[10px] font-bold uppercase leading-none">{{
                formatDate(event.date, 'MMM')
              }}</span>
              <span class="text-sm font-bold">{{ formatDate(event.date, 'd') }}</span>
            </div>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-gray-900 dark:text-white truncate">
                {{ event.title }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatEventMeta(event) }}
              </p>
            </div>

            <span class="text-xs font-bold text-cyan-700 dark:text-cyan-300 shrink-0">
              {{ formatDaysUntilEvent(event.date) }}
            </span>
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors"
            />
          </NuxtLink>
        </div>
      </div>
    </div>

    <DashboardAthleteProfileSettingsModal v-model:open="showSettingsModal" />
  </UCard>
</template>

<script setup lang="ts">
  import { countries } from '~/utils/countries'
  import { formatHeight } from '~/utils/metrics'

  const userStore = useUserStore()
  const integrationStore = useIntegrationStore()
  const { formatDate, formatDateUTC, getUserLocalDate } = useFormat()
  const { checkProfileStale, checkWellnessStale } = useDataStatus()

  defineEmits(['open-wellness', 'open-training-load'])

  const showSettingsModal = ref(false)

  const defaultSettings = {
    profileInfo: {
      metrics: [
        { key: 'maxHr', label: 'Max HR', visible: true },
        { key: 'restingHr', label: 'Resting HR', visible: true },
        { key: 'lthr', label: 'LTHR', visible: true },
        { key: 'age', label: 'Age', visible: false },
        { key: 'height', label: 'Height', visible: false }
      ]
    },
    trainingLoad: {
      metrics: [
        { key: 'ctl', label: 'CTL (Fitness)', visible: true },
        { key: 'atl', label: 'ATL (Fatigue)', visible: true },
        { key: 'tsb', label: 'TSB (Form)', visible: true }
      ]
    },
    corePerformance: {
      metrics: [
        { key: 'ftp', label: 'FTP', visible: true },
        { key: 'weight', label: 'Weight', visible: true },
        { key: 'wKg', label: 'W/kg', visible: true },
        { key: 'wPrime', label: "W' (W-Prime)", visible: false },
        { key: 'thresholdPace', label: 'Threshold Pace', visible: false }
      ]
    },
    wellness: {
      metrics: [
        { key: 'sleep', label: 'Sleep', visible: true },
        { key: 'hrv', label: 'HRV', visible: true },
        { key: 'rhr', label: 'RHR', visible: true },
        { key: 'recovery', label: 'Recovery %', visible: false },
        { key: 'readiness', label: 'Readiness', visible: false },
        { key: 'fatigue', label: 'Fatigue', visible: false },
        { key: 'stress', label: 'Stress', visible: false },
        { key: 'mood', label: 'Mood', visible: false },
        { key: 'spO2', label: 'SpO2', visible: false },
        { key: 'bloodPressure', label: 'Blood Pressure', visible: false },
        { key: 'respiration', label: 'Respiration', visible: false },
        { key: 'skinTemp', label: 'Skin Temp', visible: false },
        { key: 'vo2max', label: 'VO2 Max', visible: false }
      ]
    },
    upcomingEvents: {
      enabled: true
    }
  }

  const settings = computed(() => {
    const userSettings = userStore.user?.dashboardSettings?.athleteProfile
    if (userSettings) {
      return { ...defaultSettings, ...userSettings }
    }
    return defaultSettings
  })

  type MetricSectionKey = 'profileInfo' | 'trainingLoad' | 'corePerformance' | 'wellness'

  const getVisibleMetrics = (sectionKey: MetricSectionKey) => {
    return (settings.value[sectionKey]?.metrics || defaultSettings[sectionKey].metrics).filter(
      (m: any) => m.visible
    )
  }

  const showUpcomingEventsSection = computed(() => {
    return (settings.value.upcomingEvents?.enabled ?? true) && upcomingEvents.value.length > 0
  })

  const metricConfigs: Record<string, any> = {
    // Profile Info
    maxHr: {
      icon: 'i-heroicons-heart-solid',
      iconColor: 'text-rose-500',
      label: 'Max HR'
    },
    restingHr: {
      icon: 'i-heroicons-heart',
      iconColor: 'text-rose-500',
      label: 'Resting HR'
    },
    lthr: {
      icon: 'i-heroicons-fire',
      iconColor: 'text-rose-500',
      label: 'LTHR'
    },
    age: {
      icon: 'i-heroicons-calendar',
      iconColor: 'text-rose-500',
      label: 'Age'
    },
    height: {
      icon: 'i-heroicons-arrows-up-down',
      iconColor: 'text-rose-500',
      label: 'Height'
    },
    // Training Load
    ctl: {
      icon: 'i-heroicons-presentation-chart-line',
      iconColor: 'text-purple-500',
      label: 'CTL',
      sublabel: 'fitness'
    },
    atl: {
      icon: 'i-heroicons-bolt',
      iconColor: 'text-purple-500',
      label: 'ATL',
      sublabel: 'fatigue'
    },
    tsb: {
      icon: 'i-heroicons-chart-bar',
      iconColor: '', // Handled by dynamic logic
      label: 'TSB',
      sublabel: 'form'
    },
    // Core Performance
    ftp: {
      icon: 'i-heroicons-bolt-solid',
      iconColor: 'text-amber-500',
      label: 'FTP'
    },
    weight: {
      icon: 'i-heroicons-scale',
      iconColor: 'text-amber-500',
      label: 'Weight'
    },
    wKg: {
      icon: 'i-heroicons-chart-bar-square',
      iconColor: 'text-amber-500',
      label: 'W/kg'
    },
    wPrime: {
      icon: 'i-heroicons-battery-100',
      iconColor: 'text-amber-500',
      label: "W'"
    },
    thresholdPace: {
      icon: 'i-lucide-activity',
      iconColor: 'text-amber-500',
      label: 'Pace'
    },
    // Wellness
    sleep: {
      icon: 'i-heroicons-moon',
      iconColor: 'text-indigo-500',
      label: 'Sleep'
    },
    hrv: {
      icon: 'i-heroicons-heart',
      iconColor: 'text-indigo-500',
      label: 'HRV'
    },
    rhr: {
      icon: 'i-heroicons-heart',
      iconColor: 'text-indigo-500',
      label: 'RHR'
    },
    recovery: {
      icon: 'i-heroicons-bolt',
      iconColor: 'text-indigo-500',
      label: 'REC'
    },
    readiness: {
      icon: 'i-lucide-activity',
      iconColor: 'text-indigo-500',
      label: 'READI'
    },
    fatigue: {
      icon: 'i-lucide-frown',
      iconColor: 'text-indigo-500',
      label: 'FATIG'
    },
    stress: {
      icon: 'i-heroicons-cloud',
      iconColor: 'text-indigo-500',
      label: 'STRES'
    },
    mood: {
      icon: 'i-lucide-smile',
      iconColor: 'text-indigo-500',
      label: 'MOOD'
    },
    spO2: {
      icon: 'i-lucide-activity',
      iconColor: 'text-indigo-500',
      label: 'SPO2'
    },
    bloodPressure: {
      icon: 'i-heroicons-heart-solid',
      iconColor: 'text-indigo-500',
      label: 'BP'
    },
    respiration: {
      icon: 'i-lucide-wind',
      iconColor: 'text-indigo-500',
      label: 'RESP'
    },
    skinTemp: {
      icon: 'i-lucide-thermometer',
      iconColor: 'text-indigo-500',
      label: 'TEMP'
    },
    vo2max: {
      icon: 'i-heroicons-chart-pie',
      iconColor: 'text-indigo-500',
      label: 'VO2MX'
    }
  }

  const pmcData = ref<any>(null)
  const pmcLoading = ref(false)
  const ftpHistory = ref<any[]>([])
  const wellnessHistory = ref<any[]>([])
  const weightHistory = ref<any[]>([])
  const upcomingEvents = ref<any[]>([])

  const wKgHistory = computed(() => {
    if (!ftpHistory.value.length || !weightHistory.value.length) return []

    return weightHistory.value
      .map((w) => {
        const date = new Date(w.date)
        const f = ftpHistory.value
          .filter((entry) => new Date(entry.date) <= date)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

        const ftp = f ? f.ftp : ftpHistory.value[0]?.ftp || 0
        if (!ftp || !w.weight) return null
        return ftp / w.weight
      })
      .filter((v) => v !== null) as number[]
  })

  const profileStatus = computed(() =>
    checkProfileStale(userStore.profile?.profileLastUpdated, userStore.profile?.latestWorkoutDate)
  )

  const wellnessStatus = computed(() => checkWellnessStale(userStore.profile?.latestWellnessDate))

  async function fetchHistoryData() {
    // Attempt to fetch even if not connected, as some data might exist
    pmcLoading.value = true
    try {
      const today = getUserLocalDate()
      const start = new Date(today)
      start.setDate(today.getDate() - 7)

      const startDate = start.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      const [pmc, ftp, wellness, weight, events] = await Promise.all([
        integrationStore.intervalsConnected
          ? $fetch('/api/performance/pmc', { query: { days: 7 } })
          : Promise.resolve(null),
        integrationStore.intervalsConnected
          ? $fetch('/api/performance/ftp-evolution')
          : Promise.resolve([]),
        $fetch(`/api/wellness/trend?startDate=${startDate}&endDate=${endDate}`).catch(() => []),
        $fetch('/api/performance/weight-evolution').catch(() => []),
        $fetch('/api/events').catch(() => [])
      ])

      pmcData.value = pmc
      ftpHistory.value = (ftp as any)?.data || []
      wellnessHistory.value = Array.isArray(wellness) ? wellness : []
      weightHistory.value = (weight as any)?.data || []
      upcomingEvents.value = (Array.isArray(events) ? events : [])
        .filter((event: any) => {
          const eventDate = new Date(event?.date)
          if (Number.isNaN(eventDate.getTime())) return false
          const today = getUserLocalDate()
          today.setHours(0, 0, 0, 0)
          return eventDate.getTime() >= today.getTime()
        })
        .slice(0, 3)
    } catch (e) {
      console.error('Failed to load history data', e)
    } finally {
      pmcLoading.value = false
    }
  }

  function getTSBTextColor(tsb: number | undefined) {
    const val = tsb ?? 0
    if (val >= 5) return 'text-green-600 dark:text-green-400'
    if (val < -30) return 'text-red-600 dark:text-red-400'
    if (val < -10) return 'text-orange-600 dark:text-orange-400'
    return 'text-gray-900 dark:text-white'
  }

  function getTSBIconColor(tsb: number | undefined) {
    const val = tsb ?? 0
    if (val >= 5) return 'text-green-500'
    if (val < -30) return 'text-red-500'
    if (val < -10) return 'text-orange-500'
    return 'text-gray-400'
  }

  function getValueForKey(key: string) {
    if (!userStore.profile) return null
    if (key === 'sleep') return userStore.profile.recentSleep
    if (key === 'hrv') return userStore.profile.recentHRV
    if (key === 'rhr') return userStore.profile.restingHr
    if (key === 'recovery') return userStore.profile.recentRecoveryScore
    if (key === 'readiness') return userStore.profile.recentReadiness
    if (key === 'fatigue') return userStore.profile.recentFatigue
    if (key === 'stress') return userStore.profile.recentStress
    if (key === 'mood') return userStore.profile.recentMood
    if (key === 'spO2') return userStore.profile.recentSpO2
    if (key === 'bloodPressure') return userStore.profile.recentSystolic // Use systolic for trend
    if (key === 'respiration') return userStore.profile.recentRespiration
    if (key === 'skinTemp') return userStore.profile.recentSkinTemp
    if (key === 'vo2max') return userStore.profile.recentVo2max
    return null
  }

  function getHistoryForKey(key: string) {
    if (!wellnessHistory.value.length) return []
    if (key === 'sleep')
      return wellnessHistory.value.map((d: any) => d.sleepHours).filter((v: any) => v != null)
    if (key === 'hrv')
      return wellnessHistory.value.map((d: any) => d.hrv).filter((v: any) => v != null)
    if (key === 'rhr')
      return wellnessHistory.value.map((d: any) => d.restingHr).filter((v: any) => v != null)
    if (key === 'recovery')
      return wellnessHistory.value.map((d: any) => d.recoveryScore).filter((v: any) => v != null)
    if (key === 'readiness')
      return wellnessHistory.value.map((d: any) => d.readiness).filter((v: any) => v != null)
    if (key === 'fatigue')
      return wellnessHistory.value.map((d: any) => d.fatigue).filter((v: any) => v != null)
    if (key === 'stress')
      return wellnessHistory.value.map((d: any) => d.stress).filter((v: any) => v != null)
    if (key === 'mood')
      return wellnessHistory.value.map((d: any) => d.mood).filter((v: any) => v != null)
    if (key === 'spO2')
      return wellnessHistory.value.map((d: any) => d.spO2).filter((v: any) => v != null)
    if (key === 'bloodPressure')
      return wellnessHistory.value.map((d: any) => d.systolic).filter((v: any) => v != null)
    if (key === 'respiration')
      return wellnessHistory.value.map((d: any) => d.respiration).filter((v: any) => v != null)
    if (key === 'skinTemp')
      return wellnessHistory.value.map((d: any) => d.skinTemp).filter((v: any) => v != null)
    if (key === 'vo2max')
      return wellnessHistory.value.map((d: any) => d.vo2max).filter((v: any) => v != null)
    return []
  }

  onMounted(() => {
    fetchHistoryData()
  })

  watch(
    () => [integrationStore.intervalsConnected, integrationStore.whoopConnected],
    () => {
      fetchHistoryData()
    }
  )

  function formatWellnessDate(dateStr: string): string {
    const date = new Date(dateStr)
    const today = getUserLocalDate()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dStr = formatDateUTC(date, 'yyyy-MM-dd')
    const tStr = formatDateUTC(today, 'yyyy-MM-dd')
    const yStr = formatDateUTC(yesterday, 'yyyy-MM-dd')

    if (dStr === tStr) return 'today'
    if (dStr === yStr) return 'yesterday'

    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`
    return formatDateUTC(date, 'MMM d')
  }

  function formatDaysUntilEvent(dateStr: string): string {
    const eventDate = new Date(dateStr)
    if (Number.isNaN(eventDate.getTime())) return ''

    const today = getUserLocalDate()
    today.setHours(0, 0, 0, 0)
    eventDate.setHours(0, 0, 0, 0)

    const dayDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (dayDiff <= 0) return 'Today'
    if (dayDiff === 1) return '1 day'
    return `${dayDiff} days`
  }

  function formatEventMeta(event: any): string {
    const type = event?.subType || event?.type || 'Event'
    const location = [event?.city, event?.country].filter(Boolean).join(', ')
    if (location) return `${type} · ${location}`
    return type
  }
</script>
