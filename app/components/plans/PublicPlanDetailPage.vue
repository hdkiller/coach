<template>
  <div class="relative overflow-hidden bg-default/50">
    <div class="absolute inset-x-0 top-0 h-[30rem] border-b border-default/10 bg-default/5"></div>

    <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <NuxtLink to="/" class="transition-colors hover:text-primary">Home</NuxtLink>
        <span>/</span>
        <NuxtLink to="/training-plans" class="transition-colors hover:text-primary">
          Training Plans
        </NuxtLink>
        <template v-if="plan?.primarySport && sportBrowsePath">
          <span>/</span>
          <NuxtLink :to="sportBrowsePath" class="transition-colors hover:text-primary">
            {{ sportLabel }}
          </NuxtLink>
        </template>
        <template v-if="plan?.sportSubtype && subtypeBrowsePath">
          <span>/</span>
          <NuxtLink :to="subtypeBrowsePath" class="transition-colors hover:text-primary">
            {{ plan.sportSubtype }}
          </NuxtLink>
        </template>
        <template v-if="plan?.name">
          <span>/</span>
          <span class="text-highlighted">{{ plan.name }}</span>
        </template>
      </div>

      <div v-if="pending" class="space-y-6">
        <USkeleton class="h-28 w-full rounded-[2rem]" />
        <USkeleton class="h-[520px] w-full rounded-[2rem]" />
      </div>

      <div
        v-else-if="!plan"
        class="rounded-[2rem] border border-default/70 bg-default/80 p-12 text-center"
      >
        <h1 class="text-2xl font-black tracking-tight text-highlighted">Plan not found</h1>
        <p class="mt-3 text-sm text-muted">
          This public plan may have been removed or is no longer listed.
        </p>
        <UButton to="/training-plans" color="primary" class="mt-6">Browse plans</UButton>
      </div>

      <div v-else class="space-y-8">
        <section
          class="overflow-hidden rounded-[2.2rem] border border-default/70 bg-default shadow-sm"
        >
          <div class="p-6 sm:p-8 lg:p-10">
            <div class="flex flex-wrap gap-2">
              <UBadge color="primary" variant="soft">{{ sportLabel }}</UBadge>
              <UBadge v-if="plan.sportSubtype" color="neutral" variant="soft">{{
                plan.sportSubtype
              }}</UBadge>
              <UBadge v-if="skillLabel" color="neutral" variant="soft">{{ skillLabel }}</UBadge>
              <UBadge :color="plan.accessState === 'FREE' ? 'success' : 'warning'" variant="soft">
                {{ plan.accessState === 'FREE' ? 'Free' : 'Restricted preview' }}
              </UBadge>
              <UBadge v-if="plan.goalLabel" color="neutral" variant="soft">{{
                plan.goalLabel
              }}</UBadge>
            </div>

            <h1
              class="mt-4 max-w-4xl text-3xl font-black tracking-tight text-highlighted sm:text-4xl lg:text-5xl"
            >
              {{ plan.name }}
            </h1>
            <p
              v-if="plan.publicHeadline"
              class="mt-3 max-w-3xl text-base leading-7 text-muted sm:text-lg"
            >
              {{ plan.publicHeadline }}
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div
                class="rounded-2xl border border-default/60 bg-muted/5 p-3 transition-colors hover:bg-muted/10"
              >
                <div
                  class="text-[9px] font-black uppercase tracking-[0.18em] text-muted leading-none"
                >
                  Length
                </div>
                <div class="mt-1.5 text-base font-bold text-highlighted">
                  {{ plan.lengthWeeks }} weeks
                </div>
              </div>
              <div
                class="rounded-2xl border border-default/60 bg-muted/5 p-3 transition-colors hover:bg-muted/10"
              >
                <div
                  class="text-[9px] font-black uppercase tracking-[0.18em] text-muted leading-none"
                >
                  Days / week
                </div>
                <div class="mt-1.5 text-base font-bold text-highlighted">
                  {{ plan.daysPerWeek || 'Flexible' }}
                </div>
              </div>
              <div
                class="rounded-2xl border border-default/60 bg-muted/5 p-3 transition-colors hover:bg-muted/10"
              >
                <div
                  class="text-[9px] font-black uppercase tracking-[0.18em] text-muted leading-none"
                >
                  Skill
                </div>
                <div class="mt-1.5 text-base font-bold text-highlighted">
                  {{ skillLabel || 'Not specified' }}
                </div>
              </div>
              <div
                class="rounded-2xl border border-default/60 bg-muted/5 p-3 transition-colors hover:bg-muted/10"
              >
                <div
                  class="text-[9px] font-black uppercase tracking-[0.18em] text-muted leading-none"
                >
                  Language
                </div>
                <div class="mt-1.5 text-base font-bold text-highlighted">
                  {{ plan.planLanguage || 'English' }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_360px]">
          <div class="space-y-6">
            <!-- Progression Chart -->
            <section
              class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h2 class="text-2xl font-black tracking-tight text-highlighted">
                    Plan Progression
                  </h2>
                  <p class="mt-1 text-sm text-muted">Visual overview of weekly training volume.</p>
                </div>
                <div class="flex rounded-lg border border-default/70 p-1 bg-muted/5">
                  <button
                    class="px-3 py-1 text-xs font-bold rounded-md transition-colors"
                    :class="
                      chartMetric === 'tss'
                        ? 'bg-default text-primary shadow-sm'
                        : 'text-muted hover:text-highlighted'
                    "
                    @click="chartMetric = 'tss'"
                  >
                    TSS
                  </button>
                  <button
                    class="px-3 py-1 text-xs font-bold rounded-md transition-colors"
                    :class="
                      chartMetric === 'minutes'
                        ? 'bg-default text-primary shadow-sm'
                        : 'text-muted hover:text-highlighted'
                    "
                    @click="chartMetric = 'minutes'"
                  >
                    Duration
                  </button>
                </div>
              </div>

              <div class="h-[340px] w-full">
                <PlanArchitectTimelineChart
                  v-if="chartWeeks.length"
                  :weeks="chartWeeks"
                  :block-ranges="blockRanges"
                  :metric="chartMetric"
                />
              </div>
            </section>

            <!-- Detailed Schedule -->
            <section
              class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="text-2xl font-black tracking-tight text-highlighted">
                    {{ plan.previewMode ? 'Sample weeks' : 'Plan structure' }}
                  </h2>
                  <p class="mt-1 text-sm text-muted">
                    {{
                      plan.previewMode
                        ? 'A curated preview of the plan structure.'
                        : 'The complete public plan structure.'
                    }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <UButton size="xs" color="neutral" variant="ghost" @click="expandAllBlocks">
                    Expand all
                  </UButton>
                  <UButton size="xs" color="neutral" variant="ghost" @click="collapseAllBlocks">
                    Collapse all
                  </UButton>
                  <UBadge color="neutral" variant="soft">{{ visibleWeekCount }} weeks shown</UBadge>
                </div>
              </div>

              <div class="mt-6 space-y-4">
                <div
                  v-for="block in plan.blocks"
                  :key="block.id"
                  class="overflow-hidden rounded-[1.5rem] border border-default/70"
                >
                  <button
                    class="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/5"
                    :class="
                      isBlockExpanded(block.id)
                        ? 'bg-muted/5 border-b border-default/70'
                        : 'bg-default'
                    "
                    @click="toggleBlock(block.id)"
                  >
                    <div class="flex items-center gap-4">
                      <div
                        class="h-10 w-1 rounded-full"
                        :style="{ backgroundColor: getBlockTypeColor(block.type) }"
                      />
                      <div>
                        <h3 class="text-xl font-bold text-highlighted">{{ block.name }}</h3>
                        <div class="flex items-center gap-2 text-sm text-muted">
                          <span>{{ block.type }}</span>
                          <span>•</span>
                          <span>{{ block.weeks.length }} weeks</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-4">
                      <div class="hidden text-right sm:block">
                        <div class="text-xs font-bold uppercase tracking-wider text-muted">
                          Block Totals
                        </div>
                        <div class="text-sm font-medium text-highlighted">
                          {{ getBlockTss(block) }} TSS •
                          {{ formatDuration(getBlockMinutes(block) * 60) }}
                        </div>
                      </div>
                      <UIcon
                        name="i-heroicons-chevron-down"
                        class="h-5 w-5 text-muted transition-transform duration-200"
                        :class="{ 'rotate-180': isBlockExpanded(block.id) }"
                      />
                    </div>
                  </button>

                  <div v-if="isBlockExpanded(block.id)" class="bg-muted/5 p-5">
                    <UTabs
                      v-model="selectedWeekIdMap[block.id]"
                      :items="
                        block.weeks.map((week: any) => ({
                          label: `Week ${week.weekNumber}`,
                          value: week.id,
                          icon: plan.sampleWeekIds.includes(week.id)
                            ? 'i-heroicons-star'
                            : undefined
                        }))
                      "
                      variant="pill"
                      color="neutral"
                      class="w-full"
                    >
                      <template #content>
                        <div
                          v-if="getSelectedWeek(block)"
                          class="mt-4 rounded-[1.25rem] border border-default/60 bg-default p-5 shadow-sm"
                        >
                          <div class="flex items-center justify-between gap-3">
                            <div>
                              <div class="text-lg font-bold text-highlighted">
                                Week {{ getSelectedWeek(block).weekNumber }} Overview
                              </div>
                              <div class="mt-1 text-sm text-muted">
                                {{ weekDateRange(getSelectedWeek(block)) }}
                              </div>
                            </div>
                            <div class="flex items-center gap-3">
                              <UBadge
                                v-if="plan.sampleWeekIds.includes(getSelectedWeek(block).id)"
                                color="warning"
                                variant="soft"
                              >
                                Sample Week
                              </UBadge>
                              <div class="text-sm font-black text-primary tabular-nums">
                                {{ getSelectedWeek(block).tssTarget }} TSS
                              </div>
                            </div>
                          </div>

                          <p
                            v-if="getSelectedWeek(block).focus"
                            class="mt-4 text-base leading-7 text-muted border-l-2 border-primary/20 pl-4"
                          >
                            {{ getSelectedWeek(block).focus }}
                          </p>

                          <div class="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div
                              v-for="workout in getSelectedWeek(block).workouts"
                              :key="workout.id"
                              class="rounded-xl border border-default/50 bg-muted/5 px-4 py-4 transition-colors hover:bg-muted/10"
                            >
                              <div class="flex items-center justify-between mb-2.5">
                                <UIcon
                                  :name="getWorkoutIcon(workout.type)"
                                  class="h-5 w-5 text-primary"
                                />
                                <div
                                  class="text-[10px] font-black uppercase tracking-wider text-muted"
                                >
                                  {{ dayLabel(workout.dayIndex) }}
                                </div>
                              </div>

                              <div class="font-bold text-highlighted leading-tight mb-2">
                                {{ workout.title }}
                              </div>

                              <div class="flex items-center gap-2 text-xs text-muted">
                                <span class="font-medium">{{ workout.type || 'Workout' }}</span>
                                <template v-if="workout.durationSec || workout.tss">
                                  <span>•</span>
                                  <span v-if="workout.durationSec">{{
                                    formatDuration(workout.durationSec)
                                  }}</span>
                                  <span v-if="workout.tss">{{ Math.round(workout.tss) }} TSS</span>
                                </template>
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </UTabs>
                  </div>
                </div>
              </div>
            </section>

            <section
              class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8"
            >
              <h2 class="text-2xl font-black tracking-tight text-highlighted">Overview</h2>
              <p class="mt-4 whitespace-pre-wrap text-base leading-8 text-muted">
                {{ plan.publicDescription || plan.description }}
              </p>
            </section>

            <section
              v-if="plan.methodology"
              class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8"
            >
              <h2 class="text-2xl font-black tracking-tight text-highlighted">Methodology</h2>
              <p class="mt-4 whitespace-pre-wrap text-base leading-8 text-muted">
                {{ plan.methodology }}
              </p>
            </section>

            <section
              v-if="plan.whoItsFor || plan.equipmentTags?.length"
              class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8"
            >
              <h2 class="text-2xl font-black tracking-tight text-highlighted">Who this is for</h2>
              <p
                v-if="plan.whoItsFor"
                class="mt-4 whitespace-pre-wrap text-base leading-8 text-muted"
              >
                {{ plan.whoItsFor }}
              </p>
              <div v-if="plan.equipmentTags?.length" class="mt-5 flex flex-wrap gap-2">
                <UBadge v-for="tag in plan.equipmentTags" :key="tag" color="neutral" variant="soft">
                  {{ tag }}
                </UBadge>
              </div>
            </section>

            <section
              v-if="plan.accessState === 'RESTRICTED'"
              class="rounded-[2rem] border border-warning/40 bg-warning/10 p-6 shadow-sm"
            >
              <h2 class="text-xl font-black tracking-tight text-highlighted">Restricted preview</h2>
              <p class="mt-3 text-sm leading-7 text-muted">
                This public page shows curated sample weeks only. Coaches can still share the full
                plan with athletes through a private link.
              </p>
            </section>

            <section
              v-if="plan.faq"
              class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8"
            >
              <h2 class="text-2xl font-black tracking-tight text-highlighted">FAQ</h2>
              <p class="mt-4 whitespace-pre-wrap text-base leading-8 text-muted">{{ plan.faq }}</p>
            </section>

            <section
              v-if="plan.extraContent"
              class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8"
            >
              <h2 class="text-2xl font-black tracking-tight text-highlighted">More details</h2>
              <p class="mt-4 whitespace-pre-wrap text-base leading-8 text-muted">
                {{ plan.extraContent }}
              </p>
            </section>
          </div>

          <aside class="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <!-- Coach Card -->
            <NuxtLink
              v-if="coachPath"
              :to="coachPath"
              class="group block rounded-[1.75rem] border border-default/70 bg-default p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div
                class="text-xs font-black uppercase tracking-[0.22em] text-primary group-hover:text-primary-500 transition-colors"
              >
                Coach
              </div>

              <div class="mt-4 flex items-center gap-3">
                <UAvatar
                  :src="plan.author?.image || undefined"
                  :alt="plan.author?.displayName"
                  size="lg"
                  class="ring-2 ring-transparent group-hover:ring-primary/20 transition-all"
                />
                <div class="min-w-0">
                  <div
                    class="truncate text-base font-bold text-highlighted group-hover:text-primary transition-colors"
                  >
                    {{ plan.author?.displayName }}
                  </div>
                  <div v-if="plan.author?.coachingBrand" class="truncate text-xs text-muted">
                    {{ plan.author.coachingBrand }}
                  </div>
                </div>
              </div>

              <p v-if="plan.author?.bio" class="mt-4 line-clamp-4 text-xs leading-5 text-muted">
                {{ plan.author.bio }}
              </p>

              <div class="mt-4 space-y-1.5 text-xs text-muted">
                <div v-if="plan.author?.location" class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-map-pin" class="h-3.5 w-3.5" />
                  {{ plan.author.location }}
                </div>
                <div
                  v-if="plan.author?.websiteUrl"
                  class="flex items-center gap-1.5 truncate text-primary/80 group-hover:text-primary"
                >
                  <UIcon name="i-heroicons-globe-alt" class="h-3.5 w-3.5" />
                  {{ plan.author.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') }}
                </div>
              </div>

              <div v-if="authorSocialLinks.length" class="mt-4 flex flex-wrap gap-2">
                <div
                  v-for="link in authorSocialLinks"
                  :key="`${link.label}-${link.url}`"
                  class="rounded-full border border-default/60 px-2.5 py-1 text-[10px] font-medium text-muted transition-colors group-hover:border-primary/20"
                >
                  {{ link.label }}
                </div>
              </div>

              <div
                class="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-primary opacity-0 translate-y-2 transition-all group-hover:opacity-100 group-hover:translate-y-0"
              >
                <span>View full profile</span>
                <UIcon name="i-heroicons-arrow-right" class="h-3.5 w-3.5" />
              </div>
            </NuxtLink>

            <UCard class="border border-default/70 bg-default shadow-sm">
              <template #header>
                <div>
                  <div class="text-lg font-bold text-highlighted">Plan Snapshot</div>
                  <p class="mt-1 text-sm text-muted">A bird's eye view of the training rhythm.</p>
                </div>
              </template>

              <dl class="space-y-4">
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-xs font-black uppercase tracking-widest text-muted">Intensity</dt>
                  <dd class="text-right text-sm font-bold text-highlighted capitalize">
                    {{ volumeLabel || 'Standard' }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-xs font-black uppercase tracking-widest text-muted">
                    Total sessions
                  </dt>
                  <dd class="text-right text-sm font-bold text-highlighted">
                    {{ totalSessionCount }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-xs font-black uppercase tracking-widest text-muted">
                    Weekly avg
                  </dt>
                  <dd class="text-right text-sm font-bold text-highlighted">
                    {{ (totalSessionCount / plan.lengthWeeks).toFixed(1) }} / wk
                  </dd>
                </div>

                <div class="pt-4 border-t border-default/10">
                  <div class="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">
                    Sport Involvement
                  </div>
                  <div class="space-y-2.5">
                    <div
                      v-for="sport in sessionBreakdown"
                      :key="sport.label"
                      class="flex items-center justify-between group"
                    >
                      <div class="flex items-center gap-2">
                        <UIcon
                          :name="getWorkoutIcon(sport.label)"
                          class="h-3.5 w-3.5 text-muted group-hover:text-primary transition-colors"
                        />
                        <span
                          class="text-sm font-medium text-muted group-hover:text-highlighted transition-colors"
                          >{{ sport.label }}</span
                        >
                      </div>
                      <div class="flex items-center gap-2">
                        <div class="text-xs font-bold text-highlighted">{{ sport.count }}</div>
                        <div class="text-[10px] font-medium text-muted tabular-nums">
                          ({{ ((sport.count / totalSessionCount) * 100).toFixed(0) }}%)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </dl>
            </UCard>

            <UCard class="border border-default/70 bg-default shadow-sm">
              <template #header>
                <div>
                  <div class="text-lg font-bold text-highlighted">Volume Breakdown</div>
                  <p class="mt-1 text-sm text-muted">
                    Average weekly distribution by activity type.
                  </p>
                </div>
              </template>

              <PlanActivityBreakdownChart
                v-if="averageWeeklyBreakdown.length"
                :data="averageWeeklyBreakdown"
                :metric="chartMetric"
              />
              <div v-else class="py-10 text-center text-xs text-muted italic">
                Insufficient data for breakdown.
              </div>
            </UCard>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watchEffect } from 'vue'
  import {
    buildPublicCoachPath,
    buildPublicPlanPath,
    buildTrainingPlansBrowsePath,
    getPublicSportByValue
  } from '../../../shared/public-plans'
  import PlanArchitectTimelineChart from './PlanArchitectTimelineChart.vue'
  import PlanActivityBreakdownChart from './PlanActivityBreakdownChart.vue'
  import { getWorkoutIcon } from '../../utils/activity-types'

  const props = defineProps<{
    overrideSlug?: string
  }>()

  const route = useRoute()
  const runtimeConfig = useRuntimeConfig()
  const requestUrl = useRequestURL()
  const { formatDateUTC } = useFormat()
  const slug = (props.overrideSlug || route.params.planSlug || route.params.slug) as string

  const { data, pending } = await useFetch(`/api/public/plans/${slug}`)
  const plan = computed(() => (data.value as any)?.plan)

  const expandedBlockIds = ref<string[]>([])
  const selectedWeekIdMap = ref<Record<string, string>>({})
  const chartMetric = ref<'tss' | 'minutes'>('tss')

  const sportLabel = computed(
    () => getPublicSportByValue(plan.value?.primarySport)?.label || plan.value?.primarySport
  )
  const sportBrowsePath = computed(() =>
    plan.value?.primarySport
      ? buildTrainingPlansBrowsePath({ sport: plan.value.primarySport })
      : null
  )
  const subtypeBrowsePath = computed(() =>
    plan.value?.primarySport && plan.value?.sportSubtype
      ? buildTrainingPlansBrowsePath({
          sport: plan.value.primarySport,
          subtype: plan.value.sportSubtype
        })
      : null
  )
  const coachPath = computed(() => buildPublicCoachPath(plan.value?.author?.slug))
  const canonicalPath = computed(() => (plan.value ? buildPublicPlanPath(plan.value) : null))
  const visibleWeekCount = computed(
    () =>
      plan.value?.blocks?.reduce(
        (sum: number, block: any) => sum + (block.weeks?.length || 0),
        0
      ) || 0
  )
  const canonicalUrl = computed(() =>
    canonicalPath.value
      ? `${runtimeConfig.public.siteUrl || requestUrl.origin}${canonicalPath.value}`
      : ''
  )
  const authorSocialLinks = computed(() =>
    Array.isArray(plan.value?.author?.socialLinks) ? plan.value.author.socialLinks : []
  )
  const skillLabel = computed(() => formatEnumLabel(plan.value?.skillLevel))
  const volumeLabel = computed(() => formatEnumLabel(plan.value?.weeklyVolumeBand))

  const totalSessionCount = computed(
    () =>
      plan.value?.blocks?.reduce(
        (sum: number, block: any) =>
          sum +
          block.weeks?.reduce(
            (wSum: number, week: any) =>
              wSum +
              (week.workouts?.filter((w: any) => w.type !== 'Rest' && w.type !== 'Recovery')
                .length || 0),
            0
          ),
        0
      ) || 0
  )

  const sessionBreakdown = computed(() => {
    const aggregate = new Map<string, number>()
    plan.value?.blocks?.forEach((block: any) => {
      block.weeks?.forEach((week: any) => {
        week.workouts?.forEach((w: any) => {
          if (w.type === 'Rest' || w.type === 'Recovery') return
          const type = w.type || 'Other'
          aggregate.set(type, (aggregate.get(type) || 0) + 1)
        })
      })
    })
    return Array.from(aggregate.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  })

  const chartWeeks = computed(() => {
    if (!plan.value?.blocks) return []
    const weeks: any[] = []
    plan.value.blocks.forEach((block: any) => {
      block.weeks.forEach((week: any) => {
        const workouts = week.workouts || []
        const scheduledMinutes = Math.round(
          workouts.reduce((sum: number, w: any) => sum + (w.durationSec || 0), 0) / 60
        )
        const scheduledTss = Math.round(
          workouts.reduce((sum: number, w: any) => sum + (w.tss || 0), 0)
        )

        const typeBreakdownMap = new Map<
          string,
          { label: string; count: number; minutes: number; tss: number }
        >()
        workouts.forEach((w: any) => {
          const rawType = w.type || 'Other'
          let type = 'Other'
          if (rawType.includes('Run')) type = 'Run'
          else if (rawType.includes('Ride')) type = 'Ride'
          else if (rawType.includes('Gym') || rawType.includes('Weight')) type = 'Gym'
          else if (rawType.includes('Rest')) type = 'Rest/Recovery'

          const entry = typeBreakdownMap.get(type) || { label: type, count: 0, minutes: 0, tss: 0 }
          entry.count++
          entry.minutes += Math.round((w.durationSec || 0) / 60)
          entry.tss += Math.round(w.tss || 0)
          typeBreakdownMap.set(type, entry)
        })

        weeks.push({
          weekId: week.id,
          weekNumber: week.weekNumber,
          displayWeekNumber: week.weekNumber,
          weekFocus: week.focus || '',
          blockName: block.name,
          blockType: block.type,
          targetMinutes: week.volumeTargetMinutes || 0,
          scheduledMinutes,
          targetTss: week.tssTarget || 0,
          scheduledTss,
          workoutCount: workouts.length,
          typeBreakdown: Array.from(typeBreakdownMap.values())
        })
      })
    })
    return weeks
  })

  const averageWeeklyBreakdown = computed(() => {
    if (!chartWeeks.value.length) return []
    const numWeeks = chartWeeks.value.length
    const aggregate = new Map<
      string,
      { label: string; minutes: number; tss: number; count: number }
    >()

    chartWeeks.value.forEach((week) => {
      week.typeBreakdown?.forEach((type: any) => {
        const entry = aggregate.get(type.label) || {
          label: type.label,
          minutes: 0,
          tss: 0,
          count: 0
        }
        entry.minutes += type.minutes
        entry.tss += type.tss
        entry.count += type.count
        aggregate.set(type.label, entry)
      })
    })

    return Array.from(aggregate.values()).map((d) => ({
      ...d,
      minutes: Math.round(d.minutes / numWeeks),
      tss: Math.round(d.tss / numWeeks),
      count: Number((d.count / numWeeks).toFixed(1))
    }))
  })

  const blockRanges = computed(() => {
    if (!plan.value?.blocks) return []
    let currentIdx = 0
    return plan.value.blocks.map((block: any) => {
      const startIndex = currentIdx
      const numWeeks = block.weeks?.length || 0
      const endIndex = startIndex + numWeeks - 1
      currentIdx = endIndex + 1
      return {
        blockId: block.id,
        blockName: block.name,
        blockType: block.type,
        startIndex,
        endIndex
      }
    })
  })

  watchEffect(() => {
    if (plan.value?.blocks) {
      if (expandedBlockIds.value.length === 0 && plan.value.blocks.length > 0) {
        expandedBlockIds.value = [plan.value.blocks[0].id]
      }

      plan.value.blocks.forEach((block: any) => {
        if (!selectedWeekIdMap.value[block.id] && block.weeks?.length) {
          selectedWeekIdMap.value[block.id] = block.weeks[0].id
        }
      })
    }
  })

  function isBlockExpanded(blockId: string) {
    return expandedBlockIds.value.includes(blockId)
  }

  function toggleBlock(blockId: string) {
    if (expandedBlockIds.value.includes(blockId)) {
      expandedBlockIds.value = expandedBlockIds.value.filter((id) => id !== blockId)
    } else {
      expandedBlockIds.value.push(blockId)
    }
  }

  function expandAllBlocks() {
    expandedBlockIds.value = plan.value?.blocks?.map((b: any) => b.id) || []
  }

  function collapseAllBlocks() {
    expandedBlockIds.value = []
  }

  function getSelectedWeek(block: any) {
    const selectedId = selectedWeekIdMap.value[block.id]
    return block.weeks?.find((w: any) => w.id === selectedId)
  }

  function getBlockTss(block: any) {
    return Math.round(
      block.weeks?.reduce((sum: number, w: any) => sum + (w.tssTarget || 0), 0) || 0
    )
  }

  function getBlockMinutes(block: any) {
    return Math.round(
      block.weeks?.reduce((sum: number, w: any) => sum + (w.volumeTargetMinutes || 0), 0) || 0
    )
  }

  function getBlockTypeColor(type: string) {
    const colors: Record<string, string> = {
      PREP: 'rgb(148, 163, 184)',
      BASE: 'rgb(59, 130, 246)',
      BUILD: 'rgb(245, 158, 11)',
      PEAK: 'rgb(239, 68, 68)',
      RACE: 'rgb(168, 85, 247)',
      TRANSITION: 'rgb(16, 185, 129)'
    }
    return colors[type] || 'rgb(0, 220, 130)'
  }

  watchEffect(() => {
    if (
      canonicalPath.value &&
      route.path !== canonicalPath.value &&
      route.path === `/training-plans/${slug}`
    ) {
      navigateTo(canonicalPath.value, { replace: true, redirectCode: 301 })
    }
  })

  useSeoMeta({
    title: () => (plan.value ? `${plan.value.name} | Coach Wattz` : 'Training Plan | Coach Wattz'),
    description: () =>
      plan.value?.publicDescription ||
      plan.value?.publicHeadline ||
      'Discover a public training plan on Coach Wattz.',
    ogTitle: () =>
      plan.value ? `${plan.value.name} | Coach Wattz` : 'Training Plan | Coach Wattz',
    ogDescription: () =>
      plan.value?.publicDescription ||
      plan.value?.publicHeadline ||
      'Discover a public training plan on Coach Wattz.'
  })

  useHead(() => ({
    link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [],
    script: plan.value
      ? [
          {
            type: 'application/ld+json',
            textContent: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Course',
              name: plan.value.name,
              description: plan.value.publicDescription,
              provider: {
                '@type': 'Person',
                name: plan.value.author?.displayName,
                url: coachPath.value
                  ? `${runtimeConfig.public.siteUrl || requestUrl.origin}${coachPath.value}`
                  : undefined
              },
              educationalLevel: plan.value.skillLevel,
              inLanguage: plan.value.planLanguage,
              url: canonicalUrl.value
            })
          }
        ]
      : []
  }))

  function formatEnumLabel(value?: string | null) {
    if (!value) return null
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function dayLabel(dayIndex: number) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dayIndex] || 'Day'
  }

  function formatDuration(durationSec: number) {
    const minutes = Math.round((durationSec || 0) / 60)
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60
    if (!hours) return `${minutes} min`
    if (!remainder) return `${hours}h`
    return `${hours}h ${remainder}m`
  }

  function weekDateRange(week: any) {
    const start = week?.startDate
    const end = week?.endDate
    if (!start || !end) return 'Dates not set'
    return `${formatDateUTC(start, 'MMM d')} - ${formatDateUTC(end, 'MMM d')}`
  }
</script>
