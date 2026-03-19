<template>
  <div class="relative overflow-hidden bg-default/50">
    <div class="absolute inset-x-0 top-0 h-[28rem] border-b border-default/10 bg-default/5"></div>

    <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <NuxtLink to="/" class="transition-colors hover:text-primary">Home</NuxtLink>
        <span>/</span>
        <NuxtLink to="/training-plans" class="transition-colors hover:text-primary"
          >Training Plans</NuxtLink
        >
        <template v-if="activeSportMeta">
          <span>/</span>
          <NuxtLink :to="sportBrowsePath" class="transition-colors hover:text-primary">
            {{ activeSportMeta.label }}
          </NuxtLink>
        </template>
        <template v-if="activeSubtypeLabel">
          <span>/</span>
          <span class="text-highlighted">{{ activeSubtypeLabel }}</span>
        </template>
      </div>

      <div class="rounded-[2rem] border border-default/70 bg-default p-6 shadow-sm sm:p-8 lg:p-10">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <p class="text-xs font-black uppercase tracking-[0.28em] text-primary">
              Marketplace Beta
            </p>
            <h1
              class="mt-4 text-4xl font-black tracking-tight text-highlighted sm:text-5xl lg:text-6xl"
            >
              Find a coach-built plan that actually fits the athlete.
            </h1>
            <p class="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Browse endurance plans with sport-specific URLs, richer metadata, coach identity, and
              clean public pages built for discovery.
            </p>
          </div>
        </div>
      </div>

      <div class="mt-8 grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div class="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <UCard class="border border-default/70 bg-default shadow-sm">
            <template #header>
              <div>
                <div class="text-lg font-bold text-highlighted">Filters</div>
                <p class="mt-1 text-sm text-muted">
                  Sport and subtype update the URL immediately. Apply the rest when you're ready.
                </p>
              </div>
            </template>

            <div class="space-y-4">
              <UFormField label="Search">
                <UInput
                  v-model="filters.q"
                  placeholder="Marathon, gravel, beginner..."
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Sport">
                <USelect
                  v-model="filters.sport"
                  :items="sportOptions"
                  value-key="value"
                  class="w-full"
                  @update:model-value="handleSportChange"
                />
              </UFormField>

              <UFormField label="Subtype">
                <USelect
                  v-model="filters.subtype"
                  :items="subtypeOptions"
                  class="w-full"
                  :disabled="!filters.sport"
                  @update:model-value="handleSubtypeChange"
                />
              </UFormField>

              <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <UFormField label="Skill level">
                  <USelect v-model="filters.skillLevel" :items="skillLevelOptions" class="w-full" />
                </UFormField>

                <UFormField label="Language">
                  <USelect v-model="filters.language" :items="languageOptions" class="w-full" />
                </UFormField>

                <UFormField label="Days per week">
                  <UInput
                    v-model.number="filters.daysPerWeek"
                    type="number"
                    min="1"
                    max="14"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Length (weeks)">
                  <UInput
                    v-model.number="filters.lengthWeeks"
                    type="number"
                    min="1"
                    max="52"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Weekly volume">
                  <USelect
                    v-model="filters.weeklyVolumeBand"
                    :items="volumeBandOptions"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Access">
                  <USelect
                    v-model="filters.accessState"
                    :items="accessStateOptions"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UFormField label="Sort">
                <USelect
                  v-model="filters.sort"
                  :items="sortOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>

              <div class="flex gap-2 pt-2">
                <UButton color="primary" class="flex-1 justify-center" @click="applyFilters"
                  >Apply filters</UButton
                >
                <UButton color="neutral" variant="ghost" @click="clearFilters">Reset</UButton>
              </div>
            </div>
          </UCard>

          <div
            class="rounded-[1.75rem] border border-default/60 bg-slate-900 p-6 text-white shadow-xl"
          >
            <div class="text-xs font-black uppercase tracking-[0.24em] text-primary-300">
              Coach pages
            </div>
            <h2 class="mt-3 text-2xl font-black tracking-tight">
              Every public plan should feel authored.
            </h2>
            <p class="mt-3 text-sm leading-6 text-slate-300">
              We’re building coach-first public pages with bio, brand, links, and discoverable plan
              catalogs.
            </p>
          </div>
        </div>

        <div class="space-y-6">
          <div
            class="flex flex-col gap-4 rounded-[1.75rem] border border-default/70 bg-default p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm text-muted">{{ plans.length }} public plans</p>
              <h2 class="mt-1 text-2xl font-black tracking-tight text-highlighted">
                {{ activeSubtypeLabel || activeSportMeta?.label || 'All endurance plans' }}
              </h2>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="sport in sportOptions"
                :key="sport.value"
                size="sm"
                :color="filters.sport === sport.value ? 'primary' : 'neutral'"
                :variant="filters.sport === sport.value ? 'soft' : 'ghost'"
                @click="selectSportChip(sport.value)"
              >
                {{ sport.label }}
              </UButton>
            </div>
          </div>

          <div class="space-y-6">
            <div v-if="pending" class="space-y-6">
              <USkeleton v-for="i in 4" :key="i" class="h-64 w-full rounded-[2.2rem]" />
            </div>

            <div
              v-else-if="plans.length === 0"
              class="rounded-[2rem] border border-dashed border-default/80 bg-default/70 p-12 text-center"
            >
              <h2 class="text-2xl font-black tracking-tight text-highlighted">
                No plans match these filters
              </h2>
              <p class="mt-3 text-sm text-muted">
                Try broadening the sport, skill level, or duration filters to explore more public
                plans.
              </p>
              <UButton color="primary" class="mt-6" @click="clearFilters">Reset filters</UButton>
            </div>

            <div v-else class="space-y-6">
              <PublicPlanCard v-for="plan in plans" :key="plan.id" :plan="plan" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import PublicPlanCard from '~/components/plans/PublicPlanCard.vue'
  import {
    PLAN_ACCESS_STATE_OPTIONS,
    PLAN_LANGUAGE_OPTIONS,
    PLAN_SKILL_LEVEL_OPTIONS,
    PLAN_VOLUME_BAND_OPTIONS,
    PUBLIC_PLAN_SPORTS,
    buildTrainingPlansBrowsePath,
    getPublicSportBySegment,
    getPublicSubtypeLabel
  } from '../../../shared/public-plans'

  const props = defineProps<{
    overrideSubtype?: string
  }>()

  const route = useRoute()
  const router = useRouter()
  const requestUrl = useRequestURL()
  const runtimeConfig = useRuntimeConfig()

  const sportSegment = computed(() => (route.params.sport as string | undefined) || '')
  const subtypeSegment = computed(
    () => props.overrideSubtype || (route.params.subtype as string | undefined) || ''
  )
  const activeSportMeta = computed(() => getPublicSportBySegment(sportSegment.value))
  const activeSubtypeLabel = computed(() =>
    activeSportMeta.value
      ? getPublicSubtypeLabel(activeSportMeta.value.value, subtypeSegment.value)
      : null
  )

  const sportOptions = PUBLIC_PLAN_SPORTS.map((sport) => ({
    label: sport.label,
    value: sport.value
  }))
  const skillLevelOptions = [...PLAN_SKILL_LEVEL_OPTIONS]
  const volumeBandOptions = [...PLAN_VOLUME_BAND_OPTIONS]
  const accessStateOptions = PLAN_ACCESS_STATE_OPTIONS.filter((item) => item !== 'PRIVATE')
  const languageOptions = [...PLAN_LANGUAGE_OPTIONS]
  const sortOptions = [
    { label: 'Featured', value: 'featured' },
    { label: 'Newest', value: 'newest' },
    { label: 'Shortest', value: 'shortest' },
    { label: 'Longest', value: 'longest' },
    { label: 'Easiest', value: 'easiest' },
    { label: 'Hardest', value: 'hardest' }
  ]

  const filters = reactive({
    q: (route.query.q as string) || '',
    sport: activeSportMeta.value?.value || '',
    subtype: activeSubtypeLabel.value || '',
    skillLevel: (route.query.skillLevel as string) || '',
    language: (route.query.language as string) || '',
    daysPerWeek: route.query.daysPerWeek ? Number(route.query.daysPerWeek) : undefined,
    lengthWeeks: route.query.lengthWeeks ? Number(route.query.lengthWeeks) : undefined,
    weeklyVolumeBand: (route.query.weeklyVolumeBand as string) || '',
    accessState: (route.query.accessState as string) || '',
    sort: (route.query.sort as string) || 'featured'
  })

  watch(
    [activeSportMeta, activeSubtypeLabel],
    ([sport, subtype]) => {
      filters.sport = sport?.value || ''
      filters.subtype = subtype || ''
    },
    { immediate: true }
  )

  watch(
    () => filters.sport,
    (newSport) => {
      const nextSubtypeOptions =
        PUBLIC_PLAN_SPORTS.find((sport) => sport.value === newSport)?.subtypes || []
      if (filters.subtype && !nextSubtypeOptions.includes(filters.subtype)) {
        filters.subtype = ''
      }
    }
  )

  const subtypeOptions = computed(() => {
    const selected = PUBLIC_PLAN_SPORTS.find((sport) => sport.value === filters.sport)
    return selected?.subtypes || []
  })

  const apiQuery = computed(() =>
    Object.fromEntries(
      Object.entries({
        q: filters.q,
        sport: filters.sport,
        subtype: filters.subtype,
        skillLevel: filters.skillLevel,
        language: filters.language,
        daysPerWeek: filters.daysPerWeek,
        lengthWeeks: filters.lengthWeeks,
        weeklyVolumeBand: filters.weeklyVolumeBand,
        accessState: filters.accessState,
        sort: filters.sort
      }).filter(([, value]) => value !== '' && value !== undefined && value !== null)
    )
  )

  const { data, pending } = await useFetch('/api/public/plans', {
    query: apiQuery
  })

  const plans = computed(() => (data.value as any)?.plans || [])
  const sportBrowsePath = computed(() => buildTrainingPlansBrowsePath({ sport: filters.sport }))
  const browsePath = computed(() =>
    buildTrainingPlansBrowsePath({
      sport: filters.sport,
      subtype: filters.subtype
    })
  )
  const queryWithoutPathFilters = computed(() =>
    Object.fromEntries(
      Object.entries({
        q: filters.q,
        skillLevel: filters.skillLevel,
        language: filters.language,
        daysPerWeek: filters.daysPerWeek,
        lengthWeeks: filters.lengthWeeks,
        weeklyVolumeBand: filters.weeklyVolumeBand,
        accessState: filters.accessState,
        sort: filters.sort
      }).filter(([, value]) => value !== '' && value !== undefined && value !== null)
    )
  )
  const canonicalUrl = computed(() => {
    const base = `${runtimeConfig.public.siteUrl || requestUrl.origin}${browsePath.value}`
    const queryString = new URLSearchParams(
      queryWithoutPathFilters.value as Record<string, string>
    ).toString()
    return queryString ? `${base}?${queryString}` : base
  })

  useSeoMeta({
    title: () => {
      if (activeSubtypeLabel.value && activeSportMeta.value) {
        return `${activeSportMeta.value.label} ${activeSubtypeLabel.value} Training Plans | Coach Wattz`
      }
      if (activeSportMeta.value) {
        return `${activeSportMeta.value.label} Training Plans | Coach Wattz`
      }
      return 'Public Training Plans | Coach Wattz'
    },
    description:
      'Browse public endurance training plans by sport, skill level, language, weekly rhythm, and duration.',
    ogTitle: () => {
      if (activeSubtypeLabel.value && activeSportMeta.value) {
        return `${activeSportMeta.value.label} ${activeSubtypeLabel.value} Training Plans | Coach Wattz`
      }
      if (activeSportMeta.value) {
        return `${activeSportMeta.value.label} Training Plans | Coach Wattz`
      }
      return 'Public Training Plans | Coach Wattz'
    },
    ogDescription:
      'Browse public endurance training plans by sport, skill level, language, weekly rhythm, and duration.'
  })

  useHead({
    link: [{ rel: 'canonical', href: canonicalUrl.value }]
  })

  function applyFilters() {
    router.push({
      path: browsePath.value,
      query: queryWithoutPathFilters.value
    })
  }

  function clearFilters() {
    filters.q = ''
    filters.sport = ''
    filters.subtype = ''
    filters.skillLevel = ''
    filters.language = ''
    filters.daysPerWeek = undefined
    filters.lengthWeeks = undefined
    filters.weeklyVolumeBand = ''
    filters.accessState = ''
    filters.sort = 'featured'
    router.push({ path: '/training-plans', query: {} })
  }

  function handleSportChange(value?: string) {
    filters.sport = value || ''
    if (!filters.sport) {
      filters.subtype = ''
    }

    router.push({
      path: buildTrainingPlansBrowsePath({ sport: filters.sport, subtype: filters.subtype }),
      query: queryWithoutPathFilters.value
    })
  }

  function handleSubtypeChange(value?: string) {
    filters.subtype = value || ''
    router.push({
      path: buildTrainingPlansBrowsePath({ sport: filters.sport, subtype: filters.subtype }),
      query: queryWithoutPathFilters.value
    })
  }

  function selectSportChip(value: string) {
    const nextSport = filters.sport === value ? '' : value
    handleSportChange(nextSport)
  }
</script>
