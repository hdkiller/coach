<template>
  <div class="rounded-2xl border border-default/70 bg-muted/10 overflow-hidden">
    <table class="w-full table-fixed text-[12px] text-left">
      <thead class="bg-muted/20">
        <tr class="text-left text-[9px] font-black uppercase tracking-[0.16em] text-muted">
          <th class="px-3 py-2.5 w-[28%]">Block</th>
          <th class="px-3 py-2.5 w-[10%]">Span</th>
          <th class="px-3 py-2.5 w-[7%]">Wks</th>
          <th class="px-3 py-2.5 w-[12%] text-primary">Tgt Min</th>
          <th class="px-3 py-2.5 w-[12%]">Sch Min</th>
          <th class="px-3 py-2.5 w-[10%] text-primary">Tgt TSS</th>
          <th class="px-3 py-2.5 w-[12%]">Sch TSS</th>
          <th class="px-3 py-2.5 w-[9%] text-right pr-4">Sessions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="block in blockAnalytics" :key="`analytics-${block.blockId}`">
          <!-- Block row -->
          <tr
            class="group/row cursor-pointer border-t border-default/70 transition-colors hover:bg-muted/5"
            :class="{ 'bg-primary/5': expandedIds.includes(block.blockId) }"
            @click="$emit('toggle-expanded', block.blockId)"
          >
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-3 min-w-0">
                <UIcon
                  :name="
                    expandedIds.includes(block.blockId)
                      ? 'i-heroicons-chevron-down'
                      : 'i-heroicons-chevron-right'
                  "
                  class="h-3.5 w-3.5 shrink-0 text-muted"
                />
                <UBadge
                  size="sm"
                  variant="soft"
                  :color="blockChrome(block.blockType).badgeColor"
                  class="cursor-pointer"
                  @click.stop="$emit('edit-block', block.blockId)"
                >
                  {{ block.blockType || 'Block' }}
                </UBadge>
                <div class="min-w-0 flex items-center gap-2">
                  <div class="truncate text-[12px] font-semibold text-highlighted">
                    {{ block.blockName }}
                  </div>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-pencil-square"
                    class="opacity-0 group-hover/row:opacity-100 transition-opacity p-0 h-4 w-4"
                    @click.stop="$emit('edit-block', block.blockId)"
                  />
                </div>
              </div>
            </td>
            <td class="px-3 py-2.5 text-[11px] text-muted whitespace-nowrap">
              W{{ block.startWeekNumber }}-W{{ block.endWeekNumber }}
            </td>
            <td class="px-3 py-2.5 text-[12px] text-highlighted whitespace-nowrap">
              {{ block.weekCount }}
            </td>
            <td class="px-3 py-2.5 text-[12px] text-highlighted whitespace-nowrap">
              {{ formatMinutes(block.targetMinutes) }}
            </td>
            <td class="px-3 py-2.5 text-[12px] text-highlighted whitespace-nowrap">
              {{ formatMinutes(block.scheduledMinutes) }}
            </td>
            <td class="px-3 py-2.5 text-[12px] text-highlighted whitespace-nowrap">
              {{ block.targetTss }}
            </td>
            <td class="px-3 py-2.5 text-[12px] text-highlighted whitespace-nowrap">
              {{ block.scheduledTss }}
            </td>
            <td class="px-3 py-2.5 text-[12px] text-highlighted whitespace-nowrap text-right pr-4">
              {{ block.workoutCount }}
            </td>
          </tr>

          <!-- Weeks sub-table -->
          <tr v-if="expandedIds.includes(block.blockId)" class="bg-muted/5">
            <td colspan="8" class="p-0 border-t border-default/40">
              <div class="overflow-x-auto">
                <table class="w-full text-[11px]">
                  <thead class="bg-muted/10">
                    <tr class="text-left text-[8px] font-bold uppercase tracking-wider text-muted">
                      <th class="px-8 py-1.5 w-[28%]">Week</th>
                      <th class="px-3 py-1.5 w-[20%]">Focus</th>
                      <th class="px-3 py-1.5 text-primary w-[12%]">Tgt Min</th>
                      <th class="px-3 py-1.5 w-[12%]">Sch Min</th>
                      <th class="px-3 py-1.5 text-primary w-[10%]">Tgt TSS</th>
                      <th class="px-3 py-1.5 w-[12%]">Sch TSS</th>
                      <th class="px-3 py-1.5 text-right pr-4">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template
                      v-for="week in getWeeksInBlock(block.blockId)"
                      :key="`nested-week-${week.weekId}`"
                    >
                      <!-- Week row -->
                      <tr
                        class="border-t border-default/30 last:border-b-0 cursor-pointer transition-colors"
                        :class="
                          expandedWeekIds.includes(week.weekId)
                            ? 'bg-primary/10'
                            : selectedWeekId === week.weekId
                              ? 'bg-primary/5'
                              : 'hover:bg-primary/5'
                        "
                        @click.stop="toggleWeekExpanded(week.weekId)"
                      >
                        <td class="px-8 py-2 font-medium text-highlighted">
                          <div class="flex items-center gap-2">
                            <UIcon
                              :name="
                                expandedWeekIds.includes(week.weekId)
                                  ? 'i-heroicons-chevron-down'
                                  : 'i-heroicons-chevron-right'
                              "
                              class="h-3 w-3 shrink-0 text-muted"
                            />
                            <span>Week {{ week.weekNumber }}</span>
                          </div>
                        </td>
                        <td class="px-3 py-2 text-muted truncate max-w-[12rem]">
                          {{ week.weekFocus }}
                        </td>
                        <td class="px-3 py-2 text-highlighted">
                          <UInput
                            v-model.number="week.targetMinutes"
                            type="number"
                            size="xs"
                            variant="none"
                            class="w-16 font-bold -ml-2"
                            @update:model-value="
                              (val) =>
                                $emit('update-week-target', week.weekId, 'volumeTargetMinutes', val)
                            "
                            @click.stop
                          />
                        </td>
                        <td class="px-3 py-2 text-highlighted">
                          {{ formatMinutes(week.scheduledMinutes) }}
                        </td>
                        <td class="px-3 py-2 text-highlighted">
                          <UInput
                            v-model.number="week.targetTss"
                            type="number"
                            size="xs"
                            variant="none"
                            class="w-16 font-bold -ml-2"
                            @update:model-value="
                              (val) => $emit('update-week-target', week.weekId, 'tssTarget', val)
                            "
                            @click.stop
                          />
                        </td>
                        <td class="px-3 py-2 text-highlighted">{{ week.scheduledTss }}</td>
                        <td class="px-3 py-2 text-right font-semibold text-primary pr-4">
                          {{ week.workoutCount }}
                        </td>
                      </tr>

                      <!-- Day sub-rows -->
                      <tr
                        v-if="expandedWeekIds.includes(week.weekId)"
                        class="border-t border-default/20"
                      >
                        <td colspan="7" class="p-0">
                          <table class="w-full text-[10px] bg-muted/10">
                            <thead>
                              <tr
                                class="text-left text-[8px] font-black uppercase tracking-widest text-muted"
                              >
                                <th class="px-12 py-1.5 w-[15%]">Day</th>
                                <th class="px-3 py-1.5">Workouts</th>
                                <th class="px-3 py-1.5 w-[12%]">Duration</th>
                                <th class="px-3 py-1.5 w-[10%]">TSS</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="dayIdx in 7"
                                :key="dayIdx"
                                class="group/day border-t border-default/20 transition-colors"
                                :class="[
                                  dragOverKey === `${week.weekId}:${dayIdx - 1}`
                                    ? 'bg-primary/20 ring-1 ring-primary/40 ring-inset'
                                    : getWorkoutsByDay(week.weekId, dayIdx - 1).length
                                      ? ''
                                      : 'opacity-40'
                                ]"
                                @dragover.prevent="dragOverKey = `${week.weekId}:${dayIdx - 1}`"
                                @dragleave="dragOverKey = null"
                                @drop.prevent="onDayDrop(week.weekId, dayIdx - 1, $event)"
                              >
                                <td
                                  class="px-12 py-1.5 font-bold text-highlighted whitespace-nowrap"
                                >
                                  {{ DAY_LABELS[dayIdx - 1] }}
                                </td>
                                <td class="px-3 py-1.5">
                                  <div class="flex items-center justify-between gap-2">
                                    <div
                                      v-if="getWorkoutsByDay(week.weekId, dayIdx - 1).length"
                                      class="flex flex-wrap gap-1"
                                    >
                                      <span
                                        v-for="workout in getWorkoutsByDay(week.weekId, dayIdx - 1)"
                                        :key="workout.id"
                                        draggable="true"
                                        class="inline-flex cursor-grab active:cursor-grabbing items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-semibold text-highlighted select-none"
                                        @dragstart="
                                          onWorkoutDragStart($event, week.weekId, workout)
                                        "
                                      >
                                        <UIcon
                                          :name="getWorkoutIcon(workout)"
                                          class="h-2.5 w-2.5 shrink-0 text-primary/70"
                                        />
                                        {{ workout.title || 'Workout' }}
                                      </span>
                                    </div>
                                    <span v-else class="italic text-muted/60">Rest</span>

                                    <UDropdownMenu
                                      :items="getAddMenuItems(week.weekId, dayIdx - 1)"
                                      :content="{ align: 'end', side: 'right' }"
                                    >
                                      <UButton
                                        size="xs"
                                        color="neutral"
                                        variant="ghost"
                                        icon="i-heroicons-plus-circle"
                                        class="h-5 w-5 p-0 opacity-0 transition-opacity group-hover/day:opacity-100"
                                      />
                                    </UDropdownMenu>
                                  </div>
                                </td>
                                <td class="px-3 py-1.5 text-muted whitespace-nowrap">
                                  <template v-if="getWorkoutsByDay(week.weekId, dayIdx - 1).length">
                                    {{
                                      formatMinutes(
                                        getWorkoutsByDay(week.weekId, dayIdx - 1).reduce(
                                          (s: number, w: any) =>
                                            s + Math.round((w.durationSec || 0) / 60),
                                          0
                                        )
                                      )
                                    }}
                                  </template>
                                  <span v-else>—</span>
                                </td>
                                <td class="px-3 py-1.5 text-muted whitespace-nowrap">
                                  <template v-if="getWorkoutsByDay(week.weekId, dayIdx - 1).length">
                                    {{
                                      getWorkoutsByDay(week.weekId, dayIdx - 1).reduce(
                                        (s: number, w: any) => s + Math.round(w.tss || 0),
                                        0
                                      ) || '—'
                                    }}
                                  </template>
                                  <span v-else>—</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </template>

                    <!-- Quick Add Week Row -->
                    <tr class="border-t border-default/30 bg-muted/5">
                      <td colspan="7" class="px-8 py-2">
                        <UButton
                          size="xs"
                          color="primary"
                          variant="ghost"
                          icon="i-heroicons-plus-circle"
                          label="Add training week to this block"
                          @click.stop="$emit('add-week', block.blockId)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </template>

        <!-- Quick Add Block Row -->
        <tr class="border-t border-default/70">
          <td colspan="8" class="px-3 py-3">
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-plus"
              label="Add Training Block"
              block
              @click="$emit('add-block')"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const props = defineProps<{
    blockAnalytics: any[]
    weekAnalytics: any[]
    expandedIds: string[]
    selectedWeekId: string | null
    sortedBlocks: any[]
  }>()

  const emit = defineEmits<{
    'toggle-expanded': [id: string]
    'edit-block': [id: string]
    'select-week': [id: string]
    'add-week': [id: string]
    'add-block': []
    'add-day-item': [weekId: string, dayIndex: number, kind: 'workout' | 'note']
    'update-week-target': [weekId: string, field: string, value: number]
    'table-workout-drop': [payload: { toWeekId: string; toDayIndex: number; data: string }]
  }>()

  // Local state for week-level expansion
  const expandedWeekIds = ref<string[]>([])
  const dragOverKey = ref<string | null>(null)

  function toggleWeekExpanded(weekId: string) {
    expandedWeekIds.value = expandedWeekIds.value.includes(weekId)
      ? expandedWeekIds.value.filter((id) => id !== weekId)
      : [...expandedWeekIds.value, weekId]

    emit('select-week', weekId)
  }

  function onWorkoutDragStart(event: DragEvent, weekId: string, workout: any) {
    event.dataTransfer!.effectAllowed = 'move'
    event.dataTransfer!.setData(
      'application/json',
      JSON.stringify({ moveWorkout: true, fromWeekId: weekId, workoutId: workout.id })
    )
  }

  function onDayDrop(toWeekId: string, toDayIndex: number, event: DragEvent) {
    dragOverKey.value = null
    const data = event.dataTransfer?.getData('application/json')
    if (!data) return
    emit('table-workout-drop', { toWeekId, toDayIndex, data })
  }

  function getWeeksInBlock(blockId: string) {
    return props.weekAnalytics.filter((w) => w.blockId === blockId)
  }

  function getAddMenuItems(weekId: string, dayIndex: number) {
    return [
      [
        {
          label: 'New workout',
          icon: 'i-tabler-bike',
          onSelect: () => emit('add-day-item', weekId, dayIndex, 'workout')
        },
        {
          label: 'New note',
          icon: 'i-heroicons-document-text',
          onSelect: () => emit('add-day-item', weekId, dayIndex, 'note')
        }
      ]
    ]
  }

  function getWorkoutsByDay(weekId: string, dayIndex: number): any[] {
    for (const block of props.sortedBlocks) {
      const week = (block.weeks || []).find((w: any) => w.id === weekId)
      if (week) {
        return (week.workouts || []).filter((wo: any) => wo.dayIndex === dayIndex)
      }
    }
    return []
  }

  function getWorkoutIcon(workout: any): string {
    const f = `${workout.type || ''} ${workout.category || ''}`.toUpperCase()
    if (f.includes('NOTE')) return 'i-heroicons-document-text'
    if (f.includes('SWIM')) return 'i-tabler-swimming'
    if (f.includes('RUN') || f.includes('MARATHON') || f.includes('TRAIL')) return 'i-tabler-run'
    if (f.includes('RIDE') || f.includes('BIKE') || f.includes('CYCLE') || f.includes('CYCLING'))
      return 'i-tabler-bike'
    if (f.includes('GYM') || f.includes('STRENGTH') || f.includes('WEIGHT'))
      return 'i-tabler-barbell'
    if (f.includes('YOGA') || f.includes('FLEX') || f.includes('MOBILITY')) return 'i-tabler-yoga'
    if (f.includes('WALK') || f.includes('HIKE')) return 'i-tabler-walk'
    if (f.includes('ROW') || f.includes('KAYAK') || f.includes('PADDLE')) return 'i-tabler-rowing'
    if (f.includes('SKI') || f.includes('CROSS_COUNTRY')) return 'i-tabler-ski-jumping'
    if (f.includes('REST') || f.includes('RECOVERY')) return 'i-tabler-moon'
    if (f.includes('BRICK') || f.includes('TRIATHLON')) return 'i-tabler-trophy'
    if (f.includes('CLIMB') || f.includes('BOULDERING')) return 'i-tabler-mountain'
    return 'i-tabler-activity'
  }

  function blockChrome(type: string) {
    const t = String(type || '').toUpperCase()
    if (t.includes('BUILD')) return { badgeColor: 'success' as const }
    if (t.includes('PEAK')) return { badgeColor: 'info' as const }
    if (t.includes('RECOVERY') || t.includes('DELOAD') || t.includes('TAPER'))
      return { badgeColor: 'warning' as const }
    return { badgeColor: 'neutral' as const }
  }

  function formatMinutes(minutes: number) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const remainder = safeMinutes % 60
    if (!hours) return `${remainder}m`
    if (!remainder) return `${hours}h`
    return `${hours}h ${remainder}m`
  }
</script>
