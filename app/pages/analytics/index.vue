<script setup lang="ts">
  import { ANALYTICS_SYSTEM_PRESETS } from '~/utils/analytics-presets'
  import draggable from 'vuedraggable'

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

  const activeTab = ref(0)
  const isWidgetLibraryOpen = ref(false)
  const isFieldManagerOpen = ref(false)
  const isNewDashboardModalOpen = ref(false)
  const newDashboardName = ref('')
  const toast = useToast()

  // Data fetching
  const { data: dashboards, refresh: refreshDashboards, pending: loadingDashboards } = await useFetch('/api/analytics/dashboards')
  const { data: customWidgets, refresh: refreshWidgets } = await useFetch('/api/analytics/widgets')

  const activeDashboardId = ref<string | null>(null)
  const activeDashboard = computed(() => {
    const availableDashboards = dashboards.value || []
    if (activeDashboardId.value) {
      return availableDashboards.find((dashboard: any) => dashboard.id === activeDashboardId.value) || null
    }
    return availableDashboards[0] || null
  })
  const dashboardWidgets = ref<any[]>([])
  const activeScope = ref({ target: 'self' })

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
  watch(tabs, (newTabs) => {
    localTabs.value = [...newTabs]
  }, { immediate: true })

  async function onTabReorder() {
    try {
      // Find the currently active tab ID before reordering
      const currentActiveId = activeDashboardId.value
      
      await $fetch('/api/analytics/dashboards/reorder', {
        method: 'POST',
        body: { ids: localTabs.value.map(t => t.id) }
      })
      
      await refreshDashboards()

      // Restore activeTab index based on the new order of the ID
      if (currentActiveId) {
        const newIndex = localTabs.value.findIndex(t => t.id === currentActiveId)
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
  watch(activeDashboardId, (newId) => {
    if (newId) {
      const index = tabs.value.findIndex(t => t.id === newId)
      if (index !== -1 && index !== activeTab.value) {
        activeTab.value = index
      }
    }
  }, { immediate: true })

  watch(
    dashboards,
    (nextDashboards) => {
      if (!activeDashboardId.value && nextDashboards?.length) {
        activeDashboardId.value = nextDashboards[0].id
      }
    },
    { immediate: true }
  )

  // Load widgets from active dashboard layout (ONLY on initial load or ID change)
  watch(() => activeDashboard.value?.id, (newId, oldId) => {
    if (newId && activeDashboard.value?.layout) {
      dashboardWidgets.value = (activeDashboard.value.layout as any[]).map(w => ({
        ...w,
        instanceId: w.instanceId || crypto.randomUUID()
      }))
    } else if (newId) {
      dashboardWidgets.value = []
    }
  }, { immediate: true })

  const saving = ref(false)
  async function saveDashboard() {
    if (saving.value) return // Prevent concurrent saves
    saving.value = true
    try {
      const dashboard = await $fetch('/api/analytics/dashboards', {
        method: 'POST',
        body: {
          id: activeDashboardId.value || undefined,
          name: activeDashboard.value?.name || 'Main Dashboard',
          layout: dashboardWidgets.value
        }
      })
      activeDashboardId.value = (dashboard as any).id
      await refreshDashboards()
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
          layout: []
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

  // Auto-save layout changes
  watch(dashboardWidgets, () => {
    if (!loadingDashboards.value && activeDashboardId.value) {
      saveDashboard()
    }
  }, { deep: true })

  function addWidget(widget: any) {
    const newWidget = {
      ...widget,
      instanceId: crypto.randomUUID()
    }
    dashboardWidgets.value.push(newWidget)
    isWidgetLibraryOpen.value = false
    toast.add({ title: 'Widget added to dashboard', color: 'success' })
  }

  function removeWidget(instanceId: string) {
    dashboardWidgets.value = dashboardWidgets.value.filter(w => w.instanceId !== instanceId)
    toast.add({ title: 'Widget removed', color: 'neutral' })
  }

  function editWidget(widget: any) {
    if (widget.id) {
      router.push(`/analytics/builder?id=${widget.id}`)
    } else {
      toast.add({ title: 'System presets cannot be edited', color: 'warning' })
    }
  }
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
            
            <AnalyticsScopeSelector v-model="activeScope" />

            <div v-if="saving" class="flex items-center gap-1.5 mr-2">
              <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin text-neutral-400" />
              <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Saving...</span>
            </div>
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
            <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em] mt-1 italic">
              {{ activeDashboard?.name || 'Custom Insights & Multi-Athlete Analytics' }}
            </p>
          </div>
        </div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-2">
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <draggable 
              v-model="localTabs" 
              item-key="id"
              direction="horizontal"
              class="flex items-center gap-1"
              @change="onTabReorder"
            >
              <template #item="{ element, index }">
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
                        <h3 class="text-xs font-black uppercase tracking-widest text-neutral-500 truncate max-w-[200px]">
                          {{ element.name }}
                        </h3>
                      </div>
                      <div class="flex items-center gap-1">
                        <UButton
                          color="neutral"
                          variant="ghost"
                          icon="i-lucide-maximize-2"
                          size="xs"
                        />
                        <UDropdownMenu :items="[
                          { label: 'Edit', icon: 'i-lucide-edit', onSelect: () => editWidget(element) },
                          { label: 'Remove', icon: 'i-lucide-trash', color: 'error', onSelect: () => removeWidget(element.instanceId) }
                        ]">
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
                    <AnalyticsBaseWidget :config="{ ...element, scope: activeScope }" />
                  </div>
                </UCard>
              </template>
            </draggable>
          </div>

          <!-- Empty State -->
          <div v-else class="py-24 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
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

        <div v-else-if="!loadingDashboards && !tabs.length" class="py-24 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
          <div class="bg-neutral-100 dark:bg-neutral-800 p-8 rounded-full inline-block mb-6">
            <UIcon name="i-lucide-layout" class="w-16 h-16 text-neutral-400" />
          </div>
          <h2 class="text-3xl font-black uppercase tracking-tight mb-2">No Dashboards Yet</h2>
          <p class="text-neutral-500 max-w-md mx-auto mb-8 italic">
            Dashboards allow you to organize your performance insights. Create your first one to get started.
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
        <UInput v-model="newDashboardName" placeholder="Enter name..." class="w-full" autofocus @keyup.enter="createDashboard" />
      </UFormField>
    </template>
    <template #footer>
      <UButton label="Cancel" color="neutral" variant="ghost" @click="isNewDashboardModalOpen = false" />
      <UButton label="Create Dashboard" color="primary" variant="solid" :loading="creatingDashboard" @click="createDashboard" />
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
  >
    <template #body>
      <div class="space-y-8">
        <!-- Custom Widgets Section -->
        <div v-if="customWidgets?.length" class="space-y-2">
          <h4 class="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic text-primary-500">My Visualizations</h4>
          <div class="grid grid-cols-1 gap-3">
            <UButton
              v-for="widget in customWidgets"
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
                <p class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">
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

        <div class="space-y-2">
          <h4 class="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic">System Presets</h4>
          <div class="grid grid-cols-1 gap-3">
            <UButton
              v-for="preset in ANALYTICS_SYSTEM_PRESETS"
              :key="preset.id"
              color="neutral"
              variant="subtle"
              class="flex items-start justify-start p-4 gap-4 text-left h-auto w-full group"
              @click="addWidget(preset)"
            >
              <div class="p-2 bg-white dark:bg-neutral-800 rounded-lg">
                <UIcon :name="preset.type === 'line' ? 'i-lucide-line-chart' : 'i-lucide-bar-chart'" class="w-5 h-5 text-primary-500" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">{{ preset.name }}</p>
                <p class="text-[10px] text-neutral-500 font-normal line-clamp-1">{{ preset.description }}</p>
              </div>
              <UIcon name="i-lucide-plus" class="w-4 h-4 text-neutral-400 self-center" />
            </UButton>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <UButton label="Close" color="neutral" variant="ghost" @click="isWidgetLibraryOpen = false" />
    </template>
  </UModal>
</template>
