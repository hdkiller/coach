<script setup lang="ts">
  import {
    ANALYTICS_PRESET_CATEGORIES,
    ANALYTICS_SYSTEM_PRESETS,
    type AnalyticsOverlayOption,
    type AnalyticsPresetCategory,
    type AnalyticsSystemPreset
  } from '~/utils/analytics-presets'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Charts | Coach Watts',
    meta: [
      {
        name: 'description',
        content: 'Browse and preview performance visualizations for your athletes.'
      }
    ]
  })

  const router = useRouter()
  const route = useRoute()
  const toast = useToast()

  const athletes = ref<any[]>([])
  const loadingAthletes = ref(true)

  const { data: customWidgets } = await useFetch('/api/analytics/widgets')
  const { data: dashboards, refresh: refreshDashboards } = await useFetch(
    '/api/analytics/dashboards'
  )

  const leftRailTab = ref<'roster' | 'library'>('roster')
  const athleteSearch = ref('')
  const widgetSearch = ref('')
  const activeCategory = ref<'all' | AnalyticsPresetCategory>('all')
  const rosterMode = ref<'single' | 'compare'>('single')
  const datePickerOpen = ref(false)
  const overlayPickerOpen = ref(false)
  const selectedRangeKey = ref<'preset' | '14d' | '30d' | '90d' | '180d' | 'ytd' | 'custom'>(
    'preset'
  )
  const customStartDate = ref('')
  const customEndDate = ref('')
  const rangeTouched = ref(false)

  const selectedAthleteIds = ref<string[]>([])
  const selectedWidget = ref<any>(ANALYTICS_SYSTEM_PRESETS[0])
  const selectedOverlayIds = ref<string[]>(ANALYTICS_SYSTEM_PRESETS[0]?.defaultOverlays || [])

  try {
    athletes.value = (await $fetch('/api/coaching/athletes')) as any[]
  } catch (error: any) {
    athletes.value = []
    toast.add({
      title: 'Roster unavailable',
      description:
        error?.statusCode === 403
          ? 'Coach roster access is not available for this account.'
          : 'Failed to load athletes.',
      color: 'warning'
    })
  } finally {
    loadingAthletes.value = false
  }

  const filteredAthletes = computed(() => {
    const search = athleteSearch.value.trim().toLowerCase()
    return athletes.value.filter(
      (rel) =>
        !search ||
        rel.athlete.name.toLowerCase().includes(search) ||
        rel.athlete.email.toLowerCase().includes(search)
    )
  })

  const customLibraryWidgets = computed(() =>
    ((customWidgets.value as any[]) || []).map((widget) => ({
      ...widget.config,
      id: widget.id,
      name: widget.name,
      description: widget.description || 'Custom visualization',
      isCustom: true,
      category: 'custom' as const,
      audience: 'both',
      visualType: widget.config.visualType || widget.config.type || 'line'
    }))
  )

  const filteredSystemWidgets = computed(() => {
    const search = widgetSearch.value.trim().toLowerCase()

    return ANALYTICS_SYSTEM_PRESETS.filter((widget) => {
      const matchesCategory =
        activeCategory.value === 'all' || widget.category === activeCategory.value
      if (!matchesCategory) return false

      if (!search) return true

      return [
        widget.name,
        widget.description,
        widget.source,
        widget.category,
        widget.audience
      ].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search)
      )
    })
  })

  const groupedSystemWidgets = computed(() =>
    ANALYTICS_PRESET_CATEGORIES.map((category) => ({
      ...category,
      widgets: filteredSystemWidgets.value.filter((widget) => widget.category === category.value)
    })).filter((category) => category.widgets.length > 0)
  )

  const filteredCustomWidgets = computed(() => {
    const search = widgetSearch.value.trim().toLowerCase()
    return customLibraryWidgets.value.filter((widget) => {
      if (!search) return true
      return [widget.name, widget.description, widget.source].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search)
      )
    })
  })

  const activeDashboard = computed(() => dashboards.value?.[0] || null)
  const selectedAthletes = computed(() =>
    athletes.value.filter((athlete) => selectedAthleteIds.value.includes(athlete.athleteId))
  )
  const selectedAudienceLabel = computed(() => {
    if (selectedAthletes.value.length === 0) return 'Personal Data'
    if (selectedAthletes.value.length === 1)
      return selectedAthletes.value[0]?.athlete?.name || 'Athlete'
    return `${selectedAthletes.value[0]?.athlete?.name || 'Athletes'} +${selectedAthletes.value.length - 1}`
  })
  const selectedCategoryLabel = computed(
    () =>
      ANALYTICS_PRESET_CATEGORIES.find((entry) => entry.value === selectedWidget.value?.category)
        ?.label || 'Custom'
  )
  const overlayOptions = computed<AnalyticsOverlayOption[]>(
    () => selectedWidget.value?.availableOverlays || []
  )
  const hasOverlayControls = computed(
    () => selectedWidget.value?.isSystem && overlayOptions.value.length > 0
  )
  const overlayLabel = computed(() => {
    if (!hasOverlayControls.value) return 'No overlays'
    if (selectedOverlayIds.value.length === 0) return 'Overlays Off'
    if (selectedOverlayIds.value.length === 1) {
      return (
        overlayOptions.value.find((overlay) => overlay.id === selectedOverlayIds.value[0])?.label ||
        '1 Overlay'
      )
    }
    return `${selectedOverlayIds.value.length} Overlays`
  })
  const compareContextCopy = computed(() => {
    if (selectedAthleteIds.value.length <= 1) return null
    if (selectedWidget.value?.supportsCompareOverlay) {
      return 'Compare mode shows selected athletes together and can add a squad-average reference for context.'
    }

    return 'Compare mode is active. This chart will still render the selected athletes together when the preset supports it cleanly.'
  })
  const presetDefaultTimeRange = computed(
    () => selectedWidget.value?.timeRange || { type: 'rolling', value: '30d' }
  )

  function toDateInputValue(date: Date) {
    return date.toISOString().split('T')[0] || ''
  }

  function resolveEffectiveTimeRange() {
    if (selectedRangeKey.value === 'custom' && customStartDate.value && customEndDate.value) {
      return {
        type: 'fixed',
        startDate: new Date(`${customStartDate.value}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${customEndDate.value}T23:59:59.999Z`).toISOString()
      }
    }

    if (selectedRangeKey.value === 'ytd') {
      return { type: 'ytd' }
    }

    if (selectedRangeKey.value !== 'preset' && selectedRangeKey.value !== 'custom') {
      return {
        type: 'rolling',
        value: selectedRangeKey.value
      }
    }

    return presetDefaultTimeRange.value
  }

  const effectiveTimeRange = computed(() => resolveEffectiveTimeRange())

  const rangeLabel = computed(() => {
    if (selectedRangeKey.value === 'custom' && customStartDate.value && customEndDate.value) {
      return `${customStartDate.value} - ${customEndDate.value}`
    }

    if (selectedRangeKey.value === 'preset') {
      const presetRange = presetDefaultTimeRange.value
      if (presetRange?.type === 'rolling' && presetRange.value) {
        return `Preset • ${String(presetRange.value).toUpperCase()}`
      }
      if (presetRange?.type === 'ytd') return 'Preset • YTD'
      return 'Preset Range'
    }

    return selectedRangeKey.value.toUpperCase()
  })

  const previewConfig = computed(() => {
    if (!selectedWidget.value) return null

    return {
      ...selectedWidget.value,
      timeRange: effectiveTimeRange.value,
      overlaySettings: {
        active: [...selectedOverlayIds.value]
      },
      scope:
        selectedAthleteIds.value.length > 1
          ? { target: 'athletes', targetIds: selectedAthleteIds.value }
          : selectedAthleteIds.value.length === 1
            ? { target: 'athlete', targetId: selectedAthleteIds.value[0] }
            : { target: 'self' }
    }
  })

  watch(
    () => selectedWidget.value?.id,
    () => {
      selectedOverlayIds.value = [...(selectedWidget.value?.defaultOverlays || [])]
      if (rangeTouched.value) return
      selectedRangeKey.value = 'preset'
      customStartDate.value = ''
      customEndDate.value = ''
    },
    { immediate: true }
  )

  const saving = ref(false)

  async function pinToDashboard() {
    saving.value = true
    try {
      await refreshDashboards()

      let dashboard = activeDashboard.value as any
      if (!dashboard) {
        dashboard = await $fetch('/api/analytics/dashboards', {
          method: 'POST',
          body: {
            name: 'Main Dashboard',
            layout: [],
            scope: previewConfig.value?.scope || { target: 'self' }
          }
        })
        await refreshDashboards()
      }

      if (!dashboard || !previewConfig.value) {
        toast.add({ title: 'No dashboard found', color: 'error' })
        return
      }

      const layout = [...((dashboard.layout as any[]) || [])]
      layout.push({
        ...previewConfig.value,
        instanceId: crypto.randomUUID(),
        scopeMode: 'override',
        timeRangeMode: 'override',
        overlaySettings: {
          active: [...selectedOverlayIds.value]
        }
      })

      await $fetch('/api/analytics/dashboards', {
        method: 'POST',
        body: {
          id: dashboard.id,
          name: dashboard.name,
          layout,
          scope: dashboard.scope || { target: 'self' }
        }
      })
      await refreshDashboards()

      toast.add({ title: 'Widget pinned to dashboard!', color: 'success' })
    } catch {
      toast.add({ title: 'Failed to pin widget', color: 'error' })
    } finally {
      saving.value = false
    }
  }

  function editWidget() {
    if (selectedWidget.value?.isCustom) {
      router.push(`/analytics/builder?id=${selectedWidget.value.id}`)
      return
    }

    toast.add({ title: 'System presets cannot be edited', color: 'warning' })
  }

  function widgetIcon(widget: { visualType?: string; type?: string }) {
    switch (widget.visualType || widget.type) {
      case 'scatter':
        return 'i-lucide-chart-scatter'
      case 'heatmap':
        return 'i-lucide-grid-2x2'
      case 'combo':
        return 'i-lucide-chart-column-increasing'
      case 'stackedBar':
      case 'horizontalBar':
      case 'bar':
        return 'i-lucide-bar-chart-3'
      default:
        return 'i-lucide-line-chart'
    }
  }

  function audienceLabel(widget: Pick<AnalyticsSystemPreset, 'audience'> | any) {
    if (widget.isCustom) return 'Custom'
    if (widget.audience === 'coach') return 'Coach'
    if (widget.audience === 'athlete') return 'Athlete'
    return 'Athlete + Coach'
  }

  function selectSingleAthlete(athleteId: string | null) {
    rosterMode.value = 'single'
    selectedAthleteIds.value = athleteId ? [athleteId] : []
  }

  function toggleCompareAthlete(athleteId: string) {
    rosterMode.value = 'compare'

    if (selectedAthleteIds.value.includes(athleteId)) {
      selectedAthleteIds.value = selectedAthleteIds.value.filter((id) => id !== athleteId)
      return
    }

    selectedAthleteIds.value = [...selectedAthleteIds.value, athleteId]
  }

  function applyQuickRange(range: '14d' | '30d' | '90d' | '180d' | 'ytd') {
    selectedRangeKey.value = range
    rangeTouched.value = true
  }

  function activateCustomRange() {
    const now = new Date()
    const start = new Date()
    start.setDate(now.getDate() - 29)
    customStartDate.value ||= toDateInputValue(start)
    customEndDate.value ||= toDateInputValue(now)
    selectedRangeKey.value = 'custom'
    rangeTouched.value = true
  }

  function resetToPresetRange() {
    selectedRangeKey.value = 'preset'
    customStartDate.value = ''
    customEndDate.value = ''
    rangeTouched.value = false
  }

  function toggleOverlay(overlayId: string) {
    if (selectedOverlayIds.value.includes(overlayId)) {
      selectedOverlayIds.value = selectedOverlayIds.value.filter((id) => id !== overlayId)
      return
    }

    selectedOverlayIds.value = [...selectedOverlayIds.value, overlayId]
  }

  function resetOverlays() {
    selectedOverlayIds.value = [...(selectedWidget.value?.defaultOverlays || [])]
  }

  function closeBrowseOverlays() {
    console.log('[AnalyticsBrowse] closeBrowseOverlays', route.fullPath)
    datePickerOpen.value = false
    overlayPickerOpen.value = false
  }

  onBeforeRouteLeave(() => {
    closeBrowseOverlays()
  })

  onBeforeUnmount(() => {
    closeBrowseOverlays()
  })
</script>

<template>
  <UDashboardPanel id="analytics-browse">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #title>
          <CoachingNavbarLinks />
        </template>
        <template #right>
          <ClientOnly>
            <div class="flex items-center gap-2">
              <UPopover v-if="hasOverlayControls" v-model:open="overlayPickerOpen">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-sliders-horizontal"
                  size="sm"
                  class="font-bold"
                >
                  <span class="hidden md:inline">{{ overlayLabel }}</span>
                </UButton>

                <template #content>
                  <div class="w-[320px] space-y-4 p-3">
                    <div class="space-y-1">
                      <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                        Overlays
                      </div>
                      <p class="text-xs text-muted">
                        Add interpretation layers like baselines, targets, trendlines, or cohort
                        context.
                      </p>
                    </div>

                    <div class="space-y-2">
                      <button
                        v-for="overlay in overlayOptions"
                        :key="overlay.id"
                        class="flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition hover:border-primary/50"
                        :class="
                          selectedOverlayIds.includes(overlay.id)
                            ? 'border-primary/60 bg-primary/5'
                            : 'border-default/70 bg-default'
                        "
                        @click="toggleOverlay(overlay.id)"
                      >
                        <div
                          class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-default/70"
                          :class="
                            selectedOverlayIds.includes(overlay.id)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-default text-transparent'
                          "
                        >
                          <UIcon name="i-lucide-check" class="h-3.5 w-3.5" />
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="text-sm font-bold text-highlighted">
                            {{ overlay.label }}
                          </div>
                          <p class="text-xs text-muted">{{ overlay.description }}</p>
                        </div>
                      </button>
                    </div>

                    <div class="flex items-center justify-between border-t border-default pt-3">
                      <UButton size="xs" color="neutral" variant="ghost" @click="resetOverlays">
                        Reset Defaults
                      </UButton>
                      <UButton
                        size="xs"
                        color="primary"
                        variant="soft"
                        @click="overlayPickerOpen = false"
                      >
                        Apply
                      </UButton>
                    </div>
                  </div>
                </template>
              </UPopover>

              <UButton
                v-if="selectedWidget"
                color="neutral"
                variant="outline"
                icon="i-lucide-edit"
                label="Edit Visualization"
                size="sm"
                class="font-bold"
                @click="editWidget"
              />
              <UButton
                v-if="selectedWidget"
                color="primary"
                variant="solid"
                icon="i-lucide-pin"
                label="Pin to Dashboard"
                size="sm"
                class="font-bold"
                :loading="saving"
                @click="pinToDashboard"
              />
            </div>
          </ClientOnly>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full min-h-0 overflow-hidden">
        <aside class="w-80 border-r border-default bg-default/80">
          <div class="space-y-3 p-3">
            <div
              class="inline-flex w-full items-center rounded-2xl border border-default bg-muted/20 p-1"
            >
              <UButton
                size="sm"
                :color="leftRailTab === 'roster' ? 'primary' : 'neutral'"
                :variant="leftRailTab === 'roster' ? 'soft' : 'ghost'"
                class="flex-1"
                @click="leftRailTab = 'roster'"
              >
                Roster
              </UButton>
              <UButton
                size="sm"
                :color="leftRailTab === 'library' ? 'primary' : 'neutral'"
                :variant="leftRailTab === 'library' ? 'soft' : 'ghost'"
                class="flex-1"
                @click="leftRailTab = 'library'"
              >
                Library
              </UButton>
            </div>

            <div v-if="leftRailTab === 'roster'" class="space-y-2">
              <div class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                Athlete roster
              </div>
              <div class="flex items-center gap-2">
                <UInput
                  v-model="athleteSearch"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Search athletes"
                  size="sm"
                  class="flex-1"
                />
                <div
                  class="inline-flex items-center gap-1 rounded-full border border-default bg-muted/15 p-1"
                >
                  <UButton
                    size="xs"
                    color="neutral"
                    :variant="rosterMode === 'single' ? 'soft' : 'ghost'"
                    class="rounded-full px-3"
                    icon="i-lucide-user"
                    @click="rosterMode = 'single'"
                  >
                    Single
                  </UButton>
                  <UButton
                    size="xs"
                    color="neutral"
                    :variant="rosterMode === 'compare' ? 'soft' : 'ghost'"
                    class="rounded-full px-3"
                    icon="i-lucide-users"
                    @click="rosterMode = 'compare'"
                  >
                    Compare
                  </UButton>
                </div>
              </div>
            </div>

            <div
              v-if="leftRailTab === 'roster'"
              class="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1"
            >
              <button
                class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
                :class="
                  selectedAthleteIds.length === 0
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-default/70 bg-default'
                "
                @click="selectSingleAthlete(null)"
              >
                <div class="flex items-center gap-3">
                  <UAvatar icon="i-lucide-user" size="md" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-bold text-highlighted">My personal data</div>
                    <div class="text-xs text-muted">Preview your own analytics context</div>
                  </div>
                </div>
              </button>

              <div v-if="loadingAthletes" class="space-y-2">
                <USkeleton v-for="i in 3" :key="i" class="h-20 rounded-2xl" />
              </div>

              <div
                v-else-if="filteredAthletes.length === 0"
                class="rounded-2xl border border-dashed border-default/70 bg-default p-4 text-sm text-muted"
              >
                No athletes match this search.
              </div>

              <button
                v-for="rel in filteredAthletes"
                :key="rel.athleteId"
                class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
                :class="
                  selectedAthleteIds.includes(rel.athleteId)
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-default/70 bg-default'
                "
                @click="
                  rosterMode === 'compare'
                    ? toggleCompareAthlete(rel.athleteId)
                    : selectSingleAthlete(rel.athleteId)
                "
              >
                <div class="flex items-center gap-3">
                  <UAvatar :src="rel.athlete.image" :alt="rel.athlete.name" size="md" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-bold text-highlighted">{{ rel.athlete.name }}</div>
                    <div class="text-xs text-muted">{{ rel.athlete.email }}</div>
                  </div>
                  <UIcon
                    v-if="rosterMode === 'compare' && selectedAthleteIds.includes(rel.athleteId)"
                    name="i-lucide-check"
                    class="h-4 w-4 text-primary"
                  />
                </div>
              </button>
            </div>

            <div v-if="leftRailTab === 'library'" class="space-y-3">
              <div class="space-y-1">
                <div class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                  Chart library
                </div>
                <UInput
                  v-model="widgetSearch"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Search charts"
                  size="sm"
                />
              </div>

              <div class="flex flex-wrap gap-2">
                <UButton
                  size="xs"
                  :color="activeCategory === 'all' ? 'primary' : 'neutral'"
                  :variant="activeCategory === 'all' ? 'soft' : 'outline'"
                  class="rounded-full"
                  @click="activeCategory = 'all'"
                >
                  All
                </UButton>
                <UButton
                  v-for="category in ANALYTICS_PRESET_CATEGORIES"
                  :key="category.value"
                  size="xs"
                  :color="activeCategory === category.value ? 'primary' : 'neutral'"
                  :variant="activeCategory === category.value ? 'soft' : 'outline'"
                  class="rounded-full"
                  @click="activeCategory = category.value"
                >
                  {{ category.label }}
                </UButton>
              </div>
            </div>

            <div
              v-if="leftRailTab === 'library'"
              class="max-h-[calc(100vh-260px)] space-y-4 overflow-y-auto pr-1"
            >
              <div v-for="group in groupedSystemWidgets" :key="group.value" class="space-y-2">
                <div class="flex items-center justify-between px-1">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                    {{ group.label }}
                  </div>
                  <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                    {{ group.widgets.length }}
                  </div>
                </div>

                <button
                  v-for="widget in group.widgets"
                  :key="widget.id"
                  class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
                  :class="
                    selectedWidget?.id === widget.id
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-default/70 bg-default'
                  "
                  @click="selectedWidget = widget"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-xl border border-default/60 bg-muted/30"
                    >
                      <UIcon :name="widgetIcon(widget)" class="h-4 w-4 text-primary-500" />
                    </div>
                    <div class="min-w-0 flex-1 space-y-1">
                      <div class="truncate font-bold text-highlighted">{{ widget.name }}</div>
                      <p class="line-clamp-2 text-xs text-muted">
                        {{ widget.description }}
                      </p>
                      <div class="flex flex-wrap gap-1 pt-1">
                        <UBadge v-if="widget.flagship" color="warning" variant="soft" size="xs">
                          Flagship
                        </UBadge>
                        <UBadge color="primary" variant="soft" size="xs">{{ group.label }}</UBadge>
                        <UBadge color="neutral" variant="outline" size="xs">{{
                          widget.visualType
                        }}</UBadge>
                        <UBadge color="neutral" variant="outline" size="xs">{{
                          audienceLabel(widget)
                        }}</UBadge>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div v-if="filteredCustomWidgets.length > 0" class="space-y-2">
                <div class="flex items-center justify-between px-1">
                  <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                    Custom
                  </div>
                  <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                    {{ filteredCustomWidgets.length }}
                  </div>
                </div>

                <button
                  v-for="widget in filteredCustomWidgets"
                  :key="widget.id"
                  class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
                  :class="
                    selectedWidget?.id === widget.id
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-default/70 bg-default'
                  "
                  @click="selectedWidget = widget"
                >
                  <div class="flex items-start gap-3">
                    <div
                      class="flex h-10 w-10 items-center justify-center rounded-xl border border-default/60 bg-muted/30"
                    >
                      <UIcon :name="widgetIcon(widget)" class="h-4 w-4 text-primary-500" />
                    </div>
                    <div class="min-w-0 flex-1 space-y-1">
                      <div class="truncate font-bold text-highlighted">{{ widget.name }}</div>
                      <p class="line-clamp-2 text-xs text-muted">
                        {{ widget.description }}
                      </p>
                      <div class="flex flex-wrap gap-1 pt-1">
                        <UBadge color="neutral" variant="soft" size="xs">Custom</UBadge>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <div
                v-if="groupedSystemWidgets.length === 0 && filteredCustomWidgets.length === 0"
                class="rounded-2xl border border-dashed border-default/70 bg-default p-4 text-sm text-muted"
              >
                No charts match this search.
              </div>
            </div>
          </div>
        </aside>

        <main class="flex-1 overflow-y-auto bg-default/30 px-6 pb-8 pt-3 lg:px-8">
          <div v-if="selectedWidget" class="mx-auto flex h-full max-w-5xl flex-col">
            <div class="mb-6 rounded-3xl border border-default bg-default p-6 shadow-sm">
              <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <h2
                    class="text-4xl font-black uppercase tracking-tight text-gray-900 dark:text-white"
                  >
                    {{ selectedWidget.name }}
                  </h2>
                  <UBadge v-if="selectedWidget.flagship" color="warning" variant="soft" size="xs">
                    Flagship
                  </UBadge>
                  <UBadge color="primary" variant="soft" size="xs">{{
                    selectedCategoryLabel
                  }}</UBadge>
                  <UBadge color="neutral" variant="outline" size="xs">{{
                    selectedWidget.visualType
                  }}</UBadge>
                  <UBadge
                    :color="selectedWidget.isCustom ? 'neutral' : 'primary'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ selectedWidget.isCustom ? 'Custom' : 'System' }}
                  </UBadge>
                </div>
                <p class="max-w-2xl text-neutral-500">
                  {{ selectedWidget.description }}
                </p>
                <div
                  v-if="compareContextCopy"
                  class="max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted"
                >
                  {{ compareContextCopy }}
                </div>
                <div
                  class="mt-4 flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-neutral-400"
                >
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-user" class="h-3.5 w-3.5" />
                    Viewing: <span class="text-primary-500">{{ selectedAudienceLabel }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-layers-3" class="h-3.5 w-3.5" />
                    Category:
                    <span class="text-neutral-600 dark:text-neutral-200">{{
                      selectedCategoryLabel
                    }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-database" class="h-3.5 w-3.5" />
                    Source:
                    <span class="text-neutral-600 dark:text-neutral-200">{{
                      selectedWidget.source
                    }}</span>
                  </div>
                  <ClientOnly>
                    <UPopover v-if="selectedWidget" v-model:open="datePickerOpen">
                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-calendar-range"
                        size="xs"
                        class="h-auto px-0 py-0 font-black uppercase tracking-widest text-neutral-400 hover:bg-transparent hover:text-neutral-600 dark:hover:text-neutral-200"
                      >
                        Date:
                        <span class="text-neutral-600 dark:text-neutral-200">{{ rangeLabel }}</span>
                      </UButton>

                      <template #content>
                        <div class="w-[320px] space-y-4 p-3">
                          <div class="space-y-1">
                            <div
                              class="text-[10px] font-black uppercase tracking-[0.2em] text-muted"
                            >
                              Date range
                            </div>
                            <p class="text-xs text-muted">
                              Preview the selected chart over a different time horizon.
                            </p>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            <UButton
                              size="xs"
                              :variant="selectedRangeKey === '14d' ? 'soft' : 'outline'"
                              color="neutral"
                              @click="applyQuickRange('14d')"
                              >14D</UButton
                            >
                            <UButton
                              size="xs"
                              :variant="selectedRangeKey === '30d' ? 'soft' : 'outline'"
                              color="neutral"
                              @click="applyQuickRange('30d')"
                              >30D</UButton
                            >
                            <UButton
                              size="xs"
                              :variant="selectedRangeKey === '90d' ? 'soft' : 'outline'"
                              color="neutral"
                              @click="applyQuickRange('90d')"
                              >90D</UButton
                            >
                            <UButton
                              size="xs"
                              :variant="selectedRangeKey === '180d' ? 'soft' : 'outline'"
                              color="neutral"
                              @click="applyQuickRange('180d')"
                              >180D</UButton
                            >
                            <UButton
                              size="xs"
                              :variant="selectedRangeKey === 'ytd' ? 'soft' : 'outline'"
                              color="neutral"
                              @click="applyQuickRange('ytd')"
                              >YTD</UButton
                            >
                            <UButton
                              size="xs"
                              :variant="selectedRangeKey === 'custom' ? 'soft' : 'outline'"
                              color="neutral"
                              @click="activateCustomRange"
                              >Custom</UButton
                            >
                          </div>

                          <div v-if="selectedRangeKey === 'custom'" class="grid grid-cols-2 gap-2">
                            <UFormField label="Start">
                              <UInput v-model="customStartDate" type="date" size="sm" />
                            </UFormField>
                            <UFormField label="End">
                              <UInput v-model="customEndDate" type="date" size="sm" />
                            </UFormField>
                          </div>

                          <div
                            class="flex items-center justify-between border-t border-default pt-3"
                          >
                            <UButton
                              size="xs"
                              color="neutral"
                              variant="ghost"
                              @click="resetToPresetRange"
                            >
                              Reset to preset
                            </UButton>
                            <UButton
                              size="xs"
                              color="primary"
                              variant="soft"
                              @click="datePickerOpen = false"
                            >
                              Apply
                            </UButton>
                          </div>
                        </div>
                      </template>
                    </UPopover>
                  </ClientOnly>
                  <div v-if="selectedOverlayIds.length" class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-sliders-horizontal" class="h-3.5 w-3.5" />
                    Overlays:
                    <span class="text-neutral-600 dark:text-neutral-200">{{ overlayLabel }}</span>
                  </div>
                </div>
              </div>
            </div>

            <UCard
              class="flex-1 overflow-hidden border-2 border-primary-500/10 bg-neutral-50/30 shadow-2xl dark:bg-neutral-900/20"
              :ui="{ body: 'p-4 h-full' }"
            >
              <AnalyticsBaseWidget :config="previewConfig" />
            </UCard>

            <div class="mt-6 max-w-3xl rounded-2xl border border-default/60 bg-default/90 p-4">
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                Why use this chart
              </div>
              <p class="mt-2 text-sm text-highlighted">
                {{ selectedWidget.insightCopy || selectedWidget.description }}
              </p>
            </div>
          </div>

          <div v-else class="flex h-full items-center justify-center text-center">
            <div class="max-w-xs space-y-4">
              <UIcon name="i-lucide-bar-chart-3" class="mx-auto h-16 w-16 text-neutral-200" />
              <p class="italic text-neutral-400">
                Select a visualization from the library to begin previewing data.
              </p>
            </div>
          </div>
        </main>
      </div>
    </template>
  </UDashboardPanel>
</template>
