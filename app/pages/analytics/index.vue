<script setup lang="ts">
  import { ANALYTICS_SYSTEM_PRESETS } from '~/utils/analytics-presets'
  import draggable from 'vuedraggable'
  import { useDebounceFn } from '@vueuse/core'

  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Analytics | Coach Watts',
    meta: [
      {
        name: 'description',
        content: 'Advanced performance analytics and custom dashboards.'
      }
    ]
  })

  const router = useRouter()
  const route = useRoute()
  const activeTab = ref(0)
  const isWidgetLibraryOpen = ref(false)
  const isFieldManagerOpen = ref(false)
  const widgetSearch = ref('')
  const activeCategory = ref<'all' | AnalyticsPresetCategory>('all')
  const isNewDashboardModalOpen = ref(false)
  const isRenameDashboardModalOpen = ref(false)
  const isRenameWidgetModalOpen = ref(false)
  const isExpandedWidgetOpen = ref(false)
  const expandedWidgetInstanceId = ref<string | null>(null)
  const newDashboardName = ref('')
  const renameDashboardId = ref<string | null>(null)
  const renameDashboardName = ref('')
  const renameWidgetInstanceId = ref<string | null>(null)
  const renameWidgetName = ref('')
  const toast = useToast()

  // Data fetching
  const {
    data: dashboards,
    refresh: refreshDashboards,
    pending: loadingDashboards
  } = await useFetch('/api/analytics/dashboards')
  const { data: customWidgets, refresh: refreshWidgets } = await useFetch('/api/analytics/widgets')

  const filteredCustomWidgets = computed(() => {
    const search = widgetSearch.value.trim().toLowerCase()
    const base = ((customWidgets.value as any[]) || []).map((widget) => ({
      ...widget.config,
      id: widget.id,
      name: widget.name,
      description: widget.description || 'Custom visualization',
      isCustom: true,
      category: 'custom' as const,
      audience: 'both',
      visualType: widget.config.visualType || widget.config.type || 'line'
    }))

    return base.filter((widget) => {
      const matchesCategory = activeCategory.value === 'all' || activeCategory.value === 'custom'
      if (!matchesCategory) return false

      if (!search) return true
      return [widget.name, widget.description, widget.source].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(search)
      )
    })
  })

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

  const activeDashboardId = ref<string | null>(null)
  const activeDashboard = computed(() => {
    const availableDashboards = dashboards.value || []
    if (activeDashboardId.value) {
      return (
        availableDashboards.find((dashboard: any) => dashboard.id === activeDashboardId.value) ||
        null
      )
    }
    return availableDashboards[0] || null
  })
  const dashboardWidgets = ref<any[]>([])
  const activeScope = ref({ target: 'self' })
  const activeDateRange = ref<any>(null)
  const datePickerOpen = ref(false)
  const selectedRangeKey = ref<'30d' | '90d' | '180d' | 'ytd' | 'custom'>('90d')
  const customStartDate = ref('')
  const customEndDate = ref('')
  const isHydratingDashboardState = ref(false)

  function analyticsLog(message: string, payload?: any) {
    console.log(`[AnalyticsDashboard] ${message}`, payload ?? '')
  }

  function beginHydration(reason: string) {
    analyticsLog('beginHydration', reason)
    isHydratingDashboardState.value = true
  }

  function endHydration() {
    nextTick(() => {
      isHydratingDashboardState.value = false
      analyticsLog('endHydration')
    })
  }

  // Local state for draggable tabs to avoid computed property jitter
  const localTabs = ref<any[]>([])

  const tabs = computed(() => {
    return (dashboards.value || []).map((d: any) => ({
      label: d.name,
      icon: 'i-lucide-layout-dashboard',
      slot: 'dashboard',
      id: d.id
    }))
  })

  // Sync localTabs whenever dashboards change (but not while dragging)
  watch(
    tabs,
    (newTabs) => {
      localTabs.value = [...newTabs]
    },
    { immediate: true }
  )

  async function onTabReorder() {
    try {
      // Find the currently active tab ID before reordering
      const currentActiveId = activeDashboardId.value

      await $fetch('/api/analytics/dashboards/reorder', {
        method: 'POST',
        body: { ids: localTabs.value.map((t) => t.id) }
      })

      await refreshDashboards()

      // Restore activeTab index based on the new order of the ID
      if (currentActiveId) {
        const newIndex = localTabs.value.findIndex((t) => t.id === currentActiveId)
        if (newIndex !== -1) {
          activeTab.value = newIndex
        }
      }
    } catch (e) {
      toast.add({ title: 'Failed to save tab order', color: 'error' })
    }
  }

  // Keep activeTab in sync with activeDashboardId
  watch(activeTab, (newIndex) => {
    const tab = localTabs.value[newIndex]
    if (tab && tab.id) {
      activeDashboardId.value = tab.id
    }
  })

  // Keep activeTab index in sync if activeDashboardId changes externally
  watch(
    activeDashboardId,
    (newId) => {
      if (newId) {
        const index = tabs.value.findIndex((t) => t.id === newId)
        if (index !== -1 && index !== activeTab.value) {
          activeTab.value = index
        }
      }
    },
    { immediate: true }
  )

  watch(
    dashboards,
    (nextDashboards) => {
      if (!activeDashboardId.value && nextDashboards?.length) {
        activeDashboardId.value = nextDashboards[0]?.id || null
      }
    },
    { immediate: true }
  )

  watch(
    () => (activeDashboard.value as any)?.scope,
    (scope) => {
      beginHydration('scope')
      analyticsLog('activeDashboard.scope changed', scope)
      activeScope.value = (scope as any) || { target: 'self' }
      endHydration()
    },
    { immediate: true, deep: true }
  )

  watch(
    () => (activeDashboard.value as any)?.dateRange,
    (dateRange) => {
      beginHydration('dateRange')
      analyticsLog('activeDashboard.dateRange changed', dateRange)
      activeDateRange.value = (dateRange as any) || null

      if (!dateRange) {
        selectedRangeKey.value = '90d'
        customStartDate.value = ''
        customEndDate.value = ''
        endHydration()
        return
      }

      if (dateRange.type === 'fixed') {
        selectedRangeKey.value = 'custom'
        customStartDate.value = String(dateRange.startDate || '').slice(0, 10)
        customEndDate.value = String(dateRange.endDate || '').slice(0, 10)
        endHydration()
        return
      }

      if (dateRange.type === 'ytd') {
        selectedRangeKey.value = 'ytd'
        endHydration()
        return
      }

      selectedRangeKey.value = (dateRange.value as any) || '90d'
      endHydration()
    },
    { immediate: true, deep: true }
  )

  function isRenderableWidget(entry: any) {
    return entry && entry._meta?.type !== 'dashboard-scope'
  }

  watch(
    () => activeDashboard.value?.layout,
    (layout) => {
      beginHydration('layout')
      analyticsLog('activeDashboard.layout changed', {
        dashboardId: activeDashboard.value?.id,
        items: Array.isArray(layout) ? layout.length : 0
      })
      if (activeDashboard.value?.id && Array.isArray(layout)) {
        dashboardWidgets.value = layout.filter(isRenderableWidget).map((widget) => ({
          ...widget,
          instanceId: widget.instanceId || crypto.randomUUID()
        }))
      } else if (activeDashboard.value?.id) {
        dashboardWidgets.value = []
      }
      endHydration()
    },
    { immediate: true, deep: true }
  )

  const saving = ref(false)
  async function saveDashboard() {
    if (saving.value) {
      analyticsLog('saveDashboard skipped because save is already in progress')
      return
    }
    saving.value = true
    try {
      const payload = {
        id: activeDashboardId.value || undefined,
        name: activeDashboard.value?.name || 'Main Dashboard',
        layout: dashboardWidgets.value,
        scope: normalizeScope(activeScope.value),
        dateRange: normalizeDateRange(activeDateRange.value)
      }
      analyticsLog('saveDashboard request', payload)
      const dashboard = await $fetch('/api/analytics/dashboards', {
        method: 'POST',
        body: payload
      })
      analyticsLog('saveDashboard response', dashboard)
      activeDashboardId.value = (dashboard as any).id
      await refreshDashboards()
      analyticsLog('refreshDashboards completed after save')
    } catch (e) {
      console.error('Failed to save dashboard:', e)
    } finally {
      setTimeout(() => {
        saving.value = false
      }, 500)
    }
  }

  const creatingDashboard = ref(false)
  async function createDashboard() {
    if (!newDashboardName.value) return
    creatingDashboard.value = true
    try {
      const dashboard = await $fetch('/api/analytics/dashboards', {
        method: 'POST',
        body: {
          name: newDashboardName.value,
          layout: [],
          scope: { target: 'self' },
          dateRange: { type: 'rolling', value: '90d' }
        }
      })
      await refreshDashboards()
      activeDashboardId.value = (dashboard as any).id
      isNewDashboardModalOpen.value = false
      newDashboardName.value = ''
      toast.add({ title: 'Dashboard created', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Failed to create dashboard', color: 'error' })
    } finally {
      creatingDashboard.value = false
    }
  }

  const debouncedSave = useDebounceFn(saveDashboard, 1000)

  // Auto-save layout changes
  watch(
    dashboardWidgets,
    (newVal, oldVal) => {
      // Only save if we have actual changes and it's not the initial load of the dashboard
      if (isHydratingDashboardState.value) {
        analyticsLog('dashboardWidgets watcher ignored during hydration')
        return
      }

      if (!loadingDashboards.value && activeDashboardId.value && oldVal.length > 0) {
        analyticsLog('dashboardWidgets watcher triggered save', {
          widgetCount: newVal.length,
          previousCount: oldVal.length
        })
        debouncedSave()
      }
    },
    { deep: true }
  )

  watch(
    activeScope,
    () => {
      if (isHydratingDashboardState.value) {
        analyticsLog('activeScope watcher ignored during hydration')
        return
      }

      if (!loadingDashboards.value && activeDashboardId.value) {
        analyticsLog('activeScope watcher triggered save', normalizeScope(activeScope.value))
        debouncedSave()
      }
    },
    { deep: true }
  )

  watch(
    activeDateRange,
    () => {
      if (isHydratingDashboardState.value) {
        analyticsLog('activeDateRange watcher ignored during hydration')
        return
      }

      if (!loadingDashboards.value && activeDashboardId.value) {
        analyticsLog(
          'activeDateRange watcher triggered save',
          normalizeDateRange(activeDateRange.value)
        )
        debouncedSave()
      }
    },
    { deep: true }
  )

  function addWidget(widget: any) {
    const newWidget = {
      ...widget,
      instanceId: crypto.randomUUID(),
      scopeMode:
        widget.scope && (widget.scope.target !== 'self' || widget.scope.targetIds?.length)
          ? 'override'
          : 'inherit',
      timeRangeMode: widget.timeRangeMode || 'inherit'
    }
    dashboardWidgets.value.push(newWidget)
    isWidgetLibraryOpen.value = false
    toast.add({ title: 'Widget added to dashboard', color: 'success' })
  }

  function removeWidget(instanceId: string) {
    dashboardWidgets.value = dashboardWidgets.value.filter((w) => w.instanceId !== instanceId)
    toast.add({ title: 'Widget removed', color: 'neutral' })
  }

  function openRenameWidget(widget: any) {
    renameWidgetInstanceId.value = widget.instanceId
    renameWidgetName.value = widget.name || 'Untitled Widget'
    isRenameWidgetModalOpen.value = true
  }

  function saveWidgetRename() {
    if (!renameWidgetInstanceId.value || !renameWidgetName.value.trim()) return

    dashboardWidgets.value = dashboardWidgets.value.map((widget) =>
      widget.instanceId === renameWidgetInstanceId.value
        ? {
            ...widget,
            name: renameWidgetName.value.trim()
          }
        : widget
    )

    isRenameWidgetModalOpen.value = false
    toast.add({ title: 'Widget renamed', color: 'success' })
  }

  function openRenameDashboard(dashboardId: string) {
    const dashboard = (dashboards.value || []).find((entry: any) => entry.id === dashboardId)
    if (!dashboard) return
    renameDashboardId.value = dashboardId
    renameDashboardName.value = dashboard.name || 'Untitled Dashboard'
    isRenameDashboardModalOpen.value = true
  }

  async function saveDashboardRename() {
    if (!renameDashboardId.value || !renameDashboardName.value.trim()) return

    const dashboard = (dashboards.value || []).find(
      (entry: any) => entry.id === renameDashboardId.value
    )
    if (!dashboard) return

    try {
      await $fetch('/api/analytics/dashboards', {
        method: 'POST',
        body: {
          id: dashboard.id,
          name: renameDashboardName.value.trim(),
          layout: dashboard.layout || [],
          scope: (dashboard as any).scope || { target: 'self' },
          dateRange: (dashboard as any).dateRange || null
        }
      })
      await refreshDashboards()
      isRenameDashboardModalOpen.value = false
      toast.add({ title: 'Dashboard renamed', color: 'success' })
    } catch (error) {
      console.error(error)
      toast.add({ title: 'Failed to rename dashboard', color: 'error' })
    }
  }

  function editWidget(widget: any) {
    if (widget.comparison?.type === 'workouts') {
      router.push({
        path: '/analytics/workout-comparison',
        query: {
          preset: widget.comparisonPresetId || undefined,
          mode: widget.comparison.mode || 'summary',
          ids: Array.isArray(widget.comparison.workoutIds)
            ? widget.comparison.workoutIds.join(',')
            : undefined
        }
      })
      return
    }

    if (widget.id) {
      router.push(`/analytics/builder?id=${widget.id}`)
    } else {
      toast.add({ title: 'System presets cannot be edited', color: 'warning' })
    }
  }

  function resolveWidgetScope(widget: any) {
    if (widget.scopeMode === 'override' && widget.scope) {
      return widget.scope
    }

    return activeScope.value
  }

  function normalizeScope(scope: any) {
    if (!scope || scope.target === 'self') {
      return { target: 'self' }
    }

    if (scope.target === 'athlete') {
      return {
        target: 'athlete',
        targetId: scope.targetId
      }
    }

    if (scope.target === 'athletes') {
      return {
        target: 'athletes',
        targetIds: Array.isArray(scope.targetIds) ? [...scope.targetIds] : []
      }
    }

    return {
      target: scope.target,
      targetId: scope.targetId
    }
  }

  function normalizeDateRange(range: any) {
    if (!range) return null

    if (range.type === 'fixed') {
      return {
        type: 'fixed',
        startDate: range.startDate,
        endDate: range.endDate
      }
    }

    if (range.type === 'ytd') {
      return { type: 'ytd' }
    }

    return {
      type: 'rolling',
      value: range.value || '90d'
    }
  }

  function isValidTimeRange(range: any) {
    if (!range || typeof range !== 'object') return false
    if (range.type === 'rolling' && range.value) return true
    if (range.type === 'ytd') return true
    if (range.type === 'fixed' && range.startDate && range.endDate) return true
    return false
  }

  function resolveActiveDateRange() {
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

    return {
      type: 'rolling',
      value: selectedRangeKey.value
    }
  }

  const dateRangeLabel = computed(() => {
    if (selectedRangeKey.value === 'custom' && customStartDate.value && customEndDate.value) {
      return `${customStartDate.value} - ${customEndDate.value}`
    }

    return selectedRangeKey.value.toUpperCase()
  })

  const expandedWidget = computed(
    () =>
      dashboardWidgets.value.find(
        (widget) => widget.instanceId === expandedWidgetInstanceId.value
      ) || null
  )

  function pinCurrentScopeToWidget(instanceId: string) {
    dashboardWidgets.value = dashboardWidgets.value.map((widget) =>
      widget.instanceId === instanceId
        ? {
            ...widget,
            scopeMode: 'override',
            scope: normalizeScope(activeScope.value)
          }
        : widget
    )
    toast.add({ title: 'Widget now uses its own scope', color: 'success' })
  }

  function resetWidgetScope(instanceId: string) {
    dashboardWidgets.value = dashboardWidgets.value.map((widget) =>
      widget.instanceId === instanceId
        ? {
            ...widget,
            scopeMode: 'inherit'
          }
        : widget
    )
    toast.add({ title: 'Widget now follows the tab scope', color: 'neutral' })
  }

  function widgetMenuItems(widget: any) {
    return [
      {
        label: 'Rename',
        icon: 'i-lucide-pencil-line',
        onSelect: () => openRenameWidget(widget)
      },
      {
        label: 'Edit',
        icon: 'i-lucide-edit',
        onSelect: () => editWidget(widget)
      },
      widget.scopeMode === 'override'
        ? {
            label: 'Use Tab Scope',
            icon: 'i-lucide-layers-3',
            onSelect: () => resetWidgetScope(widget.instanceId)
          }
        : {
            label: 'Pin Current Scope',
            icon: 'i-lucide-pin',
            onSelect: () => pinCurrentScopeToWidget(widget.instanceId)
          },
      {
        label: 'Remove',
        icon: 'i-lucide-trash',
        color: 'error' as const,
        onSelect: () => removeWidget(widget.instanceId)
      }
    ]
  }

  function tabMenuItems(dashboardId: string) {
    return [
      {
        label: 'Rename Tab',
        icon: 'i-lucide-pencil-line',
        onSelect: () => openRenameDashboard(dashboardId)
      }
    ]
  }

  function resolveWidgetTimeRange(widget: any) {
    if (widget.timeRangeMode === 'override' && isValidTimeRange(widget.timeRange)) {
      return widget.timeRange
    }

    if (isValidTimeRange(activeDateRange.value)) {
      return activeDateRange.value
    }

    if (isValidTimeRange(widget.timeRange)) {
      return widget.timeRange
    }

    return { type: 'rolling', value: '90d' }
  }

  function openExpandedWidget(widget: any) {
    expandedWidgetInstanceId.value = widget.instanceId
    isExpandedWidgetOpen.value = true
  }

  function applyQuickRange(range: '30d' | '90d' | '180d' | 'ytd') {
    selectedRangeKey.value = range
    activeDateRange.value = resolveActiveDateRange()
    analyticsLog('applyQuickRange', {
      selectedRangeKey: selectedRangeKey.value,
      activeDateRange: activeDateRange.value
    })
  }

  function activateCustomRange() {
    const now = new Date()
    const start = new Date()
    start.setDate(now.getDate() - 89)
    customStartDate.value ||= start.toISOString().slice(0, 10)
    customEndDate.value ||= now.toISOString().slice(0, 10)
    selectedRangeKey.value = 'custom'
    activeDateRange.value = resolveActiveDateRange()
    analyticsLog('activateCustomRange', {
      customStartDate: customStartDate.value,
      customEndDate: customEndDate.value,
      activeDateRange: activeDateRange.value
    })
  }

  function applyCustomRange() {
    activeDateRange.value = resolveActiveDateRange()
    datePickerOpen.value = false
    analyticsLog('applyCustomRange', {
      customStartDate: customStartDate.value,
      customEndDate: customEndDate.value,
      activeDateRange: activeDateRange.value
    })
  }

  function closeOverlaysForNavigation() {
    analyticsLog('closeOverlaysForNavigation', route.fullPath)
    datePickerOpen.value = false
    isNewDashboardModalOpen.value = false
    isRenameDashboardModalOpen.value = false
    isRenameWidgetModalOpen.value = false
    isFieldManagerOpen.value = false
    isWidgetLibraryOpen.value = false
    isExpandedWidgetOpen.value = false
  }

  onBeforeRouteLeave(() => {
    closeOverlaysForNavigation()
  })

  onBeforeUnmount(() => {
    closeOverlaysForNavigation()
  })
</script>

<template>
  <UDashboardPanel id="analytics-hub">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #title>
          <CoachingNavbarLinks />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <ClientOnly>
              <DashboardTriggerMonitorButton />
            </ClientOnly>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-0 sm:p-6 space-y-8">
        <!-- Dashboard Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 sm:px-0">
          <div>
            <h1 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Performance Intelligence
            </h1>
            <p
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic"
            >
              {{ activeDashboard?.name || 'Custom Insights & Multi-Athlete Analytics' }}
            </p>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <AnalyticsScopeSelector v-model="activeScope" class="w-full md:w-auto" />

            <UPopover v-model:open="datePickerOpen">
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-calendar-range"
                size="sm"
                class="font-bold"
              >
                <span class="hidden md:inline">{{ dateRangeLabel }}</span>
              </UButton>

              <template #content>
                <div class="w-[320px] space-y-4 p-3">
                  <div class="space-y-1">
                    <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                      Tab Date Range
                    </div>
                    <p class="text-xs text-muted">
                      Widgets inherit this range unless they were pinned with their own explicit
                      date range.
                    </p>
                  </div>

                  <div class="flex flex-wrap gap-2">
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

                  <div class="flex justify-end border-t border-default pt-3">
                    <UButton size="xs" color="primary" variant="soft" @click="applyCustomRange">
                      Apply
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>

            <div
              v-if="saving"
              class="flex items-center gap-1.5 rounded-full border border-default bg-default px-3 py-2"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="h-3.5 w-3.5 animate-spin text-neutral-400"
              />
              <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-400"
                >Saving...</span
              >
            </div>
          </div>
        </div>

        <div
          class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-2"
        >
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <draggable
              v-model="localTabs"
              item-key="id"
              direction="horizontal"
              class="flex items-center gap-1"
              @change="onTabReorder"
            >
              <template #item="{ element, index }">
                <div class="group flex items-center gap-1">
                  <UButton
                    :color="activeTab === index ? 'primary' : 'neutral'"
                    :variant="activeTab === index ? 'soft' : 'ghost'"
                    size="sm"
                    class="font-bold shrink-0 transition-all duration-200"
                    :class="activeTab === index ? 'px-4' : 'px-3 opacity-60 hover:opacity-100'"
                    @click="activeTab = index"
                  >
                    <template #leading>
                      <UIcon :name="element.icon" class="w-4 h-4" />
                    </template>
                    {{ element.label }}
                  </UButton>
                  <UDropdownMenu :items="tabMenuItems(element.id)">
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-more-vertical"
                      size="xs"
                      class="shrink-0 opacity-0 transition group-hover:opacity-100"
                      @click.stop
                    />
                  </UDropdownMenu>
                </div>
              </template>
            </draggable>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-plus"
              size="sm"
              class="font-bold shrink-0 opacity-50 hover:opacity-100"
              @click="isNewDashboardModalOpen = true"
            />
          </div>

          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-settings"
              label="Manage Metrics"
              size="sm"
              class="font-bold hidden sm:flex"
              @click="isFieldManagerOpen = true"
            />

            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-plus"
              label="Add Widget"
              size="sm"
              class="font-bold"
              @click="isWidgetLibraryOpen = true"
            />

            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-monitor-play"
              label="Chart Explorer"
              size="sm"
              class="font-bold"
              to="/analytics/browse"
            />

            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-activity"
              label="Workout Explorer"
              size="sm"
              class="font-bold"
              to="/analytics/workout-explorer"
            />

            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-git-compare-arrows"
              label="Workout Compare"
              size="sm"
              class="font-bold"
              to="/analytics/workout-comparison"
            />

            <UButton
              color="primary"
              variant="solid"
              icon="i-lucide-gavel"
              label="Chart Builder"
              size="sm"
              class="font-bold"
              to="/analytics/builder"
            />
          </div>
        </div>

        <div v-if="tabs[activeTab]?.slot === 'dashboard'">
          <!-- Dashboard Grid -->
          <div v-if="loadingDashboards" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <USkeleton v-for="i in 2" :key="i" class="h-[400px] rounded-2xl" />
          </div>

          <div v-else-if="dashboardWidgets.length > 0">
            <draggable
              v-model="dashboardWidgets"
              item-key="instanceId"
              class="grid grid-cols-1 lg:grid-cols-2 gap-6"
              handle=".drag-handle"
            >
              <template #item="{ element }">
                <UCard :ui="{ body: 'p-0 sm:p-0 overflow-hidden' }" class="relative group">
                  <template #header>
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 drag-handle cursor-move">
                        <UIcon name="i-lucide-grip-vertical" class="w-4 h-4 text-neutral-400" />
                        <h3
                          class="text-xs font-black uppercase tracking-widest text-neutral-500 truncate max-w-[200px]"
                        >
                          {{ element.name }}
                        </h3>
                        <UBadge
                          v-if="element.scopeMode === 'override'"
                          color="primary"
                          variant="soft"
                          size="xs"
                        >
                          Scoped
                        </UBadge>
                      </div>
                      <div class="flex items-center gap-1">
                        <UButton
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-maximize-2"
                          size="xs"
                          @click="openExpandedWidget(element)"
                        />
                        <UDropdownMenu :items="widgetMenuItems(element)">
                          <UButton
                            color="neutral"
                            variant="ghost"
                            icon="i-lucide-more-vertical"
                            size="xs"
                          />
                        </UDropdownMenu>
                      </div>
                    </div>
                  </template>

                  <div class="h-[300px]">
                    <AnalyticsBaseWidget
                      :config="{
                        ...element,
                        scope: resolveWidgetScope(element),
                        timeRange: resolveWidgetTimeRange(element)
                      }"
                    />
                  </div>
                </UCard>
              </template>
            </draggable>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="py-24 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl"
          >
            <div class="bg-neutral-100 dark:bg-neutral-800 p-6 rounded-full inline-block mb-4">
              <UIcon name="i-lucide-bar-chart-3" class="w-12 h-12 text-neutral-400" />
            </div>
            <h3 class="text-xl font-bold uppercase tracking-tight">Your Dashboard is Empty</h3>
            <p class="text-neutral-500 max-w-sm mx-auto mb-6 italic text-sm">
              Start by adding a system chart or build your own custom visualization.
            </p>
            <div class="flex items-center justify-center gap-3">
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                label="Add System Chart"
                icon="i-lucide-plus"
                @click="isWidgetLibraryOpen = true"
              />
              <UButton
                color="primary"
                variant="solid"
                size="lg"
                label="Create Custom Chart"
                icon="i-lucide-gavel"
                to="/analytics/builder"
              />
            </div>
          </div>
        </div>

        <div
          v-else-if="!loadingDashboards && !tabs.length"
          class="py-24 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl"
        >
          <div class="bg-neutral-100 dark:bg-neutral-800 p-8 rounded-full inline-block mb-6">
            <UIcon name="i-lucide-layout" class="w-16 h-16 text-neutral-400" />
          </div>
          <h2 class="text-3xl font-black uppercase tracking-tight mb-2">No Dashboards Yet</h2>
          <p class="text-neutral-500 max-w-md mx-auto mb-8 italic">
            Dashboards allow you to organize your performance insights. Create your first one to get
            started.
          </p>
          <UButton
            color="primary"
            variant="solid"
            size="xl"
            icon="i-lucide-plus"
            label="Create First Dashboard"
            class="font-black uppercase tracking-widest px-8"
            @click="isNewDashboardModalOpen = true"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create Dashboard Modal -->
  <UModal
    v-model:open="isNewDashboardModalOpen"
    title="New Dashboard"
    description="Give your dashboard a name to get started."
  >
    <template #body>
      <UFormField label="Dashboard Name" help="e.g., Seasonal Peaks, Recovery Hub, Team Overview">
        <UInput
          v-model="newDashboardName"
          placeholder="Enter name..."
          class="w-full"
          autofocus
          @keyup.enter="createDashboard"
        />
      </UFormField>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        @click="isNewDashboardModalOpen = false"
      />
      <UButton
        label="Create Dashboard"
        color="primary"
        variant="solid"
        :loading="creatingDashboard"
        @click="createDashboard"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="isRenameDashboardModalOpen"
    title="Rename Tab"
    description="Update the name of this dashboard tab."
  >
    <template #body>
      <UFormField label="Tab Name">
        <UInput
          v-model="renameDashboardName"
          placeholder="Enter tab name..."
          class="w-full"
          autofocus
          @keyup.enter="saveDashboardRename"
        />
      </UFormField>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        @click="isRenameDashboardModalOpen = false"
      />
      <UButton label="Save" color="primary" variant="solid" @click="saveDashboardRename" />
    </template>
  </UModal>

  <UModal
    v-model:open="isRenameWidgetModalOpen"
    title="Rename Widget"
    description="Give this chart a clearer title on the dashboard."
  >
    <template #body>
      <UFormField label="Widget Name">
        <UInput
          v-model="renameWidgetName"
          placeholder="Enter widget name..."
          class="w-full"
          autofocus
          @keyup.enter="saveWidgetRename"
        />
      </UFormField>
    </template>
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        @click="isRenameWidgetModalOpen = false"
      />
      <UButton label="Save" color="primary" variant="solid" @click="saveWidgetRename" />
    </template>
  </UModal>

  <!-- Custom Field Manager Modal -->
  <UModal
    v-model:open="isFieldManagerOpen"
    title="Metric Definitions"
    description="Manage the custom metrics you track alongside system data."
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <AnalyticsFieldManager />
    </template>
    <template #footer>
      <UButton label="Close" color="neutral" variant="ghost" @click="isFieldManagerOpen = false" />
    </template>
  </UModal>

  <!-- Widget Library Modal -->
  <UModal
    v-model:open="isWidgetLibraryOpen"
    title="Widget Library"
    description="Choose a pre-configured system chart or one of your custom visualizations."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Explorer Shortcut -->
        <UButton
          color="primary"
          variant="subtle"
          class="flex items-start justify-start p-4 gap-4 text-left h-auto w-full group border-2 border-primary-500/20"
          to="/analytics/browse"
          @click="isWidgetLibraryOpen = false"
        >
          <div class="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-lucide-monitor-play" class="w-5 h-5 text-primary-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-900 dark:text-white transition-colors truncate">
              Go to Chart Explorer
            </p>
            <p class="text-[10px] text-neutral-500 font-medium">
              Browse, preview, and configure performance charts before pinning.
            </p>
          </div>
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-primary-400 self-center" />
        </UButton>

        <UButton
          color="neutral"
          variant="subtle"
          class="flex items-start justify-start p-4 gap-4 text-left h-auto w-full group border-2 border-default/60"
          to="/analytics/workout-explorer"
          @click="isWidgetLibraryOpen = false"
        >
          <div class="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <UIcon
              name="i-lucide-activity"
              class="w-5 h-5 text-neutral-600 dark:text-neutral-300"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-gray-900 dark:text-white transition-colors truncate">
              Open Workout Explorer
            </p>
            <p class="text-[10px] text-neutral-500 font-medium">
              Analyze a single workout with summary, stream, and interval views.
            </p>
          </div>
          <UIcon name="i-lucide-arrow-right" class="w-4 h-4 text-neutral-400 self-center" />
        </UButton>

        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <UInput
              v-model="widgetSearch"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search charts..."
              size="sm"
              class="flex-1"
            />
          </div>

          <div class="flex flex-wrap gap-1.5">
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
            <UButton
              size="xs"
              :color="activeCategory === 'custom' ? 'primary' : 'neutral'"
              :variant="activeCategory === 'custom' ? 'soft' : 'outline'"
              class="rounded-full"
              @click="activeCategory = 'custom'"
            >
              My Visuals
            </UButton>
          </div>
        </div>

        <div class="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
          <!-- Custom Widgets Section -->
          <div v-if="filteredCustomWidgets?.length" class="space-y-2">
            <h4
              class="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic text-primary-500"
            >
              My Visualizations
            </h4>
            <div class="grid grid-cols-1 gap-3">
              <UButton
                v-for="widget in filteredCustomWidgets"
                :key="widget.id"
                color="neutral"
                variant="subtle"
                class="flex items-start justify-start p-4 gap-4 text-left h-auto w-full group"
                @click="addWidget({ ...widget.config, name: widget.name, id: widget.id })"
              >
                <div class="p-2 bg-white dark:bg-neutral-800 rounded-lg">
                  <UIcon name="i-lucide-gavel" class="w-5 h-5 text-primary-500" />
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors truncate"
                  >
                    {{ widget.name }}
                  </p>
                  <p class="text-[10px] text-neutral-500 font-medium uppercase tracking-tighter">
                    {{ widget.config.source }} • {{ widget.config.grouping }}
                  </p>
                </div>
                <UIcon name="i-lucide-plus" class="w-4 h-4 text-neutral-400 self-center" />
              </UButton>
            </div>
          </div>

          <div v-if="filteredSystemWidgets?.length" class="space-y-2">
            <h4 class="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic">
              System Presets
            </h4>
            <div class="grid grid-cols-1 gap-3">
              <UButton
                v-for="preset in filteredSystemWidgets"
                :key="preset.id"
                color="neutral"
                variant="subtle"
                class="flex items-start justify-start p-4 gap-4 text-left h-auto w-full group"
                @click="addWidget(preset)"
              >
                <div class="p-2 bg-white dark:bg-neutral-800 rounded-lg">
                  <UIcon
                    :name="
                      preset.visualType === 'line' ? 'i-lucide-line-chart' : 'i-lucide-bar-chart'
                    "
                    class="w-5 h-5 text-primary-500"
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors truncate"
                  >
                    {{ preset.name }}
                  </p>
                  <p class="text-[10px] text-neutral-500 font-normal line-clamp-1">
                    {{ preset.description }}
                  </p>
                </div>
                <UIcon name="i-lucide-plus" class="w-4 h-4 text-neutral-400 self-center" />
              </UButton>
            </div>
          </div>

          <div
            v-if="!filteredCustomWidgets?.length && !filteredSystemWidgets?.length"
            class="py-12 text-center border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-2xl"
          >
            <p class="text-sm text-neutral-400">No charts match your filters.</p>
            <UButton
              color="neutral"
              variant="link"
              label="Clear filters"
              size="xs"
              @click="
                () => {
                  widgetSearch = ''
                  activeCategory = 'all'
                }
              "
            />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton label="Close" color="neutral" variant="ghost" @click="isWidgetLibraryOpen = false" />
    </template>
  </UModal>

  <UModal
    v-model:open="isExpandedWidgetOpen"
    :title="expandedWidget?.name || 'Expanded Chart'"
    :description="expandedWidget?.description || 'Detailed widget preview.'"
    :ui="{ content: 'sm:max-w-5xl' }"
  >
    <template #body>
      <div v-if="expandedWidget" class="h-[70vh] min-h-[520px]">
        <AnalyticsBaseWidget
          :config="{
            ...expandedWidget,
            scope: resolveWidgetScope(expandedWidget),
            timeRange: resolveWidgetTimeRange(expandedWidget)
          }"
        />
      </div>
    </template>
    <template #footer>
      <UButton
        label="Close"
        color="neutral"
        variant="ghost"
        @click="isExpandedWidgetOpen = false"
      />
    </template>
  </UModal>
</template>
