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
            <div class="flex flex-wrap items-center justify-end gap-2">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-heroicons-squares-2x2"
                @click="isUtilityPanelOpen = true"
              >
                <span class="sm:hidden">Tools</span>
                <span class="hidden sm:inline">Utility panel</span>
              </UButton>
              <UBadge v-if="hasUnsavedChanges" color="warning" variant="soft" size="sm"
                >Unsaved</UBadge
              >
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-heroicons-pencil-square"
                @click="isPlanEditorOpen = true"
              >
                <span class="sm:hidden">Edit</span>
                <span class="hidden sm:inline">Edit details</span>
              </UButton>
              <UButton
                color="primary"
                size="sm"
                icon="i-heroicons-cloud-arrow-up"
                :loading="saving"
                :disabled="!hasUnsavedChanges"
                @click="savePlan"
              >
                <span class="sm:hidden">Save</span>
                <span class="hidden sm:inline">Save changes</span>
              </UButton>
            </div>
          </ClientOnly>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="min-h-full bg-default">
        <ClientOnly>
          <div class="px-0 py-4 sm:p-6">
            <div v-if="loading" class="space-y-4">
              <UCard v-for="i in 4" :key="i" :ui="{ body: 'p-5' }">
                <USkeleton class="h-28 w-full" />
              </UCard>
            </div>

            <div v-else-if="!draftPlan">
              <div class="space-y-4">
                <UAlert
                  color="error"
                  variant="soft"
                  title="Blueprint not found"
                  description="The requested training plan could not be loaded."
                />
                <div class="flex flex-wrap gap-3">
                  <UButton
                    color="primary"
                    icon="i-heroicons-plus"
                    :loading="isImportingPlan"
                    @click="importPlanToLibrary"
                  >
                    Add to my library
                  </UButton>
                  <UButton color="neutral" variant="ghost" @click="navigateTo('/library/plans')">
                    Back to library
                  </UButton>
                </div>
              </div>
            </div>

            <div v-else class="space-y-6 pb-32">
              <!-- Unified Header & Analytics Section -->
              <section
                class="rounded-none border-y border-default/80 bg-default/95 px-4 py-5 shadow-sm sm:rounded-3xl sm:border sm:p-6"
              >
                <!-- Top Row: Title & Stats -->
                <div
                  class="flex flex-col gap-5 border-b border-default/60 pb-5 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div class="min-w-0 space-y-1.5">
                    <h2 class="text-2xl font-black tracking-tight text-highlighted sm:truncate">
                      {{ draftPlan.name }}
                    </h2>
                  </div>

                  <div class="flex w-full flex-col gap-4 lg:w-auto lg:gap-5">
                    <!-- Headline metrics -->
                    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden xl:grid-cols-4">
                      <div
                        v-for="metric in headlineMetrics"
                        :key="metric.label"
                        class="rounded-2xl border border-default/70 bg-muted/20 px-3 py-2.5"
                      >
                        <div class="min-w-0">
                          <div class="text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                            {{ metric.label }}
                          </div>
                          <div
                            class="mt-1 truncate text-sm font-bold leading-none text-highlighted"
                          >
                            {{ metric.value }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-5">
                      <div
                        v-for="(metric, i) in headlineMetrics"
                        :key="`desktop-${metric.label}`"
                        class="flex items-center gap-5"
                      >
                        <div v-if="i > 0" class="h-6 w-px bg-default/60" />
                        <div class="min-w-0">
                          <div class="text-[9px] font-black uppercase tracking-[0.18em] text-muted">
                            {{ metric.label }}
                          </div>
                          <div class="mt-1 text-sm font-bold leading-none text-highlighted">
                            {{ metric.value }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end"
                    >
                      <!-- Chart metric toggle -->
                      <div
                        class="inline-flex w-full items-center rounded-xl border border-default bg-muted/30 p-1 sm:w-auto"
                      >
                        <UButton
                          :color="chartMetric === 'tss' ? 'primary' : 'neutral'"
                          :variant="chartMetric === 'tss' ? 'soft' : 'ghost'"
                          size="sm"
                          class="flex-1 sm:flex-none"
                          @click="chartMetric = 'tss'"
                          >TSS</UButton
                        >
                        <UButton
                          :color="chartMetric === 'minutes' ? 'primary' : 'neutral'"
                          :variant="chartMetric === 'minutes' ? 'soft' : 'ghost'"
                          size="sm"
                          class="flex-1 sm:flex-none"
                          @click="chartMetric = 'minutes'"
                          >Minutes</UButton
                        >
                      </div>

                      <div class="mx-1 hidden h-6 w-px bg-default/60 sm:block" />

                      <!-- View switcher -->
                      <div
                        class="inline-flex w-full items-center rounded-xl border border-default bg-muted/30 p-1 sm:w-auto"
                      >
                        <UButton
                          :color="viewMode === 'board' ? 'primary' : 'neutral'"
                          :variant="viewMode === 'board' ? 'soft' : 'ghost'"
                          size="sm"
                          icon="i-heroicons-calendar-days"
                          class="flex-1 sm:flex-none"
                          @click="viewMode = 'board'"
                        >
                          <span class="sm:hidden">Board</span>
                          <span class="hidden sm:inline">Weekly board</span>
                        </UButton>
                        <UButton
                          :color="viewMode === 'table' ? 'primary' : 'neutral'"
                          :variant="viewMode === 'table' ? 'soft' : 'ghost'"
                          size="sm"
                          icon="i-heroicons-table-cells"
                          class="flex-1 sm:flex-none"
                          @click="viewMode = 'table'"
                        >
                          <span class="sm:hidden">Table</span>
                          <span class="hidden sm:inline">Plan table</span>
                        </UButton>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Chart Area -->
                <div class="mt-6">
                  <PlanArchitectTimelineChart
                    :metric="chartMetric"
                    :weeks="weekAnalytics"
                    :block-ranges="chartBlockRanges"
                    :selected-week-id="selectedChartWeekId"
                    @select-week="handleChartWeekSelect"
                  />
                </div>
              </section>

              <!-- Table / Board View Switcher Area -->
              <section v-if="viewMode === 'table'" class="space-y-6">
                <div class="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
                  <PlanArchitectBlockTable
                    :block-analytics="blockAnalytics"
                    :week-analytics="weekAnalytics"
                    :expanded-ids="expandedAnalyticsBlockIds"
                    :selected-week-id="selectedChartWeekId"
                    :sorted-blocks="sortedBlocks"
                    @toggle-expanded="toggleAnalyticsBlockExpanded"
                    @edit-block="(id) => openBlockEditor(findBlock(id))"
                    @select-week="handleChartWeekSelect"
                    @add-week="addWeekToBlock"
                    @add-block="addBlock"
                    @add-day-item="createAndEditDayItem"
                    @update-week-target="updateWeekTarget"
                    @table-workout-drop="handleTableWorkoutDrop"
                  />

                  <!-- Selected Week Summary Card -->
                  <div
                    class="rounded-none border-y border-default/70 bg-muted/10 px-4 py-5 sm:rounded-2xl sm:border sm:p-5"
                  >
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
                            {{ selectedWeekAnalytics.focus || selectedWeekAnalytics.weekFocus }}
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
                                {{ bucket.count }} item{{ bucket.count === 1 ? '' : 's' }} •
                                {{ formatMinutes(bucket.minutes) }}
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
                v-else-if="viewMode === 'board'"
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
                @add-workout="
                  (weekId, dayIndex) => createAndEditDayItem(weekId, dayIndex, 'workout')
                "
                @add-note="(weekId, dayIndex) => createAndEditDayItem(weekId, dayIndex, 'note')"
                @edit-workout="openWorkoutEditor"
                @remove-workout="removeWorkout"
                @copy-to-library="copyWorkoutToLibrary"
                @dragover="onArchitectDayDragOver"
                @dragleave="onArchitectDayDragLeave"
                @drop="onArchitectDayDrop"
              />
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
      <div v-if="draftPlan" class="flex flex-col h-full">
        <div class="flex-1 overflow-y-auto p-6 space-y-8">
          <!-- General Info Section -->
          <section class="space-y-4">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              General Identity
            </div>
            <UFormField label="Blueprint name" help="Give your plan a clear, searchable name.">
              <UInput
                v-model="draftPlan.name"
                placeholder="e.g. 12-Week Polarized Base"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Description" help="Briefly explain the goal and methodology.">
              <UTextarea
                v-model="draftPlan.description"
                :rows="3"
                placeholder="Describe the progression..."
                class="w-full"
              />
            </UFormField>
          </section>

          <!-- Strategy & Methodology Section -->
          <section class="space-y-4 pt-4 border-t border-default/60">
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
              Methodology
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Training Strategy" help="Method used for progression.">
                <USelect
                  v-model="draftPlan.strategy"
                  :items="['LINEAR', 'POLARIZED', 'PYRAMIDAL', 'BASE_BUILD_PEAK', 'REVERSE_LINEAR']"
                />
              </UFormField>
              <UFormField label="Recovery Rhythm" help="Weeks between recovery phases.">
                <UInput v-model.number="draftPlan.recoveryRhythm" type="number" min="1" max="6" />
              </UFormField>
            </div>
            <UFormField label="Difficulty (1-10)" help="Perceived exertion over the entire plan.">
              <div class="flex items-center gap-4">
                <USlider v-model.number="draftPlan.difficulty" :min="1" :max="10" class="flex-1" />
                <span class="text-sm font-bold text-highlighted w-4 text-center">{{
                  draftPlan.difficulty
                }}</span>
              </div>
            </UFormField>
          </section>

          <PlanPublicationSettings
            v-model:plan="draftPlan"
            :week-options="publicationWeekOptions"
          />
        </div>

        <div class="p-6 border-t border-default/60 bg-muted/5 flex justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="isPlanEditorOpen = false"
            >Cancel</UButton
          >
          <UButton color="primary" @click="isPlanEditorOpen = false">Apply changes</UButton>
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

  <UModal
    v-model:open="isWorkoutEditorOpen"
    :title="editingWorkout?.category === 'Note' ? 'Edit note' : 'Edit workout'"
  >
    <template #body>
      <div v-if="editingWorkout" class="space-y-6">
        <div
          class="-mx-4 flex items-start gap-3 rounded-none border-y border-default/70 bg-muted/15 px-4 py-4 sm:mx-0 sm:rounded-2xl sm:border sm:p-4"
          :class="isEditingNote ? 'border-amber-500/20 bg-amber-500/5' : ''"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            :class="isEditingNote ? 'bg-amber-500/10 text-amber-300' : 'bg-primary/10 text-primary'"
          >
            <UIcon
              :name="isEditingNote ? 'i-heroicons-document-text' : 'i-tabler-bike'"
              class="h-5 w-5"
            />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-bold text-highlighted">
              {{ isEditingNote ? 'Plan note' : 'Planned workout' }}
            </div>
            <div class="mt-1 text-[12px] leading-5 text-muted">
              {{
                isEditingNote
                  ? 'Use notes for reminders, logistics, race cues, or coach instructions that should sit beside workouts in the week.'
                  : 'Edit the scheduled workout details, training load, and activity metadata for this day.'
              }}
            </div>
          </div>
        </div>

        <div
          v-if="isEditingNote"
          class="-mx-4 space-y-4 rounded-none border-y border-default/70 bg-default/70 px-4 py-4 sm:mx-0 sm:rounded-2xl sm:border sm:bg-default sm:p-4"
        >
          <UFormField label="Title" help="Keep it short so it scans well in the week view.">
            <UInput v-model="editingWorkout.title" placeholder="Race week reminder" />
          </UFormField>
          <UFormField label="Body" help="This text is shown directly on the note card.">
            <UTextarea
              v-model="editingWorkout.description"
              :rows="8"
              autoresize
              placeholder="Add context, reminders, travel details, cues, or coaching notes..."
            />
          </UFormField>
        </div>

        <div v-else class="space-y-5">
          <section
            class="-mx-4 space-y-4 rounded-none border-y border-default/70 bg-default/70 px-4 py-4 sm:mx-0 sm:rounded-2xl sm:border sm:bg-default sm:p-4"
          >
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Identity</div>
            <UFormField label="Workout title" help="This is what appears on the weekly board.">
              <UInput v-model="editingWorkout.title" placeholder="Tempo builder" />
            </UFormField>
            <UFormField label="Description" help="Optional context or execution notes.">
              <UTextarea
                v-model="editingWorkout.description"
                :rows="4"
                autoresize
                placeholder="Add focus, interval goals, or execution notes..."
              />
            </UFormField>
          </section>

          <section
            class="-mx-4 space-y-4 rounded-none border-y border-default/70 bg-default/70 px-4 py-4 sm:mx-0 sm:rounded-2xl sm:border sm:bg-default sm:p-4"
          >
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Metadata</div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Type">
                <USelect v-model="editingWorkout.type" :items="workoutTypeItems" />
              </UFormField>
              <UFormField label="Category">
                <UInput v-model="editingWorkout.category" placeholder="Workout" />
              </UFormField>
            </div>
          </section>

          <section
            class="-mx-4 space-y-4 rounded-none border-y border-default/70 bg-default/70 px-4 py-4 sm:mx-0 sm:rounded-2xl sm:border sm:bg-default sm:p-4"
          >
            <div class="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Load</div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Minutes">
                <UInput
                  v-model.number="editingWorkout.durationMinutes"
                  type="number"
                  min="0"
                  placeholder="60"
                />
              </UFormField>
              <UFormField label="TSS">
                <UInput
                  v-model.number="editingWorkout.tss"
                  type="number"
                  min="0"
                  placeholder="50"
                />
              </UFormField>
            </div>
          </section>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <UButton
          color="error"
          variant="ghost"
          icon="i-heroicons-trash"
          @click="handleRemoveWorkout"
        >
          {{ isEditingNote ? 'Delete note' : 'Remove workout' }}
        </UButton>
        <div class="flex flex-col gap-2 sm:flex-row">
          <UButton color="neutral" variant="ghost" @click="saveEditingWorkoutToLibrary">
            {{ isEditingNote ? 'Save note to library' : 'Save workout to library' }}
          </UButton>
          <UButton color="primary" icon="i-heroicons-check" @click="applyWorkoutEditor">
            {{ isEditingNote ? 'Save note' : 'Save workout' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <USlideover v-model:open="isUtilityPanelOpen" title="Utility panel" side="right">
    <template #content>
      <div class="h-full overflow-y-auto p-0 sm:p-4">
        <PlanArchitectUtilityPanel
          v-if="draftPlan"
          v-model:coach-notes="draftPlan.coachNotes"
          v-model:athlete-notes="draftPlan.athleteNotes"
          :stats="utilityPanelStats"
        />
      </div>
    </template>
  </USlideover>

  <ClientOnly>
    <PlanArchitectWorkoutDrawer
      :open="isWorkoutDrawerOpen"
      :templates="workoutTemplates || []"
      :loading="workoutTemplateStatus === 'pending'"
      :error="workoutTemplateStatus === 'error'"
      :library-source="librarySource"
      :is-coaching-mode="isCoachingLibraryMode"
      @toggle="isWorkoutDrawerOpen = !isWorkoutDrawerOpen"
      @update:library-source="librarySource = $event"
      @created="refreshWorkoutTemplates"
    />
  </ClientOnly>
</template>

<script setup lang="ts">
  import PlanArchitectTimelineChart from '~/components/plans/PlanArchitectTimelineChart.vue'
  import PlanArchitectWorkoutDrawer from '~/components/plans/PlanArchitectWorkoutDrawer.vue'
  import PlanArchitectBlockTable from '~/components/plans/PlanArchitectBlockTable.vue'
  import PlanArchitectBoard from '~/components/plans/PlanArchitectBoard.vue'
  import PlanPublicationSettings from '~/components/plans/PlanPublicationSettings.vue'
  import PlanArchitectUtilityPanel from '~/components/plans/PlanArchitectUtilityPanel.vue'
  import { usePlanArchitect } from '~/composables/usePlanArchitect'
  import { useLibrarySource } from '~/composables/useLibrarySource'

  const route = useRoute()
  const planId = route.params.id as string
  const toast = useToast()
  const { isCoachingMode: isCoachingLibraryMode } = useLibrarySource(`plan-architect:${planId}`)
  const isImportingPlan = ref(false)

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
    librarySource,
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
    addNote,
    addWorkoutFromTemplate,
    moveWorkout,
    removeWorkout,
    openWorkoutEditor,
    applyWorkoutEditor,
    savePlan,
    findWeek,
    findBlock,
    orderedWeeks
  } = usePlanArchitect(planId)

  async function importPlanToLibrary() {
    if (isImportingPlan.value) return

    isImportingPlan.value = true
    try {
      const imported: any = await $fetch(`/api/library/plans/${planId}/import`, {
        method: 'POST'
      })
      toast.add({
        title: imported.imported ? 'Plan added to your library' : 'Plan opened from your library',
        color: 'success'
      })
      await navigateTo(`/library/plans/${imported.planId}/architect`)
    } catch (error: any) {
      toast.add({
        title: 'Could not add plan to library',
        description: error?.data?.message || 'Please try again.',
        color: 'error'
      })
    } finally {
      isImportingPlan.value = false
    }
  }

  function formatMinutes(minutes: number) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const remainder = safeMinutes % 60
    if (!hours) return `${remainder}m`
    if (!remainder) return `${hours}h`
    return `${hours}h ${remainder}m`
  }

  const isEditingNote = computed(
    () => editingWorkout.value?.category === 'Note' || editingWorkout.value?.type === 'Note'
  )

  const workoutTypeItems = ['Ride', 'Run', 'Swim', 'WeightTraining', 'Workout', 'Recovery']

  // Page Specific Analytics & Helpers
  const classifyWorkout = (w: any) => {
    const f = `${w.type || ''} ${w.category || ''}`.toUpperCase()
    if (f.includes('NOTE')) return 'Notes'
    if (f.includes('RUN')) return 'Run'
    if (f.includes('RIDE') || f.includes('BIKE') || f.includes('CYCLE')) return 'Ride'
    if (f.includes('GYM') || f.includes('STRENGTH')) return 'Gym'
    if (f.includes('REST') || f.includes('RECOVERY')) return 'Rest/Recovery'
    return 'Other'
  }

  const weekAnalytics = computed(() => {
    let globalWeek = 1
    return sortedBlocks.value.flatMap((block: any) => {
      return orderedWeeks(block).map((week: any) => {
        const workouts = week.workouts || []
        const scheduledMinutes = workouts.reduce(
          (sum: number, w: any) => sum + Math.round((w.durationSec || 0) / 60),
          0
        )
        const scheduledTss = workouts.reduce(
          (sum: number, w: any) => sum + Math.round(w.tss || 0),
          0
        )

        // Calculate type breakdown for stacked chart
        const activityLabels = ['Run', 'Ride', 'Gym', 'Rest/Recovery', 'Notes', 'Other']
        const breakdown = activityLabels.map((label) => ({
          label,
          count: 0,
          minutes: 0,
          tss: 0
        }))

        workouts.forEach((w: any) => {
          const label = classifyWorkout(w)
          const entry = breakdown.find((b) => b.label === label) ?? breakdown[breakdown.length - 1]!
          entry.count++
          entry.minutes += Math.round((w.durationSec || 0) / 60)
          entry.tss += Math.round(w.tss || 0)
        })

        return {
          weekId: week.id,
          weekNumber: globalWeek++,
          focus: week.focus,
          weekFocus: week.focus || 'Untitled',
          blockId: block.id,
          blockName: block.name,
          blockType: block.type,
          targetMinutes: Number(week.volumeTargetMinutes) || 0,
          scheduledMinutes,
          targetTss: Number(week.tssTarget) || 0,
          scheduledTss,
          workoutCount: workouts.length,
          typeBreakdown: breakdown
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

    const week = findWeek(selected.weekId)
    const workouts = week?.workouts || []
    const buckets = workouts.reduce((acc: any, w: any) => {
      const label = classifyWorkout(w)
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
      Notes: 'warning',
      Other: 'neutral'
    }

    return ['Run', 'Ride', 'Gym', 'Rest/Recovery', 'Notes', 'Other']
      .map((label) => ({
        label,
        count: buckets[label]?.count || 0,
        minutes: buckets[label]?.minutes || 0,
        color: colorMap[label] || 'neutral'
      }))
      .filter((b) => b.count > 0)
  })

  const headlineMetrics = computed(() => [
    { label: 'Blocks', value: sortedBlocks.value.length },
    { label: 'Weeks', value: totalWeeks.value },
    { label: 'Items', value: totalWorkouts.value },
    { label: 'Difficulty', value: draftPlan.value?.difficulty || 1 },
    { label: 'Strategy', value: draftPlan.value?.strategy || 'Unset' },
    { label: 'Minutes', value: totalTargetMinutes.value },
    { label: 'TSS', value: totalTargetTss.value }
  ])

  const utilityPanelStats = computed(() => {
    const disciplineBreakdown: Record<string, number> = {
      Run: 0,
      Ride: 0,
      Gym: 0,
      'Rest/Recovery': 0,
      Notes: 0,
      Other: 0
    }

    weekAnalytics.value.forEach((w: any) => {
      w.typeBreakdown.forEach((b: any) => {
        disciplineBreakdown[b.label] += b.count
      })
    })

    return {
      totalWeeks: totalWeeks.value,
      totalWorkouts: totalWorkouts.value,
      avgWeeklyMinutes: totalWeeks.value ? totalTargetMinutes.value / totalWeeks.value : 0,
      avgWeeklyTss: totalWeeks.value ? totalTargetTss.value / totalWeeks.value : 0,
      workoutDensity: totalWeeks.value ? totalWorkouts.value / totalWeeks.value : 0,
      disciplineBreakdown
    }
  })

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

  const publicationWeekOptions = computed(() =>
    sortedBlocks.value.flatMap((block: any) =>
      orderedWeeks(block).map((week: any) => ({
        id: week.id,
        label: `Week ${week.weekNumber}${week.focus ? ` - ${week.focus}` : ''}`,
        blockName: block.name
      }))
    )
  )

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

  function createAndEditDayItem(
    weekId: string,
    dayIndex: number,
    kind: 'workout' | 'note' = 'workout'
  ) {
    const item = kind === 'note' ? addNote(weekId, dayIndex) : addWorkout(weekId, dayIndex)
    if (item) {
      openWorkoutEditor(weekId, dayIndex, item)
    }
  }

  function handleRemoveWorkout() {
    if (editingWorkout.value && editingWorkoutTarget.value) {
      removeWorkout(editingWorkoutTarget.value.weekId, editingWorkout.value.id)
      isWorkoutEditorOpen.value = false
    }
  }

  function isWorkoutInLibrary(workout: any) {
    return (workoutTemplates.value || []).some(
      (t: any) =>
        t.title === workout.title && String(t.category || '') === String(workout.category || '')
    )
  }

  async function copyWorkoutToLibrary(workout: any) {
    try {
      await $fetch('/api/library/workouts', {
        method: 'POST',
        body: {
          title: workout.title,
          description: workout.description || undefined,
          type: workout.type,
          category: workout.category,
          durationSec: workout.durationSec,
          tss: workout.tss,
          structuredWorkout: workout.structuredWorkout || null
        }
      })
      await refreshWorkoutTemplates()
      toast.add({ title: 'Copied to library', color: 'success' })
    } catch (e) {
      toast.add({ title: 'Copy failed', color: 'error' })
    }
  }

  async function saveEditingWorkoutToLibrary() {
    if (!editingWorkout.value) return

    try {
      await $fetch('/api/library/workouts', {
        method: 'POST',
        body: {
          title: editingWorkout.value.title,
          description: editingWorkout.value.description || undefined,
          type: editingWorkout.value.type,
          category: editingWorkout.value.category,
          durationSec:
            editingWorkout.value.category === 'Note'
              ? 0
              : (Number(editingWorkout.value.durationMinutes) || 0) * 60,
          tss: editingWorkout.value.category === 'Note' ? 0 : Number(editingWorkout.value.tss) || 0,
          structuredWorkout:
            editingWorkout.value.category === 'Note'
              ? null
              : editingWorkout.value.structuredWorkout || null
        }
      })
      await refreshWorkoutTemplates()
      toast.add({ title: 'Saved to library', color: 'success' })
    } catch (error) {
      toast.add({ title: 'Save to library failed', color: 'error' })
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

  function handleTableWorkoutDrop(payload: { toWeekId: string; toDayIndex: number; data: string }) {
    const parsed = JSON.parse(payload.data)
    if (parsed.moveWorkout) {
      // Reorder: existing workout dragged to new day
      moveWorkout(parsed.fromWeekId, parsed.workoutId, payload.toWeekId, payload.toDayIndex)
    } else if (parsed.template) {
      // From drawer: add from library template
      addWorkoutFromTemplate(payload.toWeekId, payload.toDayIndex, parsed.template)
    }
  }
</script>
