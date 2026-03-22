<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Chart Builder | Analytics',
    meta: [
      {
        name: 'description',
        content: 'Create custom performance visualizations.'
      }
    ]
  })

  const router = useRouter()
  const route = useRoute()
  const toast = useToast()
  const widgetId = computed(() => (typeof route.query.id === 'string' ? route.query.id : null))
  const loadingWidget = ref(false)

  const state = ref({
    name: '',
    source: 'workouts',
    type: 'line',
    timeRange: { type: 'rolling', value: '90d' },
    grouping: 'weekly',
    metrics: [] as any[],
    scope: { target: 'self' }
  })

  const { data: fieldsData, pending: loadingFields } = await useFetch('/api/analytics/fields')

  const sourceOptions = [
    { label: 'Workouts', value: 'workouts' },
    { label: 'Wellness', value: 'wellness' }
  ]

  const typeOptions = [
    { label: 'Line Chart', value: 'line', icon: 'i-lucide-line-chart' },
    { label: 'Bar Chart', value: 'bar', icon: 'i-lucide-bar-chart' }
  ]

  const timeRangeOptions = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
    { label: 'Last 90 Days', value: '90d' },
    { label: 'Year to Date', value: 'ytd' }
  ]

  const groupingOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' }
  ]

  const aggregationOptions = [
    { label: 'Sum', value: 'sum' },
    { label: 'Average', value: 'avg' },
    { label: 'Maximum', value: 'max' },
    { label: 'Minimum', value: 'min' },
    { label: 'Count', value: 'count' }
  ]

  const availableFields = computed(() => {
    if (!fieldsData.value) return []
    return (fieldsData.value as any)[state.value.source] || []
  })

  function addMetric() {
    if (availableFields.value.length === 0) {
      toast.add({ title: 'No chartable fields available for this source yet', color: 'warning' })
      return
    }

    state.value.metrics.push({
      field: availableFields.value[0]?.key || '',
      aggregation: 'avg'
    })
  }

  function removeMetric(index: number) {
    state.value.metrics.splice(index, 1)
  }

  // Live preview config
  const previewConfig = computed(() => {
    return {
      ...state.value,
      timeRange: {
        type: state.value.timeRange.value === 'ytd' ? 'ytd' : 'rolling',
        value: state.value.timeRange.value
      }
    }
  })

  const saving = ref(false)

  watch(
    () => state.value.source,
    (source) => {
      const validFields = new Set(((fieldsData.value as any)?.[source] || []).map((field: any) => field.key))
      state.value.metrics = state.value.metrics.filter((metric) => validFields.has(metric.field))
    }
  )

  async function loadWidget() {
    if (!widgetId.value) return

    loadingWidget.value = true
    try {
      const widget = await $fetch(`/api/analytics/widgets/${widgetId.value}`)
      const config = (widget as any).config || {}

      state.value = {
        name: (widget as any).name || '',
        source: config.source || 'workouts',
        type: config.type || 'line',
        timeRange: config.timeRange || { type: 'rolling', value: '90d' },
        grouping: config.grouping || 'weekly',
        metrics: Array.isArray(config.metrics) ? [...config.metrics] : [],
        scope: config.scope || { target: 'self' }
      }
    } catch (e: any) {
      toast.add({
        title: 'Failed to load visualization',
        description: e.data?.statusMessage,
        color: 'error'
      })
      await router.replace('/analytics')
    } finally {
      loadingWidget.value = false
    }
  }

  await loadWidget()

  async function saveChart() {
    if (!state.value.name) {
      toast.add({ title: 'Please enter a name for your chart', color: 'error' })
      return
    }
    if (state.value.metrics.length === 0) {
      toast.add({ title: 'Please add at least one metric', color: 'error' })
      return
    }

    saving.value = true
    try {
      await $fetch('/api/analytics/widgets', {
        method: 'POST',
        body: {
          id: widgetId.value || undefined,
          name: state.value.name,
          config: state.value
        }
      })
      toast.add({
        title: widgetId.value ? 'Visualization updated' : 'Visualization saved to library',
        color: 'success'
      })
      router.push('/analytics')
    } catch (e) {
      toast.add({ title: 'Failed to save chart', color: 'error' })
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <UDashboardPanel id="analytics-builder">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <div class="flex items-center gap-1">
            <UDashboardSidebarCollapse />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-arrow-left"
              @click="router.back()"
            />
          </div>
        </template>
        <template #title>
          <CoachingNavbarLinks />
        </template>
        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="outline"
              label="Cancel"
              size="sm"
              @click="router.back()"
            />
            <UButton
              color="primary"
              variant="solid"
              :label="widgetId ? 'Update Visualization' : 'Save to Library'"
              icon="i-lucide-save"
              size="sm"
              class="font-bold"
              :loading="saving"
              @click="saveChart"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full overflow-hidden">
        <!-- Left Pane: Controls -->
        <div class="w-full md:w-1/3 lg:w-1/4 h-full overflow-y-auto border-r border-gray-100 dark:border-gray-800 p-6 space-y-8 bg-neutral-50/30 dark:bg-neutral-900/10">
          <div class="space-y-6">
            <div class="space-y-4">
              <h3 class="text-[10px] font-black uppercase tracking-widest text-neutral-400 italic">Data Scope</h3>
              <p class="text-xs text-neutral-500 italic leading-relaxed">
                Select an athlete to use their data for building this chart. The visualization itself is not tied to the selected athlete and can be used across your entire roster.
              </p>
              <AnalyticsScopeSelector v-model="state.scope" class="w-full" />
            </div>

            <div class="border-t border-gray-100 dark:border-gray-800" />

            <div>
              <h3 class="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 italic">Core Definition</h3>
              <div class="space-y-4">
                <UFormField label="Visualization Name" help="Identify this chart in your library.">
                  <UInput v-model="state.name" placeholder="e.g., Weekly TSS Trend" class="w-full" />
                </UFormField>
                
                <UFormField label="Data Source" help="Select the primary data set.">
                  <USelect v-model="state.source" :items="sourceOptions" class="w-full" />
                </UFormField>

                <UFormField label="Chart Type" help="Choose how to visualize the data.">
                  <USelect v-model="state.type" :items="typeOptions" class="w-full" />
                </UFormField>
              </div>
            </div>

            <div class="border-t border-gray-100 dark:border-gray-800" />

            <div>
              <h3 class="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 italic">Time & Aggregation</h3>
              <div class="space-y-4">
                <UFormField label="Time Range" help="Rolling window of data.">
                  <USelect v-model="state.timeRange.value" :items="timeRangeOptions" class="w-full" />
                </UFormField>

                <UFormField label="Grouping" help="X-Axis interval.">
                  <USelect v-model="state.grouping" :items="groupingOptions" class="w-full" />
                </UFormField>
              </div>
            </div>

            <div class="border-t border-gray-100 dark:border-gray-800" />

            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-neutral-400 italic">Metrics (Y-Axes)</h3>
                <UButton color="primary" variant="soft" icon="i-lucide-plus" size="xs" label="Add Metric" @click="addMetric" />
              </div>
              
              <div v-if="state.metrics.length === 0" class="p-4 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl text-center">
                <span class="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">No metrics added yet.</span>
              </div>

              <div v-else class="space-y-3">
                <div 
                  v-for="(metric, index) in state.metrics" 
                  :key="index"
                  class="p-3 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-gray-800 rounded-xl space-y-3 relative group"
                >
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-lucide-x"
                    size="xs"
                    class="absolute -top-2 -right-2 hidden group-hover:flex shadow-sm bg-white dark:bg-gray-900 rounded-full"
                    @click="removeMetric(index)"
                  />
                  
                  <UFormField label="Field" size="xs">
                    <USelect v-model="metric.field" :items="availableFields" class="w-full" label-attribute="label" value-attribute="key" />
                  </UFormField>

                  <UFormField label="Aggregation" size="xs">
                    <USelect v-model="metric.aggregation" :items="aggregationOptions" class="w-full" />
                  </UFormField>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Pane: Live Preview -->
        <div class="flex-1 h-full p-8 bg-white dark:bg-gray-900 overflow-y-auto">
          <div class="max-w-5xl mx-auto h-full flex flex-col">
            <div class="mb-8 flex items-end justify-between">
              <div>
                <h2 class="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {{ state.name || 'Untitled Visualization' }}
                </h2>
                <div class="flex items-center gap-2 mt-1">
                  <UBadge color="neutral" variant="subtle" size="xs" class="font-black uppercase tracking-widest">
                    {{ state.source }}
                  </UBadge>
                  <UBadge color="primary" variant="subtle" size="xs" class="font-black uppercase tracking-widest">
                    {{ state.grouping }}
                  </UBadge>
                </div>
              </div>
              <p class="text-[10px] text-neutral-400 italic uppercase font-black tracking-widest mb-1">
                Live Preview
              </p>
            </div>

            <!-- Preview Chart -->
            <UCard class="flex-1 min-h-[400px] border-2 border-primary-500/10 shadow-xl overflow-hidden" :ui="{ body: 'p-0 h-full' }">
              <div v-if="loadingWidget" class="h-full flex items-center justify-center">
                <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
              </div>
              <div v-else-if="state.metrics.length === 0" class="h-full flex flex-col items-center justify-center text-center p-12">
                <div class="inline-flex p-4 bg-neutral-50 dark:bg-neutral-800 rounded-full mb-4">
                  <UIcon name="i-lucide-plus" class="w-8 h-8 text-neutral-300" />
                </div>
                <p class="text-sm font-bold text-neutral-500 uppercase tracking-tight">
                  Add a metric to generate the preview.
                </p>
              </div>
              <AnalyticsBaseWidget v-else :config="previewConfig" />
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
