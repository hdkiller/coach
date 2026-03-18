<template>
  <div class="fixed inset-x-4 bottom-4 z-40">
    <div
      class="overflow-hidden rounded-3xl border border-default/80 bg-default/95 shadow-2xl backdrop-blur"
    >
      <button
        class="flex w-full items-center justify-between gap-3 border-b border-default/70 px-4 py-3 text-left"
        @click="$emit('toggle')"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <UIcon name="i-heroicons-rectangle-stack" class="h-4 w-4" />
          </div>
          <div>
            <div class="text-[10px] font-black uppercase tracking-[0.22em] text-primary/80">
              Workout Drawer
            </div>
            <div class="text-sm font-semibold text-highlighted">
              Drag templates into the weekly board
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs text-muted">{{ templates.length }} templates</span>
          <UIcon
            :name="open ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
            class="h-4 w-4 text-muted"
          />
        </div>
      </button>

      <div v-if="open" class="max-h-[420px] overflow-hidden flex flex-col">
        <div
          class="border-b border-default/70 px-4 py-3 flex flex-wrap items-center gap-3 bg-default/50 sticky top-0 z-10 backdrop-blur-sm"
        >
          <UInput
            v-model="localSearch"
            placeholder="Search workouts..."
            size="sm"
            icon="i-heroicons-magnifying-glass"
            class="flex-1 min-w-[180px]"
          />

          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <UTooltip text="All Types">
              <UButton
                size="xs"
                :color="selectedType === 'all' ? 'primary' : 'neutral'"
                :variant="selectedType === 'all' ? 'solid' : 'ghost'"
                icon="i-heroicons-squares-2x2"
                @click="selectedType = 'all'"
              />
            </UTooltip>
            <UTooltip v-for="type in workoutTypes" :key="type.value" :text="type.label">
              <UButton
                size="xs"
                :color="selectedType === type.value ? 'primary' : 'neutral'"
                :variant="selectedType === type.value ? 'solid' : 'ghost'"
                :icon="type.icon"
                @click="selectedType = type.value"
              />
            </UTooltip>
          </div>

          <div class="h-4 w-px bg-default/70 hidden sm:block" />

          <div class="flex items-center gap-1.5">
            <UButton
              v-for="range in durationRanges"
              :key="range.label"
              size="xs"
              :color="selectedDuration === range.value ? 'primary' : 'neutral'"
              :variant="selectedDuration === range.value ? 'solid' : 'ghost'"
              class="text-[10px] font-bold uppercase tracking-wider px-2"
              @click="selectedDuration = range.value"
            >
              {{ range.label }}
            </UButton>
          </div>
        </div>

        <div class="flex-1 max-h-[340px] overflow-y-auto px-4 py-4">
          <div v-if="loading" class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <USkeleton v-for="i in 6" :key="i" class="h-24 w-full rounded-2xl" />
          </div>

          <UAlert
            v-else-if="error"
            color="warning"
            variant="soft"
            title="Library unavailable"
            description="Workout templates failed to load."
          />

          <div
            v-else-if="filteredTemplates.length === 0"
            class="rounded-2xl border border-dashed border-default/80 px-4 py-8 text-center text-sm text-muted"
          >
            No matching workouts found.
          </div>

          <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              draggable="true"
              class="group/card relative cursor-grab rounded-2xl border border-default/80 bg-muted/10 p-4 transition hover:border-primary/40 hover:bg-muted/20 active:cursor-grabbing"
              @dragstart="onTemplateDragStart($event, template)"
              @click="previewTemplateId = template.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="line-clamp-2 text-sm font-semibold text-highlighted">
                    {{ template.title }}
                  </div>
                  <div class="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                    {{ template.type || 'Workout' }}
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <MiniWorkoutChart
                    v-if="template.structuredWorkout"
                    :workout="template"
                    class="h-8 w-12 opacity-75"
                  />
                  <UIcon
                    :name="getWorkoutIcon(template.type)"
                    class="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  />
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between gap-3 text-[11px] text-muted">
                <div class="flex items-center gap-3">
                  <span>{{ formatMinutes(Math.round((template.durationSec || 0) / 60)) }}</span>
                  <span>{{ Math.round(template.tss || 0) }} TSS</span>
                </div>

                <div
                  class="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity"
                >
                  <UButton
                    v-if="!template.structuredWorkout"
                    size="xs"
                    color="primary"
                    variant="ghost"
                    icon="i-heroicons-sparkles"
                    class="h-6 w-6 p-0"
                    title="Generate Structure"
                    :loading="generatingId === template.id"
                    @click.stop="generateTemplateStructure(template.id)"
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-arrow-top-right-on-square"
                    class="h-6 w-6 p-0"
                    title="View Details"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <WorkoutTemplatePreviewModal
    v-model:template-id="previewTemplateId"
    @view="onPreviewViewDetails"
  />

  <!-- Technical View Modal -->
  <WorkoutTechnicalViewModal
    v-if="showTechnicalModal"
    :workout="technicalWorkout"
    @update:open="showTechnicalModal = $event"
  />
</template>

<script setup lang="ts">
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
  import WorkoutTemplatePreviewModal from '~/components/workouts/WorkoutTemplatePreviewModal.vue'
  import WorkoutTechnicalViewModal from '~/components/workouts/WorkoutTechnicalViewModal.vue'
  import { getWorkoutIcon } from '~/utils/activity-types'

  const props = defineProps<{
    open: boolean
    templates: any[]
    loading?: boolean
    error?: boolean
  }>()

  defineEmits<{
    toggle: []
  }>()

  const toast = useToast()
  const localSearch = ref('')
  const generatingId = ref<string | null>(null)
  const selectedType = ref('all')
  const selectedDuration = ref('all')
  const previewTemplateId = ref<string | null>(null)

  // Technical Modal state
  const showTechnicalModal = ref(false)
  const technicalWorkout = ref<any>(null)

  function onPreviewViewDetails() {
    const template = props.templates.find((t) => t.id === previewTemplateId.value)
    if (template) {
      technicalWorkout.value = template
      showTechnicalModal.value = true
    }
  }

  const workoutTypes = [
    { label: 'Ride', value: 'Ride', icon: 'i-tabler-bike' },
    { label: 'Run', value: 'Run', icon: 'i-tabler-run' },
    { label: 'Swim', value: 'Swim', icon: 'i-tabler-swimming' },
    { label: 'Gym', value: 'WeightTraining', icon: 'i-tabler-barbell' }
  ]

  const durationRanges = [
    { label: 'All', value: 'all' },
    { label: '<30m', value: 'short' },
    { label: '30-60m', value: 'medium' },
    { label: '60m+', value: 'long' }
  ]

  const filteredTemplates = computed(() => {
    let result = props.templates

    // Type filter
    if (selectedType.value !== 'all') {
      result = result.filter((t) => t.type === selectedType.value)
    }

    // Duration filter
    if (selectedDuration.value !== 'all') {
      result = result.filter((t) => {
        const mins = (t.durationSec || 0) / 60
        if (selectedDuration.value === 'short') return mins < 30
        if (selectedDuration.value === 'medium') return mins >= 30 && mins <= 60
        if (selectedDuration.value === 'long') return mins > 60
        return true
      })
    }

    // Search filter
    const query = localSearch.value.trim().toLowerCase()
    if (query) {
      result = result.filter(
        (template) =>
          template.title?.toLowerCase().includes(query) ||
          template.type?.toLowerCase().includes(query) ||
          template.category?.toLowerCase().includes(query)
      )
    }

    return result
  })

  function formatMinutes(minutes: number) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const remainder = safeMinutes % 60

    if (!hours) {
      return `${remainder}m`
    }

    if (!remainder) {
      return `${hours}h`
    }

    return `${hours}h ${remainder}m`
  }

  function onTemplateDragStart(event: DragEvent, template: any) {
    if (!event.dataTransfer) {
      return
    }

    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        source: 'library-template',
        template
      })
    )
  }

  async function generateTemplateStructure(id: string) {
    generatingId.value = id
    try {
      await $fetch(`/api/library/workouts/${id}/generate-structure`, {
        method: 'POST'
      })
      toast.add({
        title: 'Generation Started',
        description: 'AI is building the workout structure.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Generation Failed',
        description: error.data?.message || 'Failed to trigger generation',
        color: 'error'
      })
    } finally {
      generatingId.value = null
    }
  }
</script>
