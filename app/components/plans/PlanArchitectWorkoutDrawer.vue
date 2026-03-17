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

      <div v-if="open" class="max-h-[420px] overflow-hidden">
        <div class="border-b border-default/70 px-4 py-3">
          <UInput
            v-model="localSearch"
            placeholder="Search workouts..."
            size="sm"
            icon="i-heroicons-magnifying-glass"
          />
        </div>

        <div class="max-h-[340px] overflow-y-auto px-4 py-4">
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
              class="cursor-grab rounded-2xl border border-default/80 bg-muted/10 p-4 transition hover:border-primary/40 hover:bg-muted/20 active:cursor-grabbing"
              @dragstart="onTemplateDragStart($event, template)"
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
                <span>{{ formatMinutes(Math.round((template.durationSec || 0) / 60)) }}</span>
                <span>{{ Math.round(template.tss || 0) }} TSS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import MiniWorkoutChart from '~/components/workouts/MiniWorkoutChart.vue'
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

  const localSearch = ref('')

  const filteredTemplates = computed(() => {
    const query = localSearch.value.trim().toLowerCase()

    if (!query) {
      return props.templates
    }

    return props.templates.filter(
      (template) =>
        template.title?.toLowerCase().includes(query) ||
        template.type?.toLowerCase().includes(query) ||
        template.category?.toLowerCase().includes(query)
    )
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
</script>
