<template>
  <UDashboardPanel id="plan-architect">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <div class="flex items-center gap-1">
            <UDashboardSidebarCollapse />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-chevron-left"
              @click="navigateTo('/library/plans')"
            />
          </div>
        </template>

        <template #title>
          <ClientOnly>
            <span v-if="draftPlan">{{ draftPlan.name }}</span>
            <template #fallback>
              <span>Plan Architect</span>
            </template>
          </ClientOnly>
        </template>

        <template #right>
          <ClientOnly>
            <div class="flex items-center gap-2">
              <UBadge v-if="draftPlan?.isTemplate" color="primary" variant="soft" size="sm"
                >Template</UBadge
              >
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-heroicons-squares-2x2"
                @click="isUtilityPanelOpen = true"
                >Utility panel</UButton
              >
              <UBadge v-if="hasUnsavedChanges" color="warning" variant="soft" size="sm"
                >Unsaved</UBadge
              >
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-heroicons-pencil-square"
                @click="isPlanEditorOpen = true"
                >Edit details</UButton
              >
              <UButton
                color="primary"
                size="sm"
                icon="i-heroicons-cloud-arrow-up"
                :loading="saving"
                :disabled="!hasUnsavedChanges"
                @click="savePlan"
                >Save changes</UButton
              >
            </div>
          </ClientOnly>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="min-h-full bg-default">
        <ClientOnly>
          <div class="p-4 sm:p-6">
            <div v-if="loading" class="space-y-4">
              <UCard v-for="i in 4" :key="i" :ui="{ body: 'p-5' }">
                <USkeleton class="h-28 w-full" />
              </UCard>
            </div>

            <div v-else-if="!draftPlan">
              <UAlert
                color="error"
                variant="soft"
                title="Blueprint not found"
                description="The requested training plan could not be loaded."
              />
            </div>

            <div v-else class="space-y-12 pb-32">
              <!-- Header Section -->
              <div class="space-y-4">
                <div>
                  <div class="text-[10px] font-black uppercase tracking-[0.28em] text-primary/80">
                    Coach Workspace
                  </div>
                  <h1
                    class="mt-2 text-3xl font-black uppercase tracking-tight text-highlighted sm:text-4xl"
                  >
                    Plan Architect
                  </h1>
                </div>

                <div
                  class="flex flex-col gap-4 rounded-3xl border border-default/80 bg-default/90 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between"
                >
                  <div class="space-y-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <UBadge color="neutral" variant="soft" size="sm"
                        >{{ sortedBlocks.length }} blocks</UBadge
                      >
                      <UBadge color="neutral" variant="soft" size="sm"
                        >{{ totalWeeks }} weeks</UBadge
                      >
                      <UBadge color="neutral" variant="soft" size="sm"
                        >{{ totalWorkouts }} workouts</UBadge
                      >
                    </div>
                    <h2 class="text-2xl font-black tracking-tight text-highlighted">
                      {{ draftPlan.name }}
                    </h2>
                    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div
                        v-for="metric in headlineMetrics"
                        :key="metric.label"
                        class="rounded-2xl border border-default/70 bg-muted/25 px-4 py-3"
                      >
                        <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                          {{ metric.label }}
                        </div>
                        <div class="mt-2 text-lg font-bold text-highlighted">
                          {{ metric.value }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col gap-3 lg:items-end">
                    <div
                      class="inline-flex items-center rounded-xl border border-default bg-muted/30 p-1"
                    >
                      <UButton
                        :color="viewMode === 'board' ? 'primary' : 'neutral'"
                        :variant="viewMode === 'board' ? 'soft' : 'ghost'"
                        size="sm"
                        icon="i-heroicons-calendar-days"
                        @click="viewMode = 'board'"
                        >Weekly board</UButton
                      >
                      <UButton
                        :color="viewMode === 'table' ? 'primary' : 'neutral'"
                        :variant="viewMode === 'table' ? 'soft' : 'ghost'"
                        size="sm"
                        icon="i-heroicons-table-cells"
                        @click="viewMode = 'table'"
                        >Plan table</UButton
                      >
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <UButton
                        color="neutral"
                        variant="outline"
                        size="sm"
                        icon="i-heroicons-squares-2x2"
                        @click="isUtilityPanelOpen = true"
                        >Open utility panel</UButton
                      >
                      <UButton
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        icon="i-heroicons-plus-circle"
                        @click="addBlock"
                        >Add block</UButton
                      >
                    </div>
                  </div>
                </div>
              </div>

              <!-- Analytics Section -->
              <section
                class="rounded-3xl border border-default/80 bg-default/95 p-5 shadow-sm sm:p-6"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <h3 class="text-2xl font-black tracking-tight text-highlighted">
                    Seasonal load timeline
                  </h3>
                  <div
                    class="inline-flex items-center rounded-xl border border-default bg-muted/30 p-1"
                  >
                    <UButton
                      :color="chartMetric === 'tss' ? 'primary' : 'neutral'"
                      :variant="chartMetric === 'tss' ? 'soft' : 'ghost'"
                      size="sm"
                      @click="chartMetric = 'tss'"
                      >TSS</UButton
                    >
                    <UButton
                      :color="chartMetric === 'minutes' ? 'primary' : 'neutral'"
                      :variant="chartMetric === 'minutes' ? 'soft' : 'ghost'"
                      size="sm"
                      @click="chartMetric = 'minutes'"
                      >Minutes</UButton
                    >
                  </div>
                </div>

                <div class="mt-6">
                  <PlanArchitectTimelineChart
                    :metric="chartMetric"
                    :weeks="weekAnalytics"
                    :block-ranges="chartBlockRanges"
                    :selected-week-id="selectedChartWeekId"
                    @select-week="handleChartWeekSelect"
                  />
                </div>

                <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
                  <PlanArchitectBlockTable
                    :block-analytics="blockAnalytics"
                    :week-analytics="weekAnalytics"
                    :expanded-ids="expandedAnalyticsBlockIds"
                    :selected-week-id="selectedChartWeekId"
                    @toggle-expanded="toggleAnalyticsBlockExpanded"
                    @edit-block="(id) => openBlockEditor(findBlock(id))"
                    @select-week="handleChartWeekSelect"
                    @add-week="addWeekToBlock"
                    @add-block="addBlock"
                    @update-week-target="updateWeekTarget"
                  />

                  <!-- Selected Week Summary Card -->
                  <div class="rounded-2xl border border-default/70 bg-muted/10 p-5">
                    <div v-if="selectedWeekAnalytics" class="h-full flex flex-col">
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <div
                            class="text-[10px] font-black uppercase tracking-[0.22em] text-muted"
                          >
                            Selected week
                          </div>
                          <div
                            class="mt-2 text-xl font-black tracking-tight text-highlighted line-clamp-2"
                          >
                            {{ selectedWeekAnalytics.weekFocus }}
                          </div>
                          <div class="mt-1 text-sm text-muted">
                            {{ selectedWeekAnalytics.blockName }} • Week
                            {{ selectedWeekAnalytics.weekNumber }}
                          </div>
                        </div>
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="sm"
                          icon="i-heroicons-arrow-right"
                          class="shrink-0"
                          @click="scrollToWeek(selectedWeekAnalytics.weekId)"
                        >
                          Board
                        </UButton>
                      </div>

                      <div class="mt-6 grid grid-cols-2 gap-3">
                        <div class="rounded-xl border border-default/60 bg-default p-3">
                          <div
                            class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                          >
                            Minutes
                          </div>
                          <div class="mt-1 text-sm font-bold text-highlighted">
                            {{ formatMinutes(selectedWeekAnalytics.scheduledMinutes) }} /
                            {{ formatMinutes(selectedWeekAnalytics.targetMinutes) }}
                          </div>
                        </div>
                        <div class="rounded-xl border border-default/60 bg-default p-3">
                          <div
                            class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                          >
                            TSS
                          </div>
                          <div class="mt-1 text-sm font-bold text-highlighted">
                            {{ selectedWeekAnalytics.scheduledTss }} /
                            {{ selectedWeekAnalytics.targetTss }}
                          </div>
                        </div>
                      </div>

                      <div class="mt-6 flex-1">
                        <div
                          class="text-[10px] font-black uppercase tracking-[0.18em] text-muted mb-4"
                        >
                          Weekly composition
                        </div>
                        <div class="space-y-4">
                          <div
                            v-for="bucket in selectedWeekBreakdown"
                            :key="bucket.label"
                            class="space-y-1.5"
                          >
                            <div class="flex items-center justify-between gap-3 text-[12px]">
                              <div class="font-bold text-highlighted">{{ bucket.label }}</div>
                              <div class="text-muted font-medium">
                                {{ bucket.count }} sesh • {{ formatMinutes(bucket.minutes) }}
                              </div>
                            </div>
                            <UProgress
                              size="xs"
                              :model-value="
                                selectedWeekAnalytics.workoutCount
                                  ? Math.round(
                                      (bucket.count / selectedWeekAnalytics.workoutCount) * 100
                                    )
                                  : 0
                              "
                              :color="bucket.color"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      v-else
                      class="h-full flex flex-col items-center justify-center text-center p-8"
                    >
                      <UIcon name="i-heroicons-calendar" class="w-8 h-8 text-muted/40 mb-3" />
                      <div class="text-xs font-bold text-muted uppercase tracking-widest">
                        No week selected
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Board View -->
              <PlanArchitectBoard
                v-if="viewMode === 'board'"
                :sorted-blocks="sortedBlocks"
                :days="DAYS"
                :active-week-id="activeWeekId"
                :collapsed-ids="collapsedBlockIds"
                :drag-over-key="dragOverDayKey"
                :is-workout-in-library="isWorkoutInLibrary"
                @toggle-collapsed="toggleBlockCollapsed"
                @edit-block="openBlockEditor"
                @remove-block="removeBlock"
                @select-week="(id) => (activeWeekId = id)"
                @duplicate-week="duplicateWeek"
                @edit-week="openWeekEditor"
                @add-workout="addWorkout"
                @edit-workout="openWorkoutEditor"
                @remove-workout="removeWorkout"
                @copy-to-library="copyWorkoutToLibrary"
                @dragover="onArchitectDayDragOver"
                @dragleave="onArchitectDayDragLeave"
                @drop="onArchitectDayDrop"
              />

              <!-- Table View (Placeholder) -->
              <section v-else class="rounded-3xl border border-default p-12 text-center text-muted">
                Table view is under maintenance. Please use the board view.
              </section>
            </div>
          </div>
          <template #fallback>
            <div class="p-6 space-y-12">
              <div class="space-y-4">
                <USkeleton class="h-12 w-1/3" />
                <div class="grid grid-cols-4 gap-4">
                  <USkeleton v-for="i in 4" :key="i" class="h-24" />
                </div>
              </div>
              <USkeleton class="h-96 w-full rounded-3xl" />
              <USkeleton class="h-96 w-full rounded-3xl" />
            </div>
          </template>
        </ClientOnly>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Modals -->
  <USlideover v-model:open="isPlanEditorOpen" title="Plan details">
    <template #content>
      <div v-if="draftPlan" class="space-y-6 p-6">
        <UFormField label="Plan name"><UInput v-model="draftPlan.name" /></UFormField>
        <UFormField label="Description"><UInput v-model="draftPlan.description" /></UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Difficulty"
            ><UInput v-model.number="draftPlan.difficulty" type="number" min="1" max="10"
          /></UFormField>
          <UFormField label="Strategy"
            ><UInput :model-value="draftPlan.strategy || 'Unset'" disabled
          /></UFormField>
        </div>
        <div
          class="flex items-center justify-between rounded-2xl border border-default/80 bg-muted/20 p-4"
        >
          <div><div class="text-sm font-bold text-highlighted">Public blueprint</div></div>
          <USwitch v-model="draftPlan.isPublic" />
        </div>
        <div class="flex justify-end gap-2">
          <UButton color="primary" @click="isPlanEditorOpen = false">Apply</UButton>
        </div>
      </div>
    </template>
  </USlideover>

  <UModal v-model:open="isBlockEditorOpen" title="Edit block">
    <template #body>
      <div v-if="editingBlock" class="space-y-4">
        <UFormField label="Block name"><UInput v-model="editingBlock.name" /></UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Block type"
            ><USelect v-model="editingBlock.type" :items="blockTypeOptions"
          /></UFormField>
          <UFormField label="Primary focus"
            ><UInput v-model="editingBlock.primaryFocus"
          /></UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="primary" @click="applyBlockEditor">Apply</UButton>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="isWeekEditorOpen" title="Edit week">
    <template #body>
      <div v-if="editingWeek" class="space-y-4">
        <UFormField label="Week title / focus"><UInput v-model="editingWeek.focus" /></UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Volume target (min)"
            ><UInput v-model.number="editingWeek.volumeTargetMinutes" type="number"
          /></UFormField>
          <UFormField label="TSS target"
            ><UInput v-model.number="editingWeek.tssTarget" type="number"
          /></UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="primary" @click="applyWeekEditor">Apply</UButton>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="isWorkoutEditorOpen" title="Edit workout">
    <template #body>
      <div v-if="editingWorkout" class="space-y-4">
        <UFormField label="Workout title"><UInput v-model="editingWorkout.title" /></UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Type"><UInput v-model="editingWorkout.type" /></UFormField>
          <UFormField label="Category"><UInput v-model="editingWorkout.category" /></UFormField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Minutes"
            ><UInput v-model.number="editingWorkout.durationMinutes" type="number"
          /></UFormField>
          <UFormField label="TSS"
            ><UInput v-model.number="editingWorkout.tss" type="number"
          /></UFormField>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between gap-2">
        <UButton
          color="error"
          variant="ghost"
          @click="
            removeWorkout(editingWorkoutTarget!.weekId, editingWorkout.id)
            isWorkoutEditorOpen = false
          "
          >Remove</UButton
        >
        <UButton color="primary" @click="applyWorkoutEditor">Apply</UButton>
      </div>
    </template>
  </UModal>

  <USlideover v-model:open="isUtilityPanelOpen" title="Utility panel" side="right">
    <template #content>
      <div class="h-full overflow-y-auto p-4">
        <PlanArchitectLibrarySidebar :quick-stats="sidebarStats" :planning-tips="planningTips" />
      </div>
    </template>
  </USlideover>

  <ClientOnly>
    <PlanArchitectWorkoutDrawer
      :open="isWorkoutDrawerOpen"
      :templates="workoutTemplates || []"
      :loading="workoutTemplateStatus === 'pending'"
      :error="workoutTemplateStatus === 'error'"
      @toggle="isWorkoutDrawerOpen = !isWorkoutDrawerOpen"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
  import PlanArchitectTimelineChart from '~/components/plans/PlanArchitectTimelineChart.vue'
  import PlanArchitectWorkoutDrawer from '~/components/plans/PlanArchitectWorkoutDrawer.vue'
  import PlanArchitectBlockTable from '~/components/plans/PlanArchitectBlockTable.vue'
  import PlanArchitectBoard from '~/components/plans/PlanArchitectBoard.vue'
  import PlanArchitectLibrarySidebar from '~/components/plans/PlanArchitectLibrarySidebar.vue'
  import { usePlanArchitect } from '~/composables/usePlanArchitect'

  const route = useRoute()
  const planId = route.params.id as string
  const toast = useToast()

  const {
    DAYS,
    blockTypeOptions,
    loading,
    saving,
    isWorkoutDrawerOpen,
    dragOverDayKey,
    draftPlan,
    activeWeekId,
    viewMode,
    chartMetric,
    selectedChartWeekId,
    collapsedBlockIds,
    expandedAnalyticsBlockIds,
    isPlanEditorOpen,
    isUtilityPanelOpen,
    isBlockEditorOpen,
    isWeekEditorOpen,
    isWorkoutEditorOpen,
    editingBlock,
    editingWeek,
    editingWorkout,
    editingWorkoutTarget,
    workoutTemplates,
    workoutTemplateStatus,
    sortedBlocks,
    totalWeeks,
    totalWorkouts,
    totalTargetMinutes,
    totalTargetTss,
    hasUnsavedChanges,
    refreshWorkoutTemplates,
    addBlock,
    removeBlock,
    openBlockEditor,
    applyBlockEditor,
    openWeekEditor,
    applyWeekEditor,
    addWeekToBlock,
    duplicateWeek,
    addWorkout,
    addWorkoutFromTemplate,
    removeWorkout,
    openWorkoutEditor,
    applyWorkoutEditor,
    savePlan,
    findWeek,
    findBlock,
    orderedWeeks
  } = usePlanArchitect(planId)

  function formatMinutes(minutes: number) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const remainder = safeMinutes % 60
    if (!hours) return `${remainder}m`
    if (!remainder) return `${hours}h`
    return `${hours}h ${remainder}m`
  }

  // Page Specific Analytics & Helpers
  const weekAnalytics = computed(() => {
    let globalWeek = 1
    return sortedBlocks.value.flatMap((block: any) => {
      return orderedWeeks(block).map((week: any) => {
        const scheduledMinutes = (week.workouts || []).reduce(
          (sum: number, w: any) => sum + Math.round((w.durationSec || 0) / 60),
          0
        )
        const scheduledTss = (week.workouts || []).reduce(
          (sum: number, w: any) => sum + Math.round(w.tss || 0),
          0
        )
        return {
          weekId: week.id,
          weekNumber: globalWeek++,
          weekFocus: week.focus || 'Untitled',
          blockId: block.id,
          blockName: block.name,
          blockType: block.type,
          targetMinutes: Number(week.volumeTargetMinutes) || 0,
          scheduledMinutes,
          targetTss: Number(week.tssTarget) || 0,
          scheduledTss,
          workoutCount: (week.workouts || []).length
        }
      })
    })
  })

  const blockAnalytics = computed(() => {
    return sortedBlocks.value.map((block) => {
      const relatedWeeks = weekAnalytics.value.filter((w) => w.blockId === block.id)
      return {
        blockId: block.id,
        blockName: block.name,
        blockType: block.type,
        startWeekNumber: relatedWeeks[0]?.weekNumber || 0,
        endWeekNumber: relatedWeeks[relatedWeeks.length - 1]?.weekNumber || 0,
        weekCount: block.weeks?.length || 0,
        targetMinutes: relatedWeeks.reduce((s, w) => s + w.targetMinutes, 0),
        scheduledMinutes: relatedWeeks.reduce((s, w) => s + w.scheduledMinutes, 0),
        targetTss: relatedWeeks.reduce((s, w) => s + w.targetTss, 0),
        scheduledTss: relatedWeeks.reduce((s, w) => s + w.scheduledTss, 0),
        workoutCount: relatedWeeks.reduce((s, w) => s + w.workoutCount, 0)
      }
    })
  })

  const selectedWeekAnalytics = computed(
    () =>
      weekAnalytics.value.find((w) => w.weekId === selectedChartWeekId.value) ||
      weekAnalytics.value[0] ||
      null
  )

  const selectedWeekBreakdown = computed(() => {
    const selected = selectedWeekAnalytics.value
    if (!selected || !draftPlan.value) return []

    const classify = (w: any) => {
      const f = `${w.type || ''} ${w.category || ''}`.toUpperCase()
      if (f.includes('RUN')) return 'Run'
      if (f.includes('RIDE') || f.includes('BIKE') || f.includes('CYCLE')) return 'Ride'
      if (f.includes('GYM') || f.includes('STRENGTH')) return 'Gym'
      if (f.includes('REST') || f.includes('RECOVERY')) return 'Rest/Recovery'
      return 'Other'
    }

    const week = findWeek(selected.weekId)
    const workouts = week?.workouts || []
    const buckets = workouts.reduce((acc: any, w: any) => {
      const label = classify(w)
      if (!acc[label]) acc[label] = { count: 0, minutes: 0 }
      acc[label].count++
      acc[label].minutes += Math.round((w.durationSec || 0) / 60)
      return acc
    }, {})

    const colorMap: any = {
      Run: 'success',
      Ride: 'info',
      Gym: 'secondary',
      'Rest/Recovery': 'warning',
      Other: 'neutral'
    }

    return ['Run', 'Ride', 'Gym', 'Rest/Recovery', 'Other']
      .map((label) => ({
        label,
        count: buckets[label]?.count || 0,
        minutes: buckets[label]?.minutes || 0,
        color: colorMap[label] || 'neutral'
      }))
      .filter((b) => b.count > 0)
  })

  const headlineMetrics = computed(() => [
    { label: 'Difficulty', value: draftPlan.value?.difficulty || 1 },
    { label: 'Strategy', value: draftPlan.value?.strategy || 'Unset' },
    { label: 'Minutes', value: totalTargetMinutes.value },
    { label: 'TSS', value: totalTargetTss.value }
  ])

  const sidebarStats = computed(() => [
    { label: 'Blueprint status', value: draftPlan.value?.isPublic ? 'Public' : 'Private' },
    {
      label: 'Average weekly volume',
      value: totalWeeks.value
        ? `${Math.round(totalTargetMinutes.value / totalWeeks.value)} min`
        : '0 min'
    }
  ])

  const planningTips = [
    'Use each block to communicate the why of the phase.',
    'Check scheduled totals against weekly targets.'
  ]

  const chartBlockRanges = computed(() => {
    return blockAnalytics.value
      .map((block) => ({
        blockId: block.blockId,
        blockName: block.blockName,
        blockType: block.blockType,
        startIndex: weekAnalytics.value.findIndex((w) => w.blockId === block.blockId),
        endIndex:
          weekAnalytics.value.length -
          1 -
          [...weekAnalytics.value].reverse().findIndex((w) => w.blockId === block.blockId)
      }))
      .filter((b) => b.startIndex >= 0)
  })

  // Local View Logic
  function toggleBlockCollapsed(blockId: string) {
    collapsedBlockIds.value = collapsedBlockIds.value.includes(blockId)
      ? collapsedBlockIds.value.filter((id) => id !== blockId)
      : [...collapsedBlockIds.value, blockId]
  }

  function toggleAnalyticsBlockExpanded(blockId: string) {
    expandedAnalyticsBlockIds.value = expandedAnalyticsBlockIds.value.includes(blockId)
      ? expandedAnalyticsBlockIds.value.filter((id) => id !== blockId)
      : [...expandedAnalyticsBlockIds.value, blockId]
  }

  async function handleChartWeekSelect(weekId: string) {
    selectedChartWeekId.value = weekId
    activeWeekId.value = weekId
  }

  async function scrollToWeek(weekId: string) {
    activeWeekId.value = weekId
    if (viewMode.value === 'board') {
      await nextTick()
      const el = document.getElementById(`architect-week-${weekId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function updateWeekTarget(weekId: string, field: string, value: number) {
    const week = findWeek(weekId)
    if (week) week[field] = value
  }

  function isWorkoutInLibrary(workout: any) {
    return (workoutTemplates.value || []).some((t: any) => t.title === workout.title)
  }

  async function copyWorkoutToLibrary(workout: any) {
    try {
      await $fetch('/api/library/workouts', {
        method: 'POST',
        body: { ...workout, id: undefined }
      })
      await refreshWorkoutTemplates()
      toast.add({ title: 'Copied to library', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Copy failed', color: 'error' })
    }
  }

  // Drag and Drop
  function onArchitectDayDragOver(weekId: string, dayIndex: number) {
    dragOverDayKey.value = `${weekId}:${dayIndex}`
  }
  function onArchitectDayDragLeave() {
    dragOverDayKey.value = null
  }
  function onArchitectDayDrop(weekId: string, dayIndex: number, event: DragEvent) {
    dragOverDayKey.value = null
    const data = event.dataTransfer?.getData('application/json')
    if (data) {
      const { template } = JSON.parse(data)
      addWorkoutFromTemplate(weekId, dayIndex, template)
    }
  }
</script>
