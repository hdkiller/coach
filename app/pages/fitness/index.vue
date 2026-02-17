<template>
  <UDashboardPanel id="fitness">
    <template #header>
      <UDashboardNavbar title="Fitness Integrity">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <div class="flex items-center gap-3">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>

            <UButton
              icon="i-heroicons-adjustments-horizontal"
              color="neutral"
              variant="outline"
              size="sm"
              @click="isSettingsModalOpen = true"
            >
              Customize
            </UButton>

            <USelect
              v-model="selectedPeriod"
              :items="periodOptions"
              size="sm"
              class="w-32"
              color="neutral"
              variant="outline"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-4 sm:space-y-6 pb-24">
        <FitnessSettingsModal v-model:open="isSettingsModalOpen" />
        <FitnessChartSettingsModal
          v-if="activeMetricSettings"
          :metric-key="activeMetricSettings.key"
          :title="activeMetricSettings.title"
          :open="!!activeMetricSettings"
          @update:open="activeMetricSettings = null"
        />

        <!-- Dashboard Branding -->
        <div class="px-4 sm:px-0">
          <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Fitness
          </h1>
          <p
            class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
          >
            Wellness Biometrics & Recovery Integrity
          </p>
        </div>

        <!-- Summary Stats (Refined with Trends) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <!-- eFTP Card -->
          <div
            class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 sm:p-4 border border-blue-100 dark:border-blue-800/50"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400"
                >eFTP</span
              >
              <UIcon name="i-heroicons-bolt" class="size-3.5 text-blue-500" />
            </div>
            <div class="flex items-baseline gap-1">
              <div class="text-2xl font-black text-blue-900 dark:text-blue-100 tracking-tight">
                <USkeleton v-if="loadingFTP" class="h-8 w-12" />
                <template v-else>{{ ftpData?.summary?.currentFTP || '-' }}</template>
              </div>
              <span v-if="!loadingFTP" class="text-xs font-black text-blue-500 uppercase">W</span>
            </div>
            <div
              v-if="!loadingFTP && ftpData?.summary?.improvement !== undefined"
              class="mt-1 flex items-center gap-1"
            >
              <UIcon
                :name="
                  ftpData.summary.improvement >= 0
                    ? 'i-heroicons-arrow-trending-up'
                    : 'i-heroicons-arrow-trending-down'
                "
                class="size-3"
                :class="ftpData.summary.improvement >= 0 ? 'text-green-500' : 'text-red-500'"
              />
              <span
                class="text-[10px] font-bold uppercase tracking-tighter"
                :class="ftpData.summary.improvement >= 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ ftpData.summary.improvement > 0 ? '+' : '' }}{{ ftpData.summary.improvement }}%
                vs start
              </span>
            </div>
          </div>

          <!-- Fitness (CTL) Card -->
          <div
            class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 sm:p-4 border border-purple-100 dark:border-purple-800/50"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400"
                >Fitness (CTL)</span
              >
              <UIcon name="i-heroicons-sparkles" class="size-3.5 text-purple-500" />
            </div>
            <div class="flex items-baseline gap-1">
              <div class="text-2xl font-black text-purple-900 dark:text-purple-100 tracking-tight">
                <USkeleton v-if="loadingPMC" class="h-8 w-12" />
                <template v-else>{{ pmcData?.summary?.currentCTL?.toFixed(0) || '-' }}</template>
              </div>
              <span v-if="!loadingPMC" class="text-xs font-black text-purple-500 uppercase"
                >CTL</span
              >
            </div>
            <div v-if="!loadingPMC && ctlChange !== 0" class="mt-1 flex items-center gap-1">
              <UIcon
                :name="
                  ctlChange > 0
                    ? 'i-heroicons-arrow-trending-up'
                    : 'i-heroicons-arrow-trending-down'
                "
                class="size-3"
                :class="ctlChange > 0 ? 'text-green-500' : 'text-red-500'"
              />
              <span
                class="text-[10px] font-bold uppercase tracking-tighter"
                :class="ctlChange > 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ ctlChange > 0 ? '+' : '' }}{{ ctlChange.toFixed(1) }} CTL change
              </span>
            </div>
          </div>

          <!-- Weekly TSS Card -->
          <div
            class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 sm:p-4 border border-emerald-100 dark:border-emerald-800/50"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
                >Weekly TSS</span
              >
              <UIcon name="i-heroicons-chart-bar" class="size-3.5 text-emerald-500" />
            </div>
            <div class="flex items-baseline gap-1">
              <div
                class="text-2xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight"
              >
                <USkeleton v-if="loadingZones" class="h-8 w-12" />
                <template v-else>{{ Math.round(currentWeekTss) }}</template>
              </div>
              <span v-if="!loadingZones" class="text-xs font-black text-emerald-500 uppercase"
                >/ {{ Math.round(avgWeeklyTss) }}</span
              >
            </div>
            <div
              v-if="!loadingZones"
              class="mt-1 text-[10px] font-bold uppercase tracking-tighter text-emerald-600"
            >
              Avg: {{ Math.round(avgWeeklyTss) }} TSS/wk
            </div>
          </div>

          <!-- HRV Avg Card -->
          <div
            class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 sm:p-4 border border-amber-100 dark:border-amber-800/50"
          >
            <div class="flex items-center justify-between mb-1">
              <span
                class="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400"
                >HRV Avg</span
              >
              <UIcon name="i-heroicons-heart" class="size-3.5 text-amber-500" />
            </div>
            <div class="flex items-baseline gap-1">
              <div class="text-2xl font-black text-amber-900 dark:text-amber-100 tracking-tight">
                <USkeleton v-if="loading" class="h-8 w-12" />
                <template v-else>{{ avgHRV !== null ? avgHRV.toFixed(0) : '-' }}</template>
              </div>
              <span v-if="!loading" class="text-xs font-black text-amber-500 uppercase">ms</span>
            </div>
            <div v-if="!loading && hrvTrend !== 0" class="mt-1 flex items-center gap-1">
              <UIcon
                :name="
                  hrvTrend > 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'
                "
                class="size-3"
                :class="hrvTrend > 0 ? 'text-green-500' : 'text-red-500'"
              />
              <span
                class="text-[10px] font-bold uppercase tracking-tighter"
                :class="hrvTrend > 0 ? 'text-green-600' : 'text-red-600'"
              >
                {{ hrvTrend > 0 ? '+' : '' }}{{ hrvTrend.toFixed(1) }}% vs baseline
              </span>
            </div>
          </div>
        </div>

        <!-- Charts Section -->
        <div
          v-if="loading || allWellness.length > 0"
          class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
        >
          <!-- Recovery Score Trend -->
          <UCard
            v-if="chartSettings.recovery.visible !== false"
            :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                  Recovery Trajectory
                </h3>
                <UButton
                  icon="i-heroicons-cog-6-tooth"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openChartSettings('recovery', 'Recovery')"
                />
              </div>
            </template>
            <div v-if="loading" class="h-[300px] flex items-center justify-center">
              <USkeleton class="h-full w-full" />
            </div>
            <div v-else class="h-[300px]">
              <ClientOnly>
                <component
                  :is="chartSettings.recovery.type === 'bar' ? Bar : Line"
                  :key="`chart-recovery-${chartSettings.recovery.type}`"
                  :data="recoveryTrendData"
                  :options="getChartOptions('recovery', chartSettings.recovery.type)"
                  :height="300"
                />
              </ClientOnly>
            </div>
          </UCard>

          <!-- Sleep Hours Trend -->
          <UCard
            v-if="chartSettings.sleep.visible !== false"
            :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                  Sleep Duration
                </h3>
                <UButton
                  icon="i-heroicons-cog-6-tooth"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openChartSettings('sleep', 'Sleep')"
                />
              </div>
            </template>
            <div v-if="loading" class="h-[300px] flex items-center justify-center">
              <USkeleton class="h-full w-full" />
            </div>
            <div v-else class="h-[300px]">
              <ClientOnly>
                <component
                  :is="chartSettings.sleep.type === 'bar' ? Bar : Line"
                  :key="`chart-sleep-${chartSettings.sleep.type}`"
                  :data="sleepTrendData"
                  :options="getChartOptions('sleep', chartSettings.sleep.type)"
                  :height="300"
                />
              </ClientOnly>
            </div>
          </UCard>

          <!-- HRV Trend -->
          <UCard
            v-if="chartSettings.hrv.visible !== false"
            :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                  Biometric Variance (HRV)
                </h3>
                <UButton
                  icon="i-heroicons-cog-6-tooth"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openChartSettings('hrv', 'HRV')"
                />
              </div>
            </template>
            <div v-if="loading" class="h-[300px] flex items-center justify-center">
              <USkeleton class="h-full w-full" />
            </div>
            <div v-else class="h-[300px]">
              <ClientOnly>
                <component
                  :is="chartSettings.hrv.type === 'bar' ? Bar : Line"
                  :key="`chart-hrv-${chartSettings.hrv.type}`"
                  :data="hrvTrendData"
                  :options="getChartOptions('hrv', chartSettings.hrv.type)"
                  :height="300"
                />
              </ClientOnly>
            </div>
          </UCard>

          <!-- Resting HR Trend -->
          <UCard
            v-if="chartSettings.restingHr.visible !== false"
            :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                  Resting Heart Rate
                </h3>
                <UButton
                  icon="i-heroicons-cog-6-tooth"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openChartSettings('restingHr', 'Resting HR')"
                />
              </div>
            </template>
            <div v-if="loading" class="h-[300px] flex items-center justify-center">
              <USkeleton class="h-full w-full" />
            </div>
            <div v-else class="h-[300px]">
              <ClientOnly>
                <component
                  :is="chartSettings.restingHr.type === 'bar' ? Bar : Line"
                  :key="`chart-restingHr-${chartSettings.restingHr.type}`"
                  :data="restingHrTrendData"
                  :options="getChartOptions('restingHr', chartSettings.restingHr.type)"
                  :height="300"
                />
              </ClientOnly>
            </div>
          </UCard>

          <!-- Weight Trend -->
          <UCard
            v-if="chartSettings.weight.visible !== false"
            :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                  Mass Progression
                </h3>
                <UButton
                  icon="i-heroicons-cog-6-tooth"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openChartSettings('weight', 'Weight')"
                />
              </div>
            </template>
            <div v-if="loading" class="h-[300px] flex items-center justify-center">
              <USkeleton class="h-full w-full" />
            </div>
            <div v-else class="h-[300px]">
              <ClientOnly>
                <component
                  :is="chartSettings.weight.type === 'bar' ? Bar : Line"
                  :key="`chart-weight-${chartSettings.weight.type}`"
                  :data="weightTrendData"
                  :options="getChartOptions('weight', chartSettings.weight.type)"
                  :height="300"
                />
              </ClientOnly>
            </div>
          </UCard>

          <!-- Blood Pressure Trend -->
          <UCard
            v-if="chartSettings.bp.visible !== false"
            :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-4 sm:p-6' }"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-base font-black uppercase tracking-widest text-gray-400">
                  Blood Pressure
                </h3>
                <UButton
                  icon="i-heroicons-cog-6-tooth"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="openChartSettings('bp', 'Blood Pressure')"
                />
              </div>
            </template>
            <div v-if="loading" class="h-[300px] flex items-center justify-center">
              <USkeleton class="h-full w-full" />
            </div>
            <div v-else class="h-[300px]">
              <ClientOnly>
                <component
                  :is="chartSettings.bp.type === 'bar' ? Bar : Line"
                  :key="`chart-bp-${chartSettings.bp.type}`"
                  :data="bpTrendData"
                  :options="getChartOptions('bp', chartSettings.bp.type)"
                  :height="300"
                />
              </ClientOnly>
            </div>
          </UCard>
        </div>

        <!-- Filter Area -->
        <UCard
          :ui="{ root: 'rounded-none sm:rounded-lg shadow-none sm:shadow', body: 'p-3' }"
          class="bg-gray-50/50 dark:bg-gray-900/40 border-dashed border-gray-200 dark:border-gray-800"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0"
                >Recovery</span
              >
              <USelect
                v-model="filterRecovery"
                :items="recoveryStatusOptions"
                placeholder="All Status"
                size="sm"
                color="neutral"
                variant="outline"
                class="w-full"
              />
            </div>

            <div class="flex items-center gap-3">
              <span class="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0"
                >Sleep</span
              >
              <USelect
                v-model="filterSleep"
                :items="sleepQualityOptions"
                placeholder="All Quality"
                size="sm"
                color="neutral"
                variant="outline"
                class="w-full"
              />
            </div>
          </div>
        </UCard>

        <!-- Wellness Table -->
        <div
          class="bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 overflow-hidden"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead class="bg-gray-50 dark:bg-gray-950">
                <tr>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    Date
                  </th>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    Recov
                  </th>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    Readiness
                  </th>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    Sleep
                  </th>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    HRV
                  </th>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    RHR
                  </th>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    Weight
                  </th>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    BP
                  </th>
                  <th
                    class="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"
                  >
                    Feel
                  </th>
                </tr>
              </thead>
              <tbody
                v-if="loading"
                class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800"
              >
                <tr v-for="i in 10" :key="i">
                  <td v-for="j in 9" :key="j" class="px-6 py-4">
                    <USkeleton class="h-4 w-full" />
                  </td>
                </tr>
              </tbody>
              <tbody v-else-if="filteredWellness.length === 0" class="bg-white dark:bg-gray-900">
                <tr>
                  <td
                    colspan="9"
                    class="p-8 text-center text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-xs"
                  >
                    No biometric data recorded
                  </td>
                </tr>
              </tbody>
              <tbody
                v-else
                class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800"
              >
                <tr
                  v-for="wellness in paginatedWellness"
                  :key="wellness.id"
                  class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  @click="navigateToWellness(wellness.id)"
                >
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium uppercase tracking-tight"
                  >
                    {{ formatDateUTC(wellness.date, 'MMM dd, yyyy') }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      v-if="wellness.recoveryScore"
                      :class="getRecoveryBadgeClass(wellness.recoveryScore)"
                      class="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-widest"
                    >
                      {{ wellness.recoveryScore }}%
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
                  >
                    {{ wellness.readiness ? wellness.readiness + '/10' : '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    <div class="font-black tabular-nums">
                      {{ wellness.sleepHours ? wellness.sleepHours.toFixed(1) + 'h' : '-' }}
                    </div>
                    <div
                      v-if="wellness.sleepScore"
                      class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter"
                    >
                      {{ wellness.sleepScore }}% Qual
                    </div>
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
                  >
                    {{ wellness.hrv ? Math.round(wellness.hrv) + 'ms' : '-' }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
                  >
                    {{ wellness.restingHr ? wellness.restingHr : '-' }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
                  >
                    {{ wellness.weight ? wellness.weight.toFixed(1) + 'kg' : '-' }}
                  </td>
                  <td
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-bold tabular-nums"
                  >
                    {{
                      wellness.systolic && wellness.diastolic
                        ? `${wellness.systolic}/${wellness.diastolic}`
                        : '-'
                    }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      v-if="wellness.mood"
                      :class="getMoodBadgeClass(wellness.mood)"
                      class="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-widest"
                    >
                      {{ wellness.mood }}/10
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            v-if="totalPages > 1"
            class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/30"
          >
            <div class="flex items-center justify-between">
              <div class="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }}-{{
                  Math.min(currentPage * itemsPerPage, filteredWellness.length)
                }}
                of {{ filteredWellness.length }} entries
              </div>
              <div class="flex gap-2">
                <UButton
                  :disabled="currentPage === 1"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="font-black uppercase tracking-widest text-[10px]"
                  @click="changePage(currentPage - 1)"
                >
                  Prev
                </UButton>
                <div class="flex gap-1">
                  <UButton
                    v-for="page in visiblePages"
                    :key="page"
                    size="xs"
                    :color="page === currentPage ? 'primary' : 'neutral'"
                    :variant="page === currentPage ? 'solid' : 'ghost'"
                    class="font-black uppercase tracking-widest text-[10px] min-w-[28px] justify-center"
                    @click="changePage(page)"
                  >
                    {{ page }}
                  </UButton>
                </div>
                <UButton
                  :disabled="currentPage === totalPages"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  class="font-black uppercase tracking-widest text-[10px]"
                  @click="changePage(currentPage + 1)"
                >
                  Next
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  import { Line, Bar } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  definePageMeta({
    middleware: 'auth',
    layout: 'default'
  })

  useHead({
    title: 'Fitness & Wellness',
    meta: [
      {
        name: 'description',
        content:
          'Track your recovery, sleep quality, and overall wellness metrics with WHOOP integration.'
      }
    ]
  })

  const toast = useToast()
  const theme = useTheme()
  const userStore = useUserStore()
  const loading = ref(true)
  const allWellness = ref<any[]>([])
  const currentPage = ref(1)
  const itemsPerPage = 20

  const isSettingsModalOpen = ref(false)
  const activeMetricSettings = ref<{ key: string; title: string } | null>(null)

  const defaultChartSettings: any = {
    recovery: { type: 'line', visible: true, smooth: true, showPoints: false, opacity: 0.5 },
    sleep: { type: 'bar', visible: true, smooth: true, showPoints: false, opacity: 0.8 },
    hrv: { type: 'line', visible: true, smooth: true, showPoints: false, opacity: 0.5 },
    restingHr: { type: 'line', visible: true, smooth: true, showPoints: false, opacity: 0.5 },
    weight: { type: 'line', visible: true, smooth: true, showPoints: false, opacity: 0.5 },
    bp: { type: 'line', visible: true, smooth: true, showPoints: false, opacity: 0.5 }
  }

  const chartSettings = computed(() => {
    return userStore.user?.dashboardSettings?.fitnessCharts || defaultChartSettings
  })

  function openChartSettings(key: string, title: string) {
    activeMetricSettings.value = { key, title }
  }

  const selectedPeriod = ref<string | number>(30)
  const periodOptions = [
    { label: '7 Days', value: 7 },
    { label: '14 Days', value: 14 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: 'Year to Date', value: 'YTD' }
  ]

  // Period-aware fetching for additional metrics
  const { data: ftpData, pending: loadingFTP } = await useFetch<any>(
    '/api/performance/ftp-evolution',
    {
      query: computed(() => ({
        months:
          selectedPeriod.value === 'YTD'
            ? 'YTD'
            : Math.ceil(
                (typeof selectedPeriod.value === 'string'
                  ? parseInt(selectedPeriod.value)
                  : selectedPeriod.value) / 30
              )
      }))
    }
  )

  const { data: pmcData, pending: loadingPMC } = await useFetch<any>('/api/performance/pmc', {
    query: computed(() => ({ days: selectedPeriod.value }))
  })

  const { data: zonesData, pending: loadingZones } = await useFetch<any>(
    '/api/analytics/weekly-zones',
    {
      query: computed(() => ({
        weeks:
          selectedPeriod.value === 'YTD'
            ? 'YTD'
            : Math.ceil(
                (typeof selectedPeriod.value === 'string'
                  ? parseInt(selectedPeriod.value)
                  : selectedPeriod.value) / 7
              )
      }))
    }
  )

  // Trend Calculations
  const ctlChange = computed(() => {
    if (!pmcData.value?.data?.length) return 0
    const data = pmcData.value.data
    const current = data[data.length - 1]?.ctl || 0
    const start = data[0]?.ctl || 0
    return current - start
  })

  const currentWeekTss = computed(() => {
    if (!pmcData.value?.data?.length) return 0
    // Sum TSS from last 7 days
    const data = pmcData.value.data
    return data.slice(-7).reduce((sum: number, d: any) => sum + (d.tss || 0), 0)
  })

  const avgWeeklyTss = computed(() => {
    if (!pmcData.value?.data?.length) return 0
    const data = pmcData.value.data
    const totalTss = data.reduce((sum: number, d: any) => sum + (d.tss || 0), 0)
    const numWeeks = data.length / 7
    return totalTss / (numWeeks || 1)
  })

  const hrvTrend = computed(() => {
    if (!allWellness.value.length) return 0
    const recent = filteredWellness.value.filter((w) => w.hrv)
    if (recent.length < 2) return 0

    const avgRecent = recent.reduce((sum, w) => sum + w.hrv, 0) / recent.length
    // Use first 7 days as baseline if available, else first point
    const baselineDays = recent.slice(0, 7)
    const avgBaseline = baselineDays.reduce((sum, w) => sum + w.hrv, 0) / baselineDays.length

    if (avgBaseline === 0) return 0
    return ((avgRecent - avgBaseline) / avgBaseline) * 100
  })

  // Filters
  const filterRecovery = ref<string | undefined>(undefined)
  const filterSleep = ref<string | undefined>(undefined)

  // Filter options
  const recoveryStatusOptions = [
    { label: 'Excellent (>80)', value: 'excellent' },
    { label: 'Good (60-80)', value: 'good' },
    { label: 'Fair (40-60)', value: 'fair' },
    { label: 'Poor (<40)', value: 'poor' }
  ]

  const sleepQualityOptions = [
    { label: 'Excellent (>8h)', value: 'excellent' },
    { label: 'Good (7-8h)', value: 'good' },
    { label: 'Fair (6-7h)', value: 'fair' },
    { label: 'Poor (<6h)', value: 'poor' }
  ]

  // Fetch all wellness data
  async function fetchWellness() {
    loading.value = true
    try {
      // Fetch up to 180 days to support YTD and historical trends
      const wellness = await $fetch('/api/wellness', { query: { limit: 180 } })

      allWellness.value = wellness
    } catch (error) {
      console.error('Error fetching wellness:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to load wellness data',
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }

  const { formatDateUTC, getUserLocalDate } = useFormat()

  // Computed properties
  const filteredWellness = computed(() => {
    let wellness = [...allWellness.value]

    const todayUTC = getUserLocalDate()
    let startDate: Date

    if (selectedPeriod.value === 'YTD') {
      startDate = new Date(Date.UTC(todayUTC.getUTCFullYear(), 0, 1))
    } else {
      const days =
        typeof selectedPeriod.value === 'string'
          ? parseInt(selectedPeriod.value)
          : selectedPeriod.value
      startDate = new Date(todayUTC)
      startDate.setUTCDate(todayUTC.getUTCDate() - (days || 30))
    }

    wellness = wellness.filter((w) => {
      const wellnessDate = new Date(w.date)
      return wellnessDate <= todayUTC && wellnessDate >= startDate
    })

    if (filterRecovery.value) {
      wellness = wellness.filter((w) => {
        if (!w.recoveryScore) return false
        const score = w.recoveryScore
        if (filterRecovery.value === 'excellent') return score > 80
        if (filterRecovery.value === 'good') return score >= 60 && score <= 80
        if (filterRecovery.value === 'fair') return score >= 40 && score < 60
        if (filterRecovery.value === 'poor') return score < 40
        return true
      })
    }

    if (filterSleep.value) {
      wellness = wellness.filter((w) => {
        if (!w.sleepHours) return false
        const hours = w.sleepHours
        if (filterSleep.value === 'excellent') return hours > 8
        if (filterSleep.value === 'good') return hours >= 7 && hours <= 8
        if (filterSleep.value === 'fair') return hours >= 6 && hours < 7
        if (filterSleep.value === 'poor') return hours < 6
        return true
      })
    }

    return wellness
  })

  const totalDays = computed(() => filteredWellness.value.length)
  const avgRecovery = computed(() => {
    const withRecovery = filteredWellness.value.filter((w) => w.recoveryScore)
    if (withRecovery.length === 0) return null
    return withRecovery.reduce((sum, w) => sum + w.recoveryScore, 0) / withRecovery.length
  })
  const avgSleep = computed(() => {
    const withSleep = filteredWellness.value.filter((w) => w.sleepHours)
    if (withSleep.length === 0) return null
    return withSleep.reduce((sum, w) => sum + w.sleepHours, 0) / withSleep.length
  })
  const avgHRV = computed(() => {
    const withHRV = filteredWellness.value.filter((w) => w.hrv)
    if (withHRV.length === 0) return null
    return withHRV.reduce((sum, w) => sum + w.hrv, 0) / withHRV.length
  })

  const totalPages = computed(() => Math.ceil(filteredWellness.value.length / itemsPerPage))
  const visiblePages = computed(() => {
    const pages = []
    const maxVisible = 7
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages.value, start + maxVisible - 1)

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  })

  const paginatedWellness = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredWellness.value.slice(start, end)
  })

  // Functions
  function getRecoveryBadgeClass(score: number) {
    const baseClass = 'px-2 py-1 rounded text-xs font-semibold'
    if (score > 80)
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
    if (score >= 60)
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
    if (score >= 40)
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
    return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
  }

  function getMoodBadgeClass(mood: number) {
    const baseClass = 'px-2 py-1 rounded text-xs font-semibold'
    if (mood >= 8)
      return `${baseClass} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`
    if (mood >= 6)
      return `${baseClass} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`
    if (mood >= 4)
      return `${baseClass} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`
    return `${baseClass} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`
  }

  function changePage(page: number) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function navigateToWellness(id: string) {
    navigateTo(`/fitness/${id}`)
  }

  // Chart data computations
  const recoveryTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.recoveryScore)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    const settings = chartSettings.value.recovery || defaultChartSettings.recovery

    const datasets: any[] = [
      {
        type: settings.type || 'line',
        label: 'Recovery Score',
        data: recentWellness.map((w) => w.recoveryScore),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: `rgba(34, 197, 94, ${settings.opacity ?? 0.5})`,
        tension: settings.smooth ? 0.4 : 0,
        borderWidth: 2,
        pointRadius: settings.showPoints ? 3 : 0,
        pointHoverRadius: 6,
        fill: settings.type === 'line' ? 'origin' : false
      }
    ]

    // Add 7d average if enabled
    if (settings.showAverage) {
      const avgData = recentWellness.map((_, index) => {
        const start = Math.max(0, index - 6)
        const window = recentWellness.slice(start, index + 1)
        const sum = window.reduce((acc, curr) => acc + curr.recoveryScore, 0)
        return sum / window.length
      })

      datasets.push({
        type: 'line',
        label: '7d Average',
        data: avgData,
        borderColor: 'rgba(34, 197, 94, 0.3)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: settings.smooth ? 0.4 : 0,
        fill: false
      })
    }

    // Target Line
    if (settings.showTarget && settings.targetValue !== undefined) {
      datasets.push({
        type: 'line',
        label: 'Target',
        data: new Array(labels.length).fill(settings.targetValue),
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderDash: [2, 2],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      })
    }

    return {
      labels,
      datasets
    }
  })

  // Helper to build datasets based on per-chart settings
  function getChartDataset(key: string, data: any[], color: string, label: string) {
    const settings = chartSettings.value[key] || defaultChartSettings[key] || {}
    const datasets: any[] = [
      {
        type: settings.type || 'line',
        label,
        data,
        borderColor: color,
        backgroundColor: color.replace('rgb', 'rgba').replace(')', `, ${settings.opacity ?? 0.5})`),
        tension: settings.smooth ? 0.4 : 0,
        borderWidth: 2,
        pointRadius: settings.showPoints ? 3 : 0,
        pointHoverRadius: 6,
        fill: settings.type === 'line' ? 'origin' : false
      }
    ]

    // 7d Rolling Average
    if (settings.show7dAvg) {
      const avgData = data.map((_, index) => {
        const start = Math.max(0, index - 6)
        const window = data.slice(start, index + 1)
        const sum = window.reduce((acc, curr) => acc + curr, 0)
        return sum / window.length
      })

      datasets.push({
        type: 'line',
        label: '7d Avg',
        data: avgData,
        borderColor: color.replace('rgb', 'rgba').replace(')', ', 0.4)'),
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: settings.smooth ? 0.4 : 0,
        fill: false
      })
    }

    // 30d Rolling Average (Baseline)
    if (settings.show30dAvg) {
      const avgData = data.map((_, index) => {
        const start = Math.max(0, index - 29)
        const window = data.slice(start, index + 1)
        const sum = window.reduce((acc, curr) => acc + curr, 0)
        return sum / window.length
      })

      datasets.push({
        type: 'line',
        label: '30d Avg',
        data: avgData,
        borderColor: color.replace('rgb', 'rgba').replace(')', ', 0.3)'),
        backgroundColor: 'transparent',
        borderDash: [2, 2],
        borderWidth: 1.5,
        pointRadius: 0,
        tension: settings.smooth ? 0.4 : 0,
        fill: false
      })
    }

    // Median
    if (settings.showMedian) {
      const sorted = [...data].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2

      datasets.push({
        type: 'line',
        label: 'Median',
        data: new Array(data.length).fill(median),
        borderColor: 'rgba(148, 163, 184, 0.4)',
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      })
    }

    if (settings.showTarget && settings.targetValue !== undefined) {
      datasets.push({
        type: 'line',
        label: 'Target',
        data: new Array(data.length).fill(settings.targetValue),
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderDash: [2, 2],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      })
    }

    return datasets
  }

  const sleepTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.sleepHours)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    return {
      labels,
      datasets: getChartDataset(
        'sleep',
        recentWellness.map((w) => w.sleepHours),
        'rgb(59, 130, 246)',
        'Hours'
      )
    }
  })

  const hrvTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.hrv)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    return {
      labels,
      datasets: getChartDataset(
        'hrv',
        recentWellness.map((w) => w.hrv),
        'rgb(168, 85, 247)',
        'HRV (rMSSD)'
      )
    }
  })

  const restingHrTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.restingHr)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    return {
      labels,
      datasets: getChartDataset(
        'restingHr',
        recentWellness.map((w) => w.restingHr),
        'rgb(239, 68, 68)',
        'Resting HR (bpm)'
      )
    }
  })

  const weightTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.weight)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    return {
      labels,
      datasets: getChartDataset(
        'weight',
        recentWellness.map((w) => w.weight),
        'rgb(249, 115, 22)',
        'Weight (kg)'
      )
    }
  })

  const bpTrendData = computed(() => {
    const recentWellness = [...filteredWellness.value]
      .filter((w) => w.systolic || w.diastolic)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const labels = recentWellness.map((w) =>
      new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    )

    const datasets: any[] = []
    const settings = chartSettings.value.bp || defaultChartSettings.bp || {}

    datasets.push({
      type: settings.type || 'line',
      label: 'Systolic',
      data: recentWellness.map((w) => w.systolic),
      borderColor: 'rgb(236, 72, 153)',
      backgroundColor: `rgba(236, 72, 153, ${settings.opacity ?? 0.5})`,
      tension: settings.smooth ? 0.4 : 0,
      borderWidth: 2,
      pointRadius: settings.showPoints ? 3 : 0,
      pointHoverRadius: 6,
      fill: settings.type === 'line' ? 'origin' : false
    })

    datasets.push({
      type: settings.type || 'line',
      label: 'Diastolic',
      data: recentWellness.map((w) => w.diastolic),
      borderColor: 'rgb(14, 165, 233)',
      backgroundColor: `rgba(14, 165, 233, ${settings.opacity ?? 0.5})`,
      tension: settings.smooth ? 0.4 : 0,
      borderWidth: 2,
      pointRadius: settings.showPoints ? 3 : 0,
      pointHoverRadius: 6,
      fill: settings.type === 'line' ? 'origin' : false
    })

    if (settings.showTarget && settings.targetValue !== undefined) {
      datasets.push({
        type: 'line',
        label: 'Target',
        data: new Array(labels.length).fill(settings.targetValue),
        borderColor: 'rgba(148, 163, 184, 0.5)',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      })
    }

    return {
      labels,
      datasets
    }
  })

  // Chart options
  const baseChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 10 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme.isDark.value ? '#111827' : '#ffffff',
        titleColor: theme.isDark.value ? '#f3f4f6' : '#111827',
        bodyColor: theme.isDark.value ? '#d1d5db' : '#374151',
        borderColor: theme.isDark.value ? '#374151' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 7,
          maxRotation: 0
        },
        border: { display: false }
      },
      y: {
        position: 'right' as const,
        grid: {
          color: theme.isDark.value ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
          drawTicks: false
        },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 'bold' as const },
          maxTicksLimit: 5
        },
        border: { display: false }
      }
    }
  }))

  function getChartOptions(key: string, type: 'line' | 'bar') {
    const opts = JSON.parse(JSON.stringify(baseChartOptions.value))
    const settings = chartSettings.value[key] || defaultChartSettings[key] || {}

    // Show legend if any analysis overlays or multi-datasets are active
    const hasOverlays = settings.show7dAvg || settings.show30dAvg || settings.showMedian || settings.showTarget || key === 'bp'

    opts.plugins.legend = {
      display: !!hasOverlays,
      position: 'bottom',
      labels: {
        color: '#94a3b8',
        font: { size: 10, weight: 'bold' as const },
        usePointStyle: true,
        boxWidth: 6
      }
    }

    // Set common defaults for bars
    if (type === 'bar') {
      opts.scales.y.beginAtZero = true
    }

    // Metric specific overrides
    if (key === 'recovery') {
      opts.plugins.tooltip.callbacks = {
        label: (context: any) => `${context.dataset.label}: ${context.parsed.y.toFixed(0)}%`
      }
      opts.scales.y.min = 0
      opts.scales.y.max = 100
    } else if (key === 'sleep') {
      opts.plugins.tooltip.callbacks = {
        label: (context: any) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}h`
      }
      opts.scales.y.max = 12
    } else if (key === 'hrv') {
      opts.plugins.tooltip.callbacks = {
        label: (context: any) => `${context.dataset.label}: ${context.parsed.y.toFixed(0)}ms`
      }
      opts.scales.y.beginAtZero = true
    } else if (key === 'restingHr') {
      opts.plugins.tooltip.callbacks = {
        label: (context: any) => `${context.dataset.label}: ${context.parsed.y.toFixed(0)} bpm`
      }
      opts.scales.y.beginAtZero = false
    } else if (key === 'weight') {
      opts.plugins.tooltip.callbacks = {
        label: (context: any) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}kg`
      }
      opts.scales.y.beginAtZero = false
    }

    return opts
  }

  watch([selectedPeriod], () => {
    currentPage.value = 1
  })

  // Load data on mount
  onMounted(() => {
    fetchWellness()
  })

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
</script>
