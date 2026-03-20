<template>
  <div class="space-y-6">
    <article
      v-for="block in sortedBlocks"
      :key="block.id"
      class="overflow-hidden rounded-none border-y bg-default shadow-sm transition-colors sm:rounded-3xl sm:border"
      :class="blockChrome(block).card"
    >
      <div class="border-b px-4 py-5 sm:p-6" :class="blockChrome(block).header">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge size="sm" variant="solid" :color="blockChrome(block).badgeColor">
                {{ block.type || 'BLOCK' }}
              </UBadge>
              <span class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                Season phase {{ block.order }}
              </span>
            </div>

            <div>
              <h3 class="text-2xl font-black tracking-tight text-highlighted">
                {{ block.name }}
              </h3>
              <p class="mt-1 text-sm text-muted">
                {{ getBlockSummary(block) }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              :icon="isCollapsed(block.id) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
              @click="$emit('toggle-collapsed', block.id)"
            >
              <span class="sm:hidden">{{ isCollapsed(block.id) ? 'Open' : 'Close' }}</span>
              <span class="hidden sm:inline">{{
                isCollapsed(block.id) ? 'Expand' : 'Collapse'
              }}</span>
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-pencil-square"
              @click="$emit('edit-block', block)"
            >
              <span class="sm:hidden">Edit</span>
              <span class="hidden sm:inline">Edit</span>
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              @click="$emit('remove-block', block.id)"
            >
              <span class="sm:hidden">Delete</span>
              <span class="hidden sm:inline">Remove</span>
            </UButton>
          </div>
        </div>
      </div>

      <div v-if="!isCollapsed(block.id)" class="p-0 sm:p-6">
        <div class="space-y-0 lg:hidden sm:space-y-4">
          <article
            v-for="week in orderedWeeks(block)"
            :id="`architect-week-${week.id}`"
            :key="`${block.id}-${week.id}-mobile`"
            class="relative overflow-hidden rounded-none border-y border-default/80 bg-default sm:rounded-2xl sm:border"
            :class="getWeekRowSurface(week)"
          >
            <div
              v-if="activeWeekId === week.id"
              class="pointer-events-none absolute inset-0 ring-2 ring-primary ring-inset"
            />

            <div
              class="border-b border-default/70 px-4 py-4"
              @click="$emit('select-week', week.id)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                    Week {{ week.weekNumber }}
                  </div>
                  <div
                    class="mt-2 text-lg font-black leading-tight tracking-tight text-highlighted"
                  >
                    {{ week.focus || 'Untitled week' }}
                  </div>
                </div>

                <div class="flex shrink-0 gap-1">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-document-duplicate"
                    @click.stop="$emit('duplicate-week', block.id, week.id)"
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    @click.stop="$emit('edit-week', block.id, week)"
                  />
                </div>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-2">
                <div class="rounded-xl border border-default/70 bg-default px-3 py-2">
                  <div class="text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                    Minutes
                  </div>
                  <div class="mt-1 text-sm font-bold text-highlighted">
                    {{ formatMinutes(getWeekSummary(week).scheduledMinutes) }}
                  </div>
                </div>
                <div class="rounded-xl border border-default/70 bg-default px-3 py-2">
                  <div class="text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                    TSS
                  </div>
                  <div class="mt-1 text-sm font-bold text-highlighted">
                    {{ getWeekSummary(week).scheduledTss }}
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-3">
              <div
                v-for="dayIndex in 7"
                :key="`${week.id}-${dayIndex - 1}-mobile`"
                class="group/day rounded-2xl border border-default/70 bg-default/80 p-3"
                :class="
                  dragOverKey === `${week.id}:${dayIndex - 1}`
                    ? 'ring-2 ring-primary ring-inset'
                    : ''
                "
                @dragover.prevent="$emit('dragover', week.id, dayIndex - 1)"
                @dragleave="$emit('dragleave', week.id, dayIndex - 1, $event)"
                @drop.prevent="$emit('drop', week.id, dayIndex - 1, $event)"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.18em] text-muted">
                    {{ days[dayIndex - 1] }}
                  </span>
                  <UBadge
                    v-if="getWorkouts(week, dayIndex - 1).length"
                    size="xs"
                    variant="soft"
                    color="primary"
                    class="font-black"
                  >
                    {{ getWorkouts(week, dayIndex - 1).length }}
                  </UBadge>
                </div>

                <div class="mt-3 space-y-2">
                  <PlanArchitectWorkoutCard
                    v-for="workout in getWorkouts(week, dayIndex - 1)"
                    :key="workout.id"
                    :workout="workout"
                    :in-library="isWorkoutInLibrary(workout)"
                    @edit="$emit('edit-workout', week.id, dayIndex - 1, workout)"
                    @remove="(id) => $emit('remove-workout', week.id, id)"
                    @copy-to-library="(w) => $emit('copy-to-library', w)"
                  />
                  <div
                    v-if="!getWorkouts(week, dayIndex - 1).length"
                    class="rounded-xl border border-dashed border-default/80 px-3 py-3 text-center text-[11px] text-muted/60"
                  >
                    Empty
                  </div>
                </div>

                <UDropdownMenu
                  :items="getAddMenuItems(week.id, dayIndex - 1)"
                  :content="{ align: 'end', side: 'bottom' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-plus-circle"
                    class="mt-3 w-full justify-center"
                  >
                    Add
                  </UButton>
                </UDropdownMenu>
              </div>
            </div>
          </article>
        </div>

        <div class="hidden overflow-x-auto lg:block">
          <div
            class="min-w-[1540px] overflow-hidden rounded-2xl border border-default/80 bg-default lg:grid"
            style="grid-template-columns: 190px repeat(7, minmax(148px, 1fr)) 200px"
          >
            <div
              class="border-b border-r border-default bg-muted/40 p-3 text-xs font-black uppercase tracking-[0.2em] text-muted"
            >
              Week
            </div>
            <div
              v-for="dayName in days"
              :key="`${block.id}-${dayName}`"
              class="border-b border-r border-default bg-muted/40 p-3 text-center text-xs font-black uppercase tracking-[0.2em] text-muted last:border-r-0"
            >
              {{ dayName }}
            </div>
            <div
              class="border-b border-default bg-muted/40 p-3 text-xs font-black uppercase tracking-[0.2em] text-muted"
            >
              Summary
            </div>

            <template v-for="week in orderedWeeks(block)" :key="week.id">
              <!-- Week Rail -->
              <div
                :id="`architect-week-${week.id}`"
                class="group/rail relative flex min-h-[188px] flex-col justify-between border-r border-default p-3.5 cursor-pointer"
                :class="getWeekRowSurface(week)"
                @click="$emit('select-week', week.id)"
              >
                <div
                  v-if="activeWeekId === week.id"
                  class="pointer-events-none absolute inset-0 ring-2 ring-primary ring-inset"
                />
                <div class="space-y-3">
                  <div class="text-[11px] font-black uppercase tracking-[0.24em] text-muted">
                    Week {{ week.weekNumber }}
                  </div>
                  <div
                    class="text-[18px] font-black leading-[1.05] tracking-tight text-highlighted xl:text-[19px]"
                  >
                    {{ week.focus || 'Untitled week' }}
                  </div>
                  <!-- Zone Distributions -->
                  <div class="mt-4 space-y-4">
                    <div v-for="type in ['power', 'hr'] as const" :key="type">
                      <div v-if="getZoneBars(week, type).some((b) => b.duration > 0)">
                        <div
                          class="text-[9px] font-black uppercase tracking-[0.12em] text-muted/80"
                        >
                          {{ type === 'power' ? 'Power' : 'HR' }} Distribution
                        </div>
                        <div class="mt-1.5 flex h-8 items-end gap-1">
                          <UTooltip
                            v-for="bar in getZoneBars(week, type)"
                            :key="`${type}-${week.id}-${bar.zoneIndex}`"
                            :text="`Z${bar.zoneIndex}: ${formatMinutes(Math.round(bar.duration / 60))}`"
                            class="h-full flex-1 flex items-end"
                          >
                            <div
                              class="w-full rounded-t-[2px]"
                              :style="{ height: `${bar.height}%`, backgroundColor: bar.color }"
                            />
                          </UTooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  class="flex flex-wrap gap-2 opacity-100 lg:opacity-0 lg:group-hover/rail:opacity-100 transition-opacity"
                >
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-document-duplicate"
                    @click.stop="$emit('duplicate-week', block.id, week.id)"
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    @click.stop="$emit('edit-week', block.id, week)"
                  />
                </div>
              </div>

              <!-- Day Cells -->
              <div
                v-for="dayIndex in 7"
                :key="`${week.id}-${dayIndex - 1}`"
                class="group/day flex min-h-[188px] flex-col border-r border-default p-2.5 last:border-r-0"
                :class="[
                  getWeekRowSurface(week),
                  dragOverKey === `${week.id}:${dayIndex - 1}`
                    ? 'ring-2 ring-primary ring-inset'
                    : ''
                ]"
                @dragover.prevent="$emit('dragover', week.id, dayIndex - 1)"
                @dragleave="$emit('dragleave', week.id, dayIndex - 1, $event)"
                @drop.prevent="$emit('drop', week.id, dayIndex - 1, $event)"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-black uppercase tracking-[0.18em] text-muted">{{
                    days[dayIndex - 1]
                  }}</span>
                  <UBadge
                    v-if="getWorkouts(week, dayIndex - 1).length"
                    size="xs"
                    variant="soft"
                    color="primary"
                    class="font-black"
                  >
                    {{ getWorkouts(week, dayIndex - 1).length }}
                  </UBadge>
                </div>
                <div class="mt-3 flex-1 space-y-2">
                  <PlanArchitectWorkoutCard
                    v-for="workout in getWorkouts(week, dayIndex - 1)"
                    :key="workout.id"
                    :workout="workout"
                    :in-library="isWorkoutInLibrary(workout)"
                    @edit="$emit('edit-workout', week.id, dayIndex - 1, workout)"
                    @remove="(id) => $emit('remove-workout', week.id, id)"
                    @copy-to-library="(w) => $emit('copy-to-library', w)"
                  />
                  <div
                    v-if="!getWorkouts(week, dayIndex - 1).length"
                    class="rounded-xl border border-dashed border-default/80 bg-transparent px-3 py-3 text-[11px] text-muted/60 text-center"
                  >
                    Empty
                  </div>
                </div>
                <UDropdownMenu
                  :items="getAddMenuItems(week.id, dayIndex - 1)"
                  :content="{ align: 'start', side: 'top' }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-plus-circle"
                    class="mt-3 opacity-0 transition-opacity lg:group-hover/day:opacity-100"
                  >
                    Add
                  </UButton>
                </UDropdownMenu>
              </div>

              <!-- Week Summary -->
              <div
                class="min-h-[188px] border-l border-default p-3.5"
                :class="getWeekRowSurface(week)"
              >
                <div class="text-[11px] font-black uppercase tracking-[0.22em] text-muted">
                  Summary
                </div>
                <div class="mt-3 space-y-3">
                  <div
                    v-for="metric in ['minutes', 'tss'] as const"
                    :key="metric"
                    class="rounded-xl border border-default/70 bg-default px-3 py-2"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-[9px] font-black uppercase text-muted">{{ metric }}</div>
                      <div class="text-[10px] font-bold text-highlighted">
                        {{
                          metric === 'minutes'
                            ? formatMinutes(getWeekSummary(week).scheduledMinutes)
                            : getWeekSummary(week).scheduledTss
                        }}
                      </div>
                    </div>
                    <UProgress
                      class="mt-1.5"
                      size="xs"
                      :color="metric === 'minutes' ? 'primary' : 'neutral'"
                      :model-value="getCompletion(week, metric)"
                    />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
  import PlanArchitectWorkoutCard from './PlanArchitectWorkoutCard.vue'
  import { calculateWeekZoneDistribution } from '~/utils/workout-analytics'
  import { ZONE_COLORS } from '~/utils/zone-colors'

  const props = defineProps<{
    sortedBlocks: any[]
    days: string[]
    activeWeekId: string | null
    collapsedIds: string[]
    dragOverKey: string | null
    isWorkoutInLibrary: (w: any) => boolean
  }>()

  const emit = defineEmits<{
    'toggle-collapsed': [id: string]
    'edit-block': [block: any]
    'remove-block': [id: string]
    'select-week': [id: string]
    'duplicate-week': [blockId: string, weekId: string]
    'edit-week': [blockId: string, week: any]
    'add-workout': [weekId: string, dayIndex: number]
    'add-note': [weekId: string, dayIndex: number]
    'edit-workout': [weekId: string, dayIndex: number, workout: any]
    'remove-workout': [weekId: string, workoutId: string]
    'copy-to-library': [workout: any]
    dragover: [weekId: string, dayIndex: number]
    dragleave: [weekId: string, dayIndex: number, event: DragEvent]
    drop: [weekId: string, dayIndex: number, event: DragEvent]
  }>()

  function isCollapsed(id: string) {
    return props.collapsedIds.includes(id)
  }

  function orderedWeeks(block: any) {
    return [...(block.weeks || [])].sort((a, b) => a.weekNumber - b.weekNumber)
  }

  function getWorkouts(week: any, dayIndex: number) {
    return (week.workouts || [])
      .filter((w: any) => w.dayIndex === dayIndex)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  }

  function getBlockSummary(block: any) {
    const weeks = block.weeks?.length || 0
    const workouts = block.weeks?.reduce(
      (sum: number, w: any) => sum + (w.workouts?.length || 0),
      0
    )
    return `${weeks} week${weeks === 1 ? '' : 's'} • ${workouts} item${workouts === 1 ? '' : 's'}`
  }

  function getWeekRowSurface(week: any) {
    const tone = week.weekNumber % 2 === 0 ? 'bg-muted/10' : 'bg-default'
    return props.activeWeekId === week.id ? `${tone} bg-primary/5` : tone
  }

  function getWeekSummary(week: any) {
    const workouts = week.workouts || []
    return {
      scheduledMinutes: workouts.reduce(
        (sum: number, w: any) => sum + Math.round((w.durationSec || 0) / 60),
        0
      ),
      scheduledTss: workouts.reduce((sum: number, w: any) => sum + Math.round(w.tss || 0), 0)
    }
  }

  function getCompletion(week: any, metric: 'minutes' | 'tss') {
    const summary = getWeekSummary(week)
    const target = metric === 'minutes' ? week.volumeTargetMinutes || 0 : week.tssTarget || 0
    const actual = metric === 'minutes' ? summary.scheduledMinutes : summary.scheduledTss
    if (!target) return actual ? 100 : 0
    return Math.min(100, Math.round((actual / target) * 100))
  }

  function getZoneBars(week: any, type: 'power' | 'hr') {
    const distribution = calculateWeekZoneDistribution(week.workouts || [], type)
    const maxDuration = Math.max(...distribution, 1)
    return distribution.map((duration, index) => ({
      zoneIndex: index + 1,
      duration,
      color: ZONE_COLORS[index],
      height: duration ? Math.max(10, Math.round((duration / maxDuration) * 100)) : 4
    }))
  }

  function formatMinutes(minutes: number) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const remainder = safeMinutes % 60
    if (!hours) return `${remainder}m`
    if (!remainder) return `${hours}h`
    return `${hours}h ${remainder}m`
  }

  function getAddMenuItems(weekId: string, dayIndex: number) {
    return [
      [
        {
          label: 'New workout',
          icon: 'i-tabler-bike',
          onSelect: () => emit('add-workout', weekId, dayIndex)
        },
        {
          label: 'New note',
          icon: 'i-heroicons-document-text',
          onSelect: () => emit('add-note', weekId, dayIndex)
        }
      ]
    ]
  }

  function blockChrome(block: any) {
    const type = String(block.type || '').toUpperCase()
    if (type.includes('BUILD'))
      return {
        card: 'border-emerald-200/80 dark:border-emerald-900/60',
        header:
          'border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20',
        badgeColor: 'success' as const
      }
    if (type.includes('PEAK'))
      return {
        card: 'border-sky-200/80 dark:border-sky-900/60',
        header: 'border-sky-200/80 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/20',
        badgeColor: 'info' as const
      }
    if (type.includes('RECOVERY') || type.includes('DELOAD') || type.includes('TAPER'))
      return {
        card: 'border-amber-200/80 dark:border-amber-900/60',
        header: 'border-amber-200/80 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20',
        badgeColor: 'warning' as const
      }
    return {
      card: 'border-default/80',
      header: 'border-default/80 bg-muted/20',
      badgeColor: 'neutral' as const
    }
  }
</script>
