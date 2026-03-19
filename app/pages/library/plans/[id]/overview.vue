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
            <UButton
              color="primary"
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
      <div class="p-4 sm:p-6">
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
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { buildPublicPlanPath, getPublicSportByValue } from '../../../../../shared/public-plans'

  const route = useRoute()
  const { formatDateUTC, formatDuration } = useFormat()

  const { data, pending } = await useFetch(`/api/library/plans/${route.params.id}/architect`)

  const plan = computed<any | null>(() => data.value || null)

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

  useSeoMeta({
    title: computed(() => (plan.value?.name ? `${plan.value.name} Overview` : 'Plan Overview'))
  })

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
</script>
