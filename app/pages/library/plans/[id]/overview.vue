<template>
  <UDashboardPanel id="plan-overview">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <div class="flex items-center gap-1">
            <UDashboardSidebarCollapse />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-chevron-left"
              @click="navigateTo('/library/plans')"
            />
          </div>
        </template>

        <template #title>
          <span>{{ plan?.name || 'Plan Overview' }}</span>
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              v-if="publicPagePath"
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-heroicons-arrow-top-right-on-square"
              @click="openPublicPage"
            >
              Visit public page
            </UButton>
            <UButton color="primary" size="sm" icon="i-heroicons-play" @click="openUseModal">
              Use
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-heroicons-pencil-square"
              @click="navigateTo(`/library/plans/${route.params.id}/architect`)"
            >
              Edit structure
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="px-4 py-4 sm:p-6">
        <div v-if="pending" class="space-y-4">
          <UCard v-for="item in 3" :key="item">
            <USkeleton class="h-32 w-full" />
          </UCard>
        </div>

        <div v-else-if="!plan">
          <UAlert
            color="error"
            variant="soft"
            title="Plan not found"
            description="The requested training plan could not be loaded."
          />
        </div>

        <div v-else class="space-y-6">
          <section class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <UCard>
              <template #header>
                <div>
                  <h2 class="text-xl font-bold text-highlighted">
                    {{ plan.name || 'Untitled Plan' }}
                  </h2>
                  <p class="mt-1 text-sm text-muted">
                    {{ plan.description || 'No internal description added yet.' }}
                  </p>
                </div>
              </template>

              <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div class="rounded-2xl border border-default bg-muted/20 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Blocks
                  </div>
                  <div class="mt-2 text-2xl font-black text-highlighted">{{ totalBlocks }}</div>
                </div>
                <div class="rounded-2xl border border-default bg-muted/20 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Weeks
                  </div>
                  <div class="mt-2 text-2xl font-black text-highlighted">{{ totalWeeks }}</div>
                </div>
                <div class="rounded-2xl border border-default bg-muted/20 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Workouts
                  </div>
                  <div class="mt-2 text-2xl font-black text-highlighted">{{ totalWorkouts }}</div>
                </div>
                <div class="rounded-2xl border border-default bg-muted/20 p-4">
                  <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                    Sample weeks
                  </div>
                  <div class="mt-2 text-2xl font-black text-highlighted">{{ sampleWeekCount }}</div>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <div>
                  <h2 class="text-lg font-bold text-highlighted">Publishing</h2>
                  <p class="mt-1 text-sm text-muted">
                    Quick status for how this plan is exposed publicly.
                  </p>
                </div>
              </template>

              <div class="space-y-4">
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    :color="plan.visibility === 'PUBLIC' ? 'success' : 'neutral'"
                    variant="soft"
                  >
                    {{ plan.visibility === 'PUBLIC' ? 'Publicly listed' : 'Private' }}
                  </UBadge>
                  <UBadge
                    :color="
                      plan.accessState === 'FREE'
                        ? 'success'
                        : plan.accessState === 'RESTRICTED'
                          ? 'warning'
                          : 'neutral'
                    "
                    variant="soft"
                  >
                    {{ formatAccessState(plan.accessState) }}
                  </UBadge>
                  <UBadge v-if="plan.skillLevel" color="neutral" variant="soft">
                    {{ formatLabel(plan.skillLevel) }}
                  </UBadge>
                </div>

                <dl class="space-y-3 text-sm">
                  <div class="flex items-start justify-between gap-4">
                    <dt class="text-muted">Primary sport</dt>
                    <dd class="text-right text-highlighted">{{ sportLabel || 'Not set' }}</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4">
                    <dt class="text-muted">Subtype</dt>
                    <dd class="text-right text-highlighted">
                      {{ plan.sportSubtype || 'Not set' }}
                    </dd>
                  </div>
                  <div class="flex items-start justify-between gap-4">
                    <dt class="text-muted">Language</dt>
                    <dd class="text-right text-highlighted">
                      {{ plan.planLanguage || 'Not set' }}
                    </dd>
                  </div>
                  <div class="flex items-start justify-between gap-4">
                    <dt class="text-muted">Days per week</dt>
                    <dd class="text-right text-highlighted">{{ plan.daysPerWeek || 'Not set' }}</dd>
                  </div>
                  <div class="flex items-start justify-between gap-4">
                    <dt class="text-muted">Canonical slug</dt>
                    <dd class="max-w-[14rem] truncate text-right text-highlighted">
                      {{ plan.slug || 'Not set' }}
                    </dd>
                  </div>
                </dl>

                <UButton
                  color="neutral"
                  variant="soft"
                  block
                  icon="i-heroicons-pencil-square"
                  @click="navigateTo(`/library/plans/${route.params.id}/architect`)"
                >
                  Edit details & publishing
                </UButton>
              </div>
            </UCard>
          </section>

          <!-- Plan Metrics Section -->
          <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <!-- Weekly TSS & Duration Chart -->
            <UCard class="md:col-span-2">
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-bold text-highlighted">Weekly Volume & Load</h2>
                  <div class="flex gap-4 text-xs">
                    <div class="flex items-center gap-1.5">
                      <div class="h-3 w-3 rounded-sm bg-primary-500"></div>
                      <span class="text-muted">Duration (h)</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <div class="h-3 w-3 rounded-full bg-warning-500"></div>
                      <span class="text-muted">TSS</span>
                    </div>
                  </div>
                </div>
              </template>
              <div class="h-64">
                <ClientOnly>
                  <Bar
                    v-if="weeklyMetricsChartData"
                    :data="weeklyMetricsChartData as any"
                    :options="weeklyMetricsChartOptions"
                  />
                </ClientOnly>
              </div>
            </UCard>

            <!-- Sport Distribution Chart -->
            <UCard>
              <template #header>
                <h2 class="text-lg font-bold text-highlighted">Activity Mix</h2>
              </template>
              <div class="h-64">
                <ClientOnly>
                  <Doughnut
                    v-if="sportDistributionChartData"
                    :data="sportDistributionChartData"
                    :options="doughnutOptions"
                  />
                </ClientOnly>
              </div>
            </UCard>

            <!-- Category Distribution Chart -->
            <UCard>
              <template #header>
                <h2 class="text-lg font-bold text-highlighted">Intensity Focus</h2>
              </template>
              <div class="h-64">
                <ClientOnly>
                  <Doughnut
                    v-if="categoryDistributionChartData"
                    :data="categoryDistributionChartData"
                    :options="doughnutOptions"
                  />
                </ClientOnly>
              </div>
            </UCard>
          </section>

          <section class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <UCard>
              <template #header>
                <div>
                  <h2 class="text-lg font-bold text-highlighted">Plan structure</h2>
                  <p class="mt-1 text-sm text-muted">
                    Review each block and week before jumping into the architect.
                  </p>
                </div>
              </template>

              <div class="space-y-4">
                <div
                  v-for="block in plan.blocks"
                  :key="block.id"
                  class="rounded-2xl border border-default bg-default/90 p-4"
                >
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div class="text-lg font-bold text-highlighted">{{ block.name }}</div>
                      <p v-if="block.description" class="mt-1 text-sm text-muted">
                        {{ block.description }}
                      </p>
                    </div>
                    <UBadge color="neutral" variant="soft">
                      {{ block.weeks?.length || 0 }}
                      {{ block.weeks?.length === 1 ? 'week' : 'weeks' }}
                    </UBadge>
                  </div>

                  <div class="mt-4 grid gap-3 md:grid-cols-2">
                    <div
                      v-for="week in block.weeks"
                      :key="week.id"
                      class="rounded-xl border border-default bg-muted/20 p-4"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <div class="font-semibold text-highlighted">
                            Week {{ week.weekNumber }}
                          </div>
                          <div class="mt-1 text-xs text-muted">
                            {{ formatDateRange(week.startDate, week.endDate) }}
                          </div>
                        </div>
                        <UBadge
                          v-if="sampleWeekIds.has(week.id)"
                          color="warning"
                          variant="soft"
                          size="sm"
                        >
                          Sample
                        </UBadge>
                      </div>

                      <p v-if="week.focus" class="mt-3 text-sm text-muted">
                        {{ week.focus }}
                      </p>

                      <div class="mt-3 flex flex-wrap gap-3 text-xs text-muted">
                        <span>{{ week.workouts?.length || 0 }} workouts</span>
                        <span>{{ getWeekDuration(week) }}</span>
                        <span>{{ getWeekTss(week) }} TSS</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>

            <div class="space-y-6">
              <UCard>
                <template #header>
                  <div>
                    <h2 class="text-lg font-bold text-highlighted">Public copy</h2>
                    <p class="mt-1 text-sm text-muted">
                      This is what visitors will see on the public-facing plan page.
                    </p>
                  </div>
                </template>

                <div class="space-y-4">
                  <div>
                    <div class="text-xs font-black uppercase tracking-[0.2em] text-muted">
                      Headline
                    </div>
                    <p class="mt-2 text-sm text-highlighted">
                      {{ plan.publicHeadline || 'No public headline added yet.' }}
                    </p>
                  </div>

                  <div>
                    <div class="text-xs font-black uppercase tracking-[0.2em] text-muted">
                      Description
                    </div>
                    <p class="mt-2 whitespace-pre-wrap text-sm text-muted">
                      {{ plan.publicDescription || 'No public description added yet.' }}
                    </p>
                  </div>

                  <div>
                    <div class="text-xs font-black uppercase tracking-[0.2em] text-muted">
                      Methodology
                    </div>
                    <p class="mt-2 whitespace-pre-wrap text-sm text-muted">
                      {{ plan.methodology || 'No methodology notes added yet.' }}
                    </p>
                  </div>
                </div>
              </UCard>
            </div>
          </section>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal
    v-model:open="isUseModalOpen"
    title="Use Plan"
    description="Choose when this plan should start and who it should be applied to."
  >
    <template #body>
      <div class="space-y-4 p-4">
        <UFormField label="Start Date">
          <UInput v-model="startDate" type="date" />
        </UFormField>

        <UFormField v-if="isCoachingMode && athleteTargetOptions.length > 1" label="Apply To">
          <USelectMenu
            v-model="selectedTargetUserId"
            value-key="value"
            :items="athleteTargetOptions"
            placeholder="Choose target"
          />
        </UFormField>

        <UCheckbox
          v-model="replaceFutureWorkouts"
          label="Replace future workouts from start date"
          description="Remove incomplete planned workouts on or after the selected start date before applying this plan."
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isUseModalOpen = false">Cancel</UButton>
        <UButton color="primary" :loading="isApplyingPlan" @click="confirmUsePlan"
          >Apply Plan</UButton
        >
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { buildPublicPlanPath, getPublicSportByValue } from '#shared/public-plans'
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Filler
  } from 'chart.js'
  import { Bar, Doughnut } from 'vue-chartjs'

  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Filler
  )

  const route = useRoute()
  const { formatDateUTC, formatDuration, getUserLocalDate } = useFormat()
  const toast = useToast()
  const coachingStore = useCoachingStore()

  const { data, pending } = (await useAsyncData(`library-plan-architect-${route.params.id}`, () =>
    ($fetch as any)(`/api/library/plans/${route.params.id}/architect`)
  )) as any
  const { data: coachedAthletes } = (await useAsyncData<any[]>(
    'coached-athletes',
    () => ($fetch as any)('/api/coaching/athletes'),
    {
      server: false,
      default: () => [],
      immediate: coachingStore.isCoachingMode
    }
  )) as any

  const plan = computed<any | null>(() => data.value || null)
  const isCoachingMode = computed(() => coachingStore.isCoachingMode)
  const isUseModalOpen = ref(false)
  const isApplyingPlan = ref(false)
  const startDate = ref(getUserLocalDate().toISOString().split('T')[0])
  const selectedTargetUserId = ref<string>('self')
  const replaceFutureWorkouts = ref(false)

  const totalBlocks = computed(() => plan.value?.blocks?.length || 0)
  const totalWeeks = computed(
    () =>
      plan.value?.blocks?.reduce(
        (sum: number, block: any) => sum + (block.weeks?.length || 0),
        0
      ) || 0
  )
  const totalWorkouts = computed(
    () =>
      plan.value?.blocks?.reduce(
        (sum: number, block: any) =>
          sum +
          (block.weeks?.reduce(
            (weekSum: number, week: any) => weekSum + (week.workouts?.length || 0),
            0
          ) || 0),
        0
      ) || 0
  )
  const sampleWeekIds = computed(
    () => new Set((plan.value?.sampleWeeks || []).map((sampleWeek: any) => sampleWeek.weekId))
  )
  const sampleWeekCount = computed(() => sampleWeekIds.value.size)
  const sportLabel = computed(() => getPublicSportByValue(plan.value?.primarySport)?.label || null)
  const publicPagePath = computed(() => {
    if (!plan.value || plan.value.visibility !== 'PUBLIC') return null
    return buildPublicPlanPath(plan.value)
  })
  const athleteTargetOptions = computed(() => {
    const base = [{ label: 'My calendar', value: 'self' }]
    const athletes = (coachedAthletes.value || []).map((entry: any) => ({
      label: entry.athlete?.name || entry.athlete?.email || 'Athlete',
      value: entry.athleteId
    }))
    return [...base, ...athletes]
  })

  useSeoMeta({
    title: computed(() => (plan.value?.name ? `${plan.value.name} Overview` : 'Plan Overview'))
  })

  // --- Chart Data Computation ---

  const weeksList = computed(() => {
    if (!plan.value?.blocks) return []
    const allWeeks: any[] = []
    plan.value.blocks.forEach((block: any) => {
      if (block.weeks) {
        allWeeks.push(...block.weeks)
      }
    })
    return allWeeks
  })

  const weeklyMetricsChartData = computed(() => {
    if (!weeksList.value.length) return null

    const labels = weeksList.value.map((_, i) => `Week ${i + 1}`)
    const tssData = weeksList.value.map((week) => {
      return week.workouts?.reduce((sum: number, w: any) => sum + (Number(w.tss) || 0), 0) || 0
    })
    const durationData = weeksList.value.map((week) => {
      const seconds =
        week.workouts?.reduce((sum: number, w: any) => sum + (Number(w.durationSec) || 0), 0) || 0
      return Math.round((seconds / 3600) * 10) / 10
    })

    return {
      labels,
      datasets: [
        {
          label: 'Duration (h)',
          data: durationData,
          backgroundColor: '#3b82f6', // blue-500
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'TSS',
          data: tssData,
          borderColor: '#f59e0b', // warning-500
          backgroundColor: '#f59e0b',
          type: 'line' as const,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1'
        }
      ]
    }
  })

  const weeklyMetricsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        padding: 12,
        borderRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af' }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: '#9ca3af' },
        title: { display: true, text: 'Hours', color: '#9ca3af' }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { color: '#9ca3af' },
        title: { display: true, text: 'TSS', color: '#9ca3af' }
      }
    }
  }

  const sportDistributionChartData = computed(() => {
    if (!plan.value?.blocks) return null

    const sportCounts: Record<string, number> = {}
    weeksList.value.forEach((week) => {
      week.workouts?.forEach((workout: any) => {
        const type = workout.type || 'Other'
        sportCounts[type] = (sportCounts[type] || 0) + 1
      })
    })

    const labels = Object.keys(sportCounts)
    const data = Object.values(sportCounts)

    if (!labels.length) return null

    const colors: Record<string, string> = {
      Ride: '#ef4444',
      VirtualRide: '#ef4444',
      Run: '#3b82f6',
      Swim: '#0ea5e9',
      WeightTraining: '#f59e0b',
      Gym: '#f59e0b',
      Walk: '#10b981',
      Yoga: '#8b5cf6',
      Other: '#9ca3af'
    }

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((l) => colors[l] || '#6366f1'),
          borderWidth: 0,
          hoverOffset: 10
        }
      ]
    }
  })

  const categoryDistributionChartData = computed(() => {
    if (!plan.value?.blocks) return null

    const categoryCounts: Record<string, number> = {}
    weeksList.value.forEach((week) => {
      week.workouts?.forEach((workout: any) => {
        const cat = workout.category || 'Other'
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })
    })

    const labels = Object.keys(categoryCounts)
    const data = Object.values(categoryCounts)

    if (!labels.length) return null

    const colors: Record<string, string> = {
      Endurance: '#10b981', // emerald-500
      Recovery: '#34d399', // emerald-400
      Threshold: '#f59e0b', // warning-500
      VO2Max: '#ef4444', // error-500
      Anaerobic: '#ec4899', // pink-500
      SweetSpot: '#fbbf24', // amber-400
      Sprint: '#8b5cf6', // purple-500
      Other: '#9ca3af'
    }

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: labels.map((l) => colors[l] || '#6366f1'),
          borderWidth: 0,
          hoverOffset: 10
        }
      ]
    }
  })

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#9ca3af',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 11 }
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        padding: 12,
        borderRadius: 8
      }
    },
    cutout: '70%'
  }

  // --- End of Chart Data ---

  function formatAccessState(value?: string | null) {
    if (value === 'FREE') return 'Free'
    if (value === 'RESTRICTED') return 'Restricted preview'
    return 'Private access'
  }

  function formatLabel(value?: string | null) {
    return (value || '')
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')
  }

  function formatDateRange(start?: string | Date | null, end?: string | Date | null) {
    if (!start || !end) return 'Dates not set'
    return `${formatDateUTC(start, 'MMM d')} - ${formatDateUTC(end, 'MMM d')}`
  }

  function getWeekDuration(week: any) {
    const durationSec =
      week?.workouts?.reduce(
        (sum: number, workout: any) => sum + (Number(workout.durationSec) || 0),
        0
      ) || 0
    return durationSec > 0 ? formatDuration(durationSec) : 'No duration'
  }

  function getWeekTss(week: any) {
    const tss =
      week?.workouts?.reduce((sum: number, workout: any) => sum + (Number(workout.tss) || 0), 0) ||
      0
    return Math.round(tss || 0)
  }

  function openPublicPage() {
    if (!publicPagePath.value || !import.meta.client) return
    window.open(publicPagePath.value, '_blank', 'noopener,noreferrer')
  }

  function openUseModal() {
    selectedTargetUserId.value = 'self'
    startDate.value = getUserLocalDate().toISOString().split('T')[0]
    replaceFutureWorkouts.value = false
    isUseModalOpen.value = true
  }

  async function confirmUsePlan() {
    if (!plan.value?.id) return

    isApplyingPlan.value = true
    try {
      if (selectedTargetUserId.value === 'self') {
        await $fetch(`/api/plans/${plan.value.id}/activate`, {
          method: 'POST',
          body: {
            startDate: new Date(`${startDate.value}T00:00:00`).toISOString()
          }
        })

        toast.add({
          title: 'Plan activated',
          description: 'The plan was applied to your calendar.',
          color: 'success'
        })
        isUseModalOpen.value = false
        await navigateTo('/plan')
        return
      }

      const response: any = await $fetch(`/api/library/plans/${plan.value.id}/apply`, {
        method: 'POST',
        body: {
          startDate: new Date(`${startDate.value}T00:00:00`).toISOString(),
          athleteId: selectedTargetUserId.value,
          replaceFutureWorkouts: replaceFutureWorkouts.value
        }
      })

      toast.add({
        title: 'Plan applied',
        description:
          `${response.createdCount} workout${response.createdCount === 1 ? '' : 's'} added` +
          (response.deletedCount
            ? `, ${response.deletedCount} future workout${response.deletedCount === 1 ? '' : 's'} removed.`
            : '.'),
        color: 'success'
      })

      isUseModalOpen.value = false
      await navigateTo(`/coaching/calendar?athlete=${selectedTargetUserId.value}`)
    } catch (error: any) {
      toast.add({
        title: 'Could not apply plan',
        description: error?.data?.message || 'Please try again.',
        color: 'error'
      })
    } finally {
      isApplyingPlan.value = false
    }
  }
</script>
