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
                    <tr
                      v-for="week in getWeeksInBlock(block.blockId)"
                      :key="`nested-week-${week.weekId}`"
                      class="border-t border-default/30 last:border-b-0 hover:bg-primary/5 cursor-pointer"
                      :class="{ 'bg-primary/5': selectedWeekId === week.weekId }"
                      @click.stop="$emit('select-week', week.weekId)"
                    >
                      <td class="px-8 py-2 font-medium text-highlighted">
                        Week {{ week.weekNumber }}
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
  const props = defineProps<{
    blockAnalytics: any[]
    weekAnalytics: any[]
    expandedIds: string[]
    selectedWeekId: string | null
  }>()

  defineEmits<{
    'toggle-expanded': [id: string]
    'edit-block': [id: string]
    'select-week': [id: string]
    'add-week': [id: string]
    'add-block': []
    'update-week-target': [weekId: string, field: string, value: number]
  }>()

  function getWeeksInBlock(blockId: string) {
    return props.weekAnalytics.filter((w) => w.blockId === blockId)
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
