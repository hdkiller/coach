<script setup lang="ts">
  import { ANALYTICS_SYSTEM_PRESETS } from '~/utils/analytics-presets'

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
  const toast = useToast()
  
  const athletes = ref<any[]>([])
  const loadingAthletes = ref(true)

  // Data Fetching
  const { data: customWidgets } = await useFetch('/api/analytics/widgets')
  const { data: dashboards, refresh: refreshDashboards } = await useFetch('/api/analytics/dashboards')

  // UI State
  const leftRailTab = ref<'roster' | 'library'>('roster')
  const athleteSearch = ref('')
  const widgetSearch = ref('')
  
  const selectedAthleteId = ref<string | null>(null)
  const selectedWidget = ref<any>(ANALYTICS_SYSTEM_PRESETS[0])

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
    return athletes.value.filter((rel) =>
      !search
      || rel.athlete.name.toLowerCase().includes(search)
      || rel.athlete.email.toLowerCase().includes(search)
    )
  })

  const allLibraryWidgets = computed(() => {
    const custom = (customWidgets.value as any[] || []).map(w => ({
      ...w.config,
      id: w.id,
      name: w.name,
      isCustom: true
    }))
    
    return [...ANALYTICS_SYSTEM_PRESETS, ...custom]
  })

  const filteredWidgets = computed(() => {
    const search = widgetSearch.value.toLowerCase()
    return allLibraryWidgets.value.filter(w => 
      w.name.toLowerCase().includes(search) || 
      w.source.toLowerCase().includes(search)
    )
  })

  const activeDashboard = computed(() => dashboards.value?.[0] || null)
  const selectedAthlete = computed(
    () => athletes.value.find((athlete) => athlete.athleteId === selectedAthleteId.value) || null
  )
  const selectedAudienceLabel = computed(() => selectedAthlete.value?.athlete?.name || 'Personal Data')

  const previewConfig = computed(() => {
    if (!selectedWidget.value) return null
    return {
      ...selectedWidget.value,
      scope: selectedAthleteId.value 
        ? { target: 'athlete', targetId: selectedAthleteId.value }
        : { target: 'self' }
    }
  })

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
            layout: []
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
        instanceId: crypto.randomUUID()
      })

      await $fetch('/api/analytics/dashboards', {
        method: 'POST',
        body: {
          id: dashboard.id,
          name: dashboard.name,
          layout
        }
      })
      await refreshDashboards()
      
      toast.add({ title: 'Widget pinned to dashboard!', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Failed to pin widget', color: 'error' })
    } finally {
      saving.value = false
    }
  }

  function editWidget() {
    if (selectedWidget.value?.isCustom) {
      router.push(`/analytics/builder?id=${selectedWidget.value.id}`)
    } else {
      toast.add({ title: 'System presets cannot be edited', color: 'warning' })
    }
  }
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
          <div class="flex items-center gap-2">
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
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full min-h-0 overflow-hidden">
        <!-- Sidebar -->
        <aside class="w-80 border-r border-default bg-default/80">
          <div class="p-3 space-y-3">
            <div class="inline-flex w-full items-center rounded-2xl border border-default bg-muted/20 p-1">
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

            <div v-if="leftRailTab === 'roster'" class="space-y-1">
              <div class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                Athlete roster
              </div>
              <UInput
                v-model="athleteSearch"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search athletes"
                size="sm"
              />
            </div>

            <div
              v-if="leftRailTab === 'roster'"
              class="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1"
            >
              <button
                class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
                :class="
                  selectedAthleteId === null
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-default/70 bg-default'
                "
                @click="selectedAthleteId = null"
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
                  selectedAthleteId === rel.athleteId
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-default/70 bg-default'
                "
                @click="selectedAthleteId = rel.athleteId"
              >
                <div class="flex items-center gap-3">
                  <UAvatar :src="rel.athlete.image" :alt="rel.athlete.name" size="md" />
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-bold text-highlighted">{{ rel.athlete.name }}</div>
                    <div class="text-xs text-muted">{{ rel.athlete.email }}</div>
                  </div>
                </div>
              </button>
            </div>

            <div v-if="leftRailTab === 'library'" class="space-y-1">
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

            <div
              v-if="leftRailTab === 'library'"
              class="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1"
            >
              <button
                v-for="widget in filteredWidgets"
                :key="widget.id || widget.name"
                class="w-full rounded-2xl border p-3 text-left transition hover:border-primary/50"
                :class="
                  selectedWidget?.id === widget.id || (!selectedWidget?.id && selectedWidget?.name === widget.name)
                    ? 'border-primary/60 bg-primary/5'
                    : 'border-default/70 bg-default'
                "
                @click="selectedWidget = widget"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-default/60 bg-muted/30">
                    <UIcon
                      :name="widget.type === 'line' ? 'i-lucide-line-chart' : 'i-lucide-bar-chart'"
                      class="w-4 h-4 text-primary-500"
                    />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-bold text-highlighted">{{ widget.name }}</div>
                    <div class="text-xs text-muted">
                      {{ widget.isCustom ? 'Custom visualization' : 'System preset' }}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </aside>

        <!-- Preview Area -->
        <main class="flex-1 bg-white dark:bg-gray-900 p-8 overflow-y-auto">
          <div v-if="selectedWidget" class="max-w-5xl mx-auto h-full flex flex-col">
            <div class="mb-12 flex items-start justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <h2 class="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    {{ selectedWidget.name }}
                  </h2>
                  <UBadge v-if="selectedWidget.isCustom" color="neutral" variant="subtle" size="xs">Custom</UBadge>
                </div>
                <p class="text-neutral-500 max-w-2xl">
                  {{ selectedWidget.description }}
                </p>
                <div class="flex items-center gap-4 mt-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-user" class="w-3.5 h-3.5" />
                    Viewing: <span class="text-primary-500">{{ selectedAudienceLabel }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-lucide-database" class="w-3.5 h-3.5" />
                    Source: <span class="text-neutral-600 dark:text-neutral-200">{{ selectedWidget.source }}</span>
                  </div>
                </div>
              </div>
            </div>

            <UCard class="flex-1 min-h-[500px] border-2 border-primary-500/10 shadow-2xl overflow-hidden bg-neutral-50/30 dark:bg-neutral-900/20" :ui="{ body: 'p-4 h-full' }">
              <AnalyticsBaseWidget :config="previewConfig" />
            </UCard>
          </div>

          <div v-else class="h-full flex items-center justify-center text-center">
            <div class="max-w-xs space-y-4">
              <UIcon name="i-lucide-bar-chart-3" class="w-16 h-16 text-neutral-200 mx-auto" />
              <p class="text-neutral-400 italic">Select a visualization from the library to begin previewing data.</p>
            </div>
          </div>
        </main>
      </div>
    </template>
  </UDashboardPanel>
</template>
