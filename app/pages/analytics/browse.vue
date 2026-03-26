<script setup lang="ts">
  import {
    ANALYTICS_PRESET_CATEGORIES,
    ANALYTICS_SYSTEM_PRESETS,
    type AnalyticsOverlayOption,
    type AnalyticsPresetCategory,
    type AnalyticsSystemPreset
  } from '~/utils/analytics-presets'
  import WidgetSettingsModal from '~/components/analytics/WidgetSettingsModal.vue'

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
  const isSettingsModalOpen = ref(false)
  const previewSettings = ref<any>({})

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
    if (!hasOverlayControls.value) return 'None'
    if (selectedOverlayIds.value.length === 0) return 'Off'
    if (selectedOverlayIds.value.length === 1) {
      return (
        overlayOptions.value.find((overlay) => overlay.id === selectedOverlayIds.value[0])?.label ||
        '1 Active'
      )
    }
    return `${selectedOverlayIds.value.length} Active`
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
        return `${String(presetRange.value).toUpperCase()}`
      }
      if (presetRange?.type === 'ytd') return 'YTD'
      return 'Default'
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
      settings: {
        ...previewSettings.value,
        ...(selectedWidget.value.settings || {})
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
      previewSettings.value = { ...(selectedWidget.value?.settings || {}) }
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
        timeRangeMode: 'override'
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

  function clearOverlays() {
    selectedOverlayIds.value = []
  }

  function closeBrowseOverlays() {
    datePickerOpen.value = false
    overlayPickerOpen.value = false
  }

  const isLibraryOpen = ref(false)

  onBeforeRouteLeave(() => {
    closeBrowseOverlays()
    isLibraryOpen.value = false
  })

  onBeforeUnmount(() => {
    closeBrowseOverlays()
    isLibraryOpen.value = false
  })
</script>

<template>
  <UDashboardPanel id="analytics-browse">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            icon="i-lucide-library"
            color="neutral"
            variant="ghost"
            class="lg:hidden"
            @click="isLibraryOpen = true"
          />
        </template>
        <template #title>
          <CoachingNavbarLinks />
        </template>
        <template #right>
          <ClientOnly>
            <div class="flex items-center gap-2">
              <UButton
                v-if="selectedWidget"
                color="neutral"
                variant="outline"
                icon="i-lucide-edit"
                label="Edit Source"
                size="sm"
                class="hidden font-bold md:flex"
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
        <!-- Desktop Sidebar -->
        <aside class="hidden w-80 border-r border-default bg-default/80 lg:block">
          <AnalyticsBrowseSelector
            v-model:left-rail-tab="leftRailTab"
            v-model:athlete-search="athleteSearch"
            v-model:widget-search="widgetSearch"
            v-model:active-category="activeCategory"
            v-model:roster-mode="rosterMode"
            :loading-athletes="loadingAthletes"
            :filtered-athletes="filteredAthletes"
            :selected-athlete-ids="selectedAthleteIds"
            :grouped-system-widgets="groupedSystemWidgets"
            :filtered-custom-widgets="filteredCustomWidgets"
            :selected-widget-id="selectedWidget?.id"
            @select-single-athlete="selectSingleAthlete"
            @toggle-compare-athlete="toggleCompareAthlete"
            @select-widget="selectedWidget = $event"
          />
        </aside>

        <!-- Mobile Sidebar (Drawer) -->
        <USlideover v-model:open="isLibraryOpen" side="left" title="Analytics Explorer">
          <template #content>
            <AnalyticsBrowseSelector
              v-model:left-rail-tab="leftRailTab"
              v-model:athlete-search="athleteSearch"
              v-model:widget-search="widgetSearch"
              v-model:active-category="activeCategory"
              v-model:roster-mode="rosterMode"
              :loading-athletes="loadingAthletes"
              :filtered-athletes="filteredAthletes"
              :selected-athlete-ids="selectedAthleteIds"
              :grouped-system-widgets="groupedSystemWidgets"
              :filtered-custom-widgets="filteredCustomWidgets"
              :selected-widget-id="selectedWidget?.id"
              @select-single-athlete="
                (id) => {
                  selectSingleAthlete(id)
                  isLibraryOpen = false
                }
              "
              @toggle-compare-athlete="toggleCompareAthlete"
              @select-widget="
                (w) => {
                  selectedWidget = w
                  isLibraryOpen = false
                }
              "
            />
          </template>
        </USlideover>

        <main
          class="min-w-0 flex-1 overflow-y-auto bg-default/30 px-0 pb-8 pt-0 sm:px-6 sm:pt-3 lg:px-8"
        >
          <div v-if="selectedWidget" class="mx-auto flex h-full max-w-5xl flex-col">
            <div
              class="mb-4 border-y border-default bg-default p-4 shadow-sm sm:mb-6 sm:rounded-3xl sm:border sm:p-6"
            >
              <div class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <h2
                    class="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white sm:text-4xl"
                  >
                    {{ selectedWidget.name }}
                  </h2>
                  <div class="flex flex-wrap gap-1">
                    <UBadge v-if="selectedWidget.flagship" color="warning" variant="soft" size="xs">
                      Flagship
                    </UBadge>
                    <UBadge color="primary" variant="soft" size="xs">{{
                      selectedCategoryLabel
                    }}</UBadge>
                    <UBadge color="neutral" variant="outline" size="xs">{{
                      selectedWidget.visualType
                    }}</UBadge>
                  </div>
                </div>
                <p class="max-w-2xl text-sm text-neutral-500 sm:text-base">
                  {{ selectedWidget.description }}
                </p>
                <div
                  v-if="compareContextCopy"
                  class="max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted sm:p-4 sm:text-sm"
                >
                  {{ compareContextCopy }}
                </div>

                <div
                  class="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-black uppercase tracking-widest text-neutral-400"
                >
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-user" class="h-3.5 w-3.5" />
                    Viewing: <span class="text-primary-500">{{ selectedAudienceLabel }}</span>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-database" class="h-3.5 w-3.5" />
                    Source:
                    <span class="text-neutral-600 dark:text-neutral-200">{{
                      selectedWidget.source
                    }}</span>
                  </div>

                  <ClientOnly>
                    <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
                      <UPopover v-if="selectedWidget" v-model:open="datePickerOpen">
                        <UButton
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-calendar-range"
                          size="xs"
                          class="h-auto px-0 py-0 font-black uppercase tracking-widest text-neutral-400 hover:bg-transparent hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          Date:
                          <span class="text-neutral-600 dark:text-neutral-200">{{
                            rangeLabel
                          }}</span>
                        </UButton>

                        <template #content>
                          <div class="w-[320px] space-y-4 p-3 sm:w-[350px]">
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

                            <div
                              v-if="selectedRangeKey === 'custom'"
                              class="grid grid-cols-2 gap-2"
                            >
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
                                Reset
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

                      <UPopover v-if="hasOverlayControls" v-model:open="overlayPickerOpen">
                        <UButton
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-sliders-horizontal"
                          size="xs"
                          class="h-auto px-0 py-0 font-black uppercase tracking-widest text-neutral-400 hover:bg-transparent hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          Overlays:
                          <span class="text-neutral-600 dark:text-neutral-200">{{
                            overlayLabel
                          }}</span>
                        </UButton>

                        <template #content>
                          <div class="w-[300px] space-y-4 p-3 sm:w-[320px]">
                            <div class="space-y-1">
                              <div
                                class="text-[10px] font-black uppercase tracking-[0.2em] text-muted"
                              >
                                Overlays
                              </div>
                              <p class="text-xs text-muted">
                                Add interpretation layers like baselines or trends.
                              </p>
                            </div>

                            <div class="max-h-60 space-y-2 overflow-y-auto">
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

                            <div
                              class="flex items-center justify-between border-t border-default pt-3"
                            >
                              <UButton
                                size="xs"
                                color="neutral"
                                variant="ghost"
                                @click="clearOverlays"
                              >
                                Off
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
                        variant="ghost"
                        icon="i-lucide-settings-2"
                        size="xs"
                        class="h-auto px-0 py-0 font-black uppercase tracking-widest text-neutral-400 hover:bg-transparent hover:text-neutral-600 dark:hover:text-neutral-200"
                        @click="isSettingsModalOpen = true"
                      >
                        Settings:
                        <span class="text-neutral-600 dark:text-neutral-200">Config</span>
                      </UButton>
                    </div>
                  </ClientOnly>
                </div>
              </div>
            </div>

            <UCard
              class="min-h-[350px] flex-1 border-x-0 border-y-2 border-primary-500/10 bg-neutral-50/30 shadow-2xl dark:bg-neutral-900/20 sm:min-h-[450px] sm:rounded-3xl sm:border-2"
              :ui="{
                root: 'rounded-none sm:rounded-3xl',
                body: 'p-0 sm:p-4 h-full min-h-[350px] sm:min-h-[450px]'
              }"
            >
              <AnalyticsBaseWidget :config="previewConfig" />
            </UCard>

            <div
              class="mt-4 border-y border-default/60 bg-default/90 p-4 sm:mt-6 sm:max-w-3xl sm:rounded-2xl sm:border"
            >
              <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                Why use this chart
              </div>
              <p class="mt-2 text-xs text-highlighted sm:text-sm">
                {{ selectedWidget.insightCopy || selectedWidget.description }}
              </p>
            </div>
          </div>

          <div v-else class="flex h-full items-center justify-center p-8 text-center">
            <div class="max-w-xs space-y-4">
              <UIcon
                name="i-lucide-bar-chart-3"
                class="mx-auto h-12 w-12 text-neutral-200 sm:h-16 sm:w-16"
              />
              <p class="text-sm italic text-neutral-400 sm:text-base">
                Select a visualization from the library to begin previewing data.
              </p>
              <UButton
                label="Open Explorer"
                icon="i-lucide-library"
                color="primary"
                variant="soft"
                class="lg:hidden"
                @click="isLibraryOpen = true"
              />
            </div>
          </div>
        </main>
      </div>
    </template>
  </UDashboardPanel>

  <WidgetSettingsModal
    v-if="selectedWidget"
    v-model="isSettingsModalOpen"
    v-model:config="selectedWidget"
  />
</template>
