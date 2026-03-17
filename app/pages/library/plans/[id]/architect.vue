<template>
  <UDashboardPanel id="plan-architect">
    <template #header>
      <UDashboardNavbar :title="draftPlan?.name || 'Plan Architect'">
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

        <template #right>
          <div class="flex items-center gap-2">
            <UBadge v-if="draftPlan?.isTemplate" color="primary" variant="soft" size="sm">
              Template
            </UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-squares-2x2"
              @click="isUtilityPanelOpen = true"
            >
              Utility panel
            </UButton>
            <UBadge v-if="hasUnsavedChanges" color="warning" variant="soft" size="sm">
              Unsaved
            </UBadge>
            <UButton
              color="neutral"
              variant="outline"
              size="sm"
              icon="i-heroicons-pencil-square"
              @click="isPlanEditorOpen = true"
            >
              Edit details
            </UButton>
            <UButton
              color="primary"
              size="sm"
              icon="i-heroicons-cloud-arrow-up"
              :loading="saving"
              :disabled="!hasUnsavedChanges"
              @click="savePlan"
            >
              Save changes
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="min-h-full bg-default">
        <div class="p-4 sm:p-6">
          <div class="space-y-6">
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
                <p class="mt-2 max-w-3xl text-sm text-muted">
                  Review the whole plan at a glance, tune weekly targets, and keep workouts readable
                  inside the board.
                </p>
              </div>

              <div
                class="flex flex-col gap-4 rounded-3xl border border-default/80 bg-default/90 p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between"
              >
                <div class="space-y-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge color="neutral" variant="soft" size="sm">
                      {{ sortedBlocks.length }} blocks
                    </UBadge>
                    <UBadge color="neutral" variant="soft" size="sm">
                      {{ totalWeeks }} weeks
                    </UBadge>
                    <UBadge color="neutral" variant="soft" size="sm">
                      {{ totalWorkouts }} workouts
                    </UBadge>
                    <UBadge
                      :color="draftPlan?.isPublic ? 'success' : 'neutral'"
                      variant="soft"
                      size="sm"
                    >
                      {{ draftPlan?.isPublic ? 'Public blueprint' : 'Private blueprint' }}
                    </UBadge>
                  </div>

                  <div v-if="draftPlan">
                    <h2 class="text-2xl font-black tracking-tight text-highlighted">
                      {{ draftPlan.name }}
                    </h2>
                    <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
                      {{ draftPlan.description || 'No description provided.' }}
                    </p>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div
                      v-for="metric in headlineMetrics"
                      :key="metric.label"
                      class="rounded-2xl border border-default/70 bg-muted/25 px-4 py-3"
                    >
                      <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                        {{ metric.label }}
                      </div>
                      <div class="mt-2 text-lg font-bold text-highlighted">{{ metric.value }}</div>
                      <div v-if="metric.hint" class="mt-1 text-[11px] text-muted">
                        {{ metric.hint }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex flex-col gap-3 lg:items-end">
                  <div
                    class="inline-flex items-center rounded-xl border border-default bg-muted/30 p-1"
                    role="tablist"
                    aria-label="Architect view mode"
                  >
                    <UButton
                      :color="viewMode === 'board' ? 'primary' : 'neutral'"
                      :variant="viewMode === 'board' ? 'soft' : 'ghost'"
                      size="sm"
                      icon="i-heroicons-calendar-days"
                      @click="setViewMode('board')"
                    >
                      Weekly board
                    </UButton>
                    <UButton
                      :color="viewMode === 'table' ? 'primary' : 'neutral'"
                      :variant="viewMode === 'table' ? 'soft' : 'ghost'"
                      size="sm"
                      icon="i-heroicons-table-cells"
                      @click="setViewMode('table')"
                    >
                      Plan table
                    </UButton>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <UButton
                      color="neutral"
                      variant="outline"
                      size="sm"
                      icon="i-heroicons-squares-2x2"
                      @click="isUtilityPanelOpen = true"
                    >
                      Open utility panel
                    </UButton>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      icon="i-heroicons-plus-circle"
                      @click="addBlock"
                    >
                      Add block
                    </UButton>
                  </div>
                </div>
              </div>
            </div>

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

            <div v-else-if="sortedBlocks.length === 0">
              <UAlert
                color="warning"
                variant="soft"
                title="No blocks found"
                description="This blueprint is ready for structure, but it does not contain any training blocks yet."
              />
            </div>

            <template v-else>
              <section
                class="rounded-3xl border border-default/80 bg-default/95 p-5 shadow-sm sm:p-6"
              >
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div class="text-[10px] font-black uppercase tracking-[0.24em] text-primary/80">
                      Plan Analytics
                    </div>
                    <h3 class="mt-2 text-2xl font-black tracking-tight text-highlighted">
                      Seasonal load timeline
                    </h3>
                    <p class="mt-2 max-w-3xl text-sm text-muted">
                      Compare target versus scheduled load across the full plan and jump into the
                      exact week that needs attention.
                    </p>
                  </div>

                  <div
                    class="inline-flex items-center rounded-xl border border-default bg-muted/30 p-1"
                    role="tablist"
                    aria-label="Architect chart metric"
                  >
                    <UButton
                      :color="chartMetric === 'tss' ? 'primary' : 'neutral'"
                      :variant="chartMetric === 'tss' ? 'soft' : 'ghost'"
                      size="sm"
                      @click="chartMetric = 'tss'"
                    >
                      TSS
                    </UButton>
                    <UButton
                      :color="chartMetric === 'minutes' ? 'primary' : 'neutral'"
                      :variant="chartMetric === 'minutes' ? 'soft' : 'ghost'"
                      size="sm"
                      @click="chartMetric = 'minutes'"
                    >
                      Minutes
                    </UButton>
                  </div>
                </div>

                <ClientOnly>
                  <div class="mt-6">
                    <PlanArchitectTimelineChart
                      :metric="chartMetric"
                      :weeks="weekAnalytics"
                      :block-ranges="chartBlockRanges"
                      :selected-week-id="selectedChartWeekId"
                      @select-week="handleChartWeekSelect"
                    />
                  </div>
                </ClientOnly>

                <div class="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
                  <div>
                    <div class="rounded-2xl border border-default/70 bg-muted/10">
                      <table class="w-full table-fixed text-[12px]">
                        <thead class="bg-muted/20">
                          <tr
                            class="text-left text-[9px] font-black uppercase tracking-[0.16em] text-muted"
                          >
                            <th class="px-3 py-2.5 w-[28%]">Block</th>
                            <th class="px-3 py-2.5 w-[10%]">Span</th>
                            <th class="px-3 py-2.5 w-[7%]">Wks</th>
                            <th class="px-3 py-2.5 w-[12%]">Tgt Min</th>
                            <th class="px-3 py-2.5 w-[12%]">Sch Min</th>
                            <th class="px-3 py-2.5 w-[10%]">Tgt TSS</th>
                            <th class="px-3 py-2.5 w-[12%]">Sch TSS</th>
                            <th class="px-3 py-2.5 w-[9%]">Sessions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="block in blockAnalytics"
                            :key="`analytics-${block.blockId}`"
                            class="border-t border-default/70"
                          >
                            <td class="px-3 py-2.5">
                              <div class="flex items-center gap-3 min-w-0">
                                <UBadge
                                  size="sm"
                                  variant="soft"
                                  :color="blockChrome({ type: block.blockType }).badgeColor"
                                >
                                  {{ block.blockType || 'Block' }}
                                </UBadge>
                                <div class="min-w-0">
                                  <div class="truncate text-[12px] font-semibold text-highlighted">
                                    {{ block.blockName }}
                                  </div>
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
                            <td class="px-3 py-2.5 text-[12px] text-highlighted whitespace-nowrap">
                              {{ block.workoutCount }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="rounded-2xl border border-default/70 bg-muted/10 p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                          Selected week
                        </div>
                        <div class="mt-2 text-xl font-black tracking-tight text-highlighted">
                          {{ selectedWeekAnalytics?.weekFocus || 'No week selected' }}
                        </div>
                        <div v-if="selectedWeekAnalytics" class="mt-1 text-sm text-muted">
                          {{ selectedWeekAnalytics.blockName }} • Week
                          {{ selectedWeekAnalytics.weekNumber }}
                        </div>
                      </div>
                      <UButton
                        v-if="selectedWeekAnalytics"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        icon="i-heroicons-arrow-right"
                        @click="openWeekInBoard(selectedWeekAnalytics.weekId)"
                      >
                        Open in board
                      </UButton>
                    </div>

                    <div v-if="selectedWeekAnalytics" class="mt-5 space-y-4">
                      <div class="grid grid-cols-2 gap-3">
                        <div class="rounded-xl border border-default/60 bg-default px-3 py-3">
                          <div
                            class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                          >
                            Minutes
                          </div>
                          <div class="mt-1 text-sm font-semibold text-highlighted">
                            {{ formatMinutes(selectedWeekAnalytics.scheduledMinutes) }} /
                            {{ formatMinutes(selectedWeekAnalytics.targetMinutes) }}
                          </div>
                          <div
                            class="mt-1 text-[11px]"
                            :class="deltaTone(selectedWeekAnalytics.minuteDelta)"
                          >
                            {{ formatSignedMinutes(selectedWeekAnalytics.minuteDelta) }} vs target
                          </div>
                        </div>
                        <div class="rounded-xl border border-default/60 bg-default px-3 py-3">
                          <div
                            class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                          >
                            TSS
                          </div>
                          <div class="mt-1 text-sm font-semibold text-highlighted">
                            {{ selectedWeekAnalytics.scheduledTss }} /
                            {{ selectedWeekAnalytics.targetTss }}
                          </div>
                          <div
                            class="mt-1 text-[11px]"
                            :class="deltaTone(selectedWeekAnalytics.tssDelta)"
                          >
                            {{ formatSignedTss(selectedWeekAnalytics.tssDelta) }} vs target
                          </div>
                        </div>
                      </div>

                      <div>
                        <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                          Weekly composition
                        </div>
                        <div class="mt-3 space-y-3">
                          <div
                            v-for="bucket in selectedWeekBreakdown"
                            :key="bucket.label"
                            class="space-y-1.5"
                          >
                            <div class="flex items-center justify-between gap-3 text-sm">
                              <div class="font-semibold text-highlighted">
                                {{ bucket.label }}
                              </div>
                              <div class="text-muted">
                                {{ bucket.count }} workout{{ bucket.count === 1 ? '' : 's' }} •
                                {{ formatMinutes(bucket.minutes) }}
                              </div>
                            </div>
                            <UProgress
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
                  </div>
                </div>
              </section>

              <section v-if="viewMode === 'board'" class="space-y-6">
                <article
                  v-for="block in sortedBlocks"
                  :key="block.id"
                  class="overflow-hidden rounded-3xl border bg-default shadow-sm transition-colors"
                  :class="blockChrome(block).card"
                >
                  <div class="border-b p-5 sm:p-6" :class="blockChrome(block).header">
                    <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div class="space-y-3">
                        <div class="flex flex-wrap items-center gap-2">
                          <UBadge size="sm" variant="solid" :color="blockChrome(block).badgeColor">
                            {{ block.type || 'BLOCK' }}
                          </UBadge>
                          <span
                            class="text-[10px] font-black uppercase tracking-[0.24em] text-muted"
                          >
                            Season phase {{ block.order }}
                          </span>
                        </div>

                        <div>
                          <h3 class="text-2xl font-black tracking-tight text-highlighted">
                            {{ block.name }}
                          </h3>
                          <p class="mt-1 text-sm text-muted">
                            {{ blockSummaryLabel(block) }}
                          </p>
                        </div>
                      </div>

                      <div class="flex flex-wrap gap-2">
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          :icon="
                            isBlockCollapsed(block.id)
                              ? 'i-heroicons-chevron-down'
                              : 'i-heroicons-chevron-up'
                          "
                          @click="toggleBlockCollapsed(block.id)"
                        >
                          {{ isBlockCollapsed(block.id) ? 'Expand' : 'Collapse' }}
                        </UButton>
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-heroicons-pencil-square"
                          @click="openBlockEditor(block)"
                        >
                          Edit
                        </UButton>
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-heroicons-trash"
                          @click="removeBlock(block.id)"
                        >
                          Remove
                        </UButton>
                      </div>
                    </div>
                  </div>

                  <div v-if="!isBlockCollapsed(block.id)" class="overflow-x-auto p-4 sm:p-6">
                    <div
                      class="hidden min-w-[1540px] overflow-hidden rounded-2xl border border-default/80 bg-default lg:grid"
                      style="grid-template-columns: 190px repeat(7, minmax(148px, 1fr)) 200px"
                    >
                      <div
                        class="border-b border-r border-default bg-muted/40 p-3 text-xs font-black uppercase tracking-[0.2em] text-muted"
                      >
                        Week
                      </div>
                      <div
                        v-for="dayName in DAYS"
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
                        <div
                          :id="weekRowId(week.id)"
                          class="group/rail relative flex min-h-[188px] flex-col justify-between border-r border-default p-3.5"
                          :class="weekRowSurface(week.weekNumber, week.id)"
                          @click="activeWeekId = week.id"
                        >
                          <div
                            v-if="activeWeekId === week.id"
                            class="pointer-events-none absolute inset-0 ring-2 ring-primary ring-inset"
                          />
                          <div class="space-y-3">
                            <div
                              class="text-[11px] font-black uppercase tracking-[0.24em] text-muted"
                            >
                              Week {{ week.weekNumber }}
                            </div>
                            <div
                              class="text-[18px] font-black leading-[1.05] tracking-tight text-highlighted xl:text-[19px]"
                            >
                              {{ weekFocusLabel(week) }}
                            </div>
                            <div class="text-xs text-muted">
                              {{ weekSummary(week).workoutCount }} scheduled session{{
                                weekSummary(week).workoutCount === 1 ? '' : 's'
                              }}
                            </div>
                          </div>

                          <div class="space-y-3">
                            <div class="grid gap-2">
                              <div
                                class="rounded-xl border border-default/70 bg-default/80 px-3 py-2"
                              >
                                <div
                                  class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                                >
                                  Target minutes
                                </div>
                                <div class="mt-1 text-xs font-semibold text-highlighted">
                                  {{ formatMinutes(week.volumeTargetMinutes || 0) }}
                                </div>
                              </div>
                              <div
                                class="rounded-xl border border-default/70 bg-default/80 px-3 py-2"
                              >
                                <div
                                  class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                                >
                                  Target TSS
                                </div>
                                <div class="mt-1 text-xs font-semibold text-highlighted">
                                  {{ week.tssTarget || 0 }} TSS
                                </div>
                              </div>
                            </div>

                            <div class="flex flex-wrap gap-1.5">
                              <UBadge color="neutral" variant="soft" size="sm">
                                {{ weekSummary(week).workoutCount }} session{{
                                  weekSummary(week).workoutCount === 1 ? '' : 's'
                                }}
                              </UBadge>
                            </div>

                            <div
                              class="flex flex-wrap gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/rail:opacity-100"
                            >
                              <UButton
                                color="neutral"
                                variant="ghost"
                                size="xs"
                                icon="i-heroicons-document-duplicate"
                                @click="duplicateWeek(block.id, week.id)"
                              >
                                Duplicate
                              </UButton>
                              <UButton
                                color="neutral"
                                variant="ghost"
                                size="xs"
                                icon="i-heroicons-pencil-square"
                                @click="openWeekEditor(block.id, week)"
                              >
                                Edit
                              </UButton>
                            </div>
                          </div>
                        </div>

                        <div
                          v-for="day in weekDays(week)"
                          :key="`${week.id}-${day.dayIndex}`"
                          class="flex min-h-[188px] flex-col border-r border-default p-2.5 last:border-r-0"
                          :class="weekRowSurface(week.weekNumber, week.id)"
                        >
                          <div class="flex items-center justify-between gap-2">
                            <span
                              class="text-[11px] font-black uppercase tracking-[0.18em] text-muted"
                            >
                              {{ day.label }}
                            </span>
                            <span
                              class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]"
                              :class="
                                day.workouts.length
                                  ? 'bg-primary/12 text-primary'
                                  : 'bg-muted text-muted'
                              "
                            >
                              {{
                                day.workouts.length
                                  ? `${day.workouts.length} session${day.workouts.length === 1 ? '' : 's'}`
                                  : 'Open'
                              }}
                            </span>
                          </div>

                          <div class="mt-3 flex-1 space-y-2">
                            <div
                              v-for="workout in day.workouts"
                              :key="workout.id"
                              class="group/workout rounded-xl border bg-default p-2.5 shadow-sm transition-colors hover:bg-muted/10"
                              :class="workoutCardTone(workout)"
                            >
                              <div class="flex items-start gap-2">
                                <button
                                  class="min-w-0 flex-1 text-left"
                                  @click="openWorkoutEditor(week.id, day.dayIndex, workout)"
                                >
                                  <div class="text-[14px] font-bold leading-[1.2] text-highlighted">
                                    {{ workout.title }}
                                  </div>
                                  <div
                                    class="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-muted"
                                  >
                                    {{ workout.type || 'Workout' }}
                                  </div>
                                  <div class="mt-1.5 text-[10px] font-medium leading-4 text-muted">
                                    {{ workoutMetaLine(workout) }}
                                  </div>
                                </button>

                                <div
                                  class="flex items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover/workout:opacity-100"
                                >
                                  <UButton
                                    color="neutral"
                                    variant="ghost"
                                    size="xs"
                                    icon="i-heroicons-pencil-square"
                                    @click="openWorkoutEditor(week.id, day.dayIndex, workout)"
                                  />
                                  <UButton
                                    color="neutral"
                                    variant="ghost"
                                    size="xs"
                                    icon="i-heroicons-trash"
                                    @click="removeWorkout(week.id, workout.id)"
                                  />
                                </div>
                              </div>
                            </div>

                            <div
                              v-if="!day.workouts.length"
                              class="rounded-xl border border-dashed border-default/80 bg-transparent px-3 py-3 text-sm text-muted/90"
                            >
                              No workout scheduled.
                            </div>
                          </div>

                          <UButton
                            color="neutral"
                            variant="ghost"
                            size="xs"
                            icon="i-heroicons-plus-circle"
                            class="mt-3 justify-start self-start font-semibold"
                            @click="addWorkout(week.id, day.dayIndex)"
                          >
                            Add workout
                          </UButton>
                        </div>

                        <div
                          class="min-h-[188px] border-l border-default p-3.5"
                          :class="weekRowSurface(week.weekNumber, week.id)"
                        >
                          <div
                            class="text-[11px] font-black uppercase tracking-[0.22em] text-muted"
                          >
                            Weekly summary
                          </div>
                          <div class="mt-3 space-y-3">
                            <div class="rounded-xl border border-default/70 bg-default px-3 py-3">
                              <div class="flex items-center justify-between gap-3">
                                <div>
                                  <div
                                    class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                                  >
                                    Minutes
                                  </div>
                                  <div class="mt-1 text-sm font-semibold text-highlighted">
                                    {{ formatMinutes(weekSummary(week).scheduledMinutes) }} /
                                    {{ formatMinutes(week.volumeTargetMinutes || 0) }}
                                  </div>
                                  <div
                                    class="mt-1 text-[11px]"
                                    :class="deltaTone(weekMinuteDelta(week))"
                                  >
                                    {{ formatSignedMinutes(weekMinuteDelta(week)) }} vs target
                                  </div>
                                </div>
                                <div class="text-right text-[11px] text-muted">
                                  {{
                                    completionPercentage(
                                      weekSummary(week).scheduledMinutes,
                                      week.volumeTargetMinutes || 0
                                    )
                                  }}%
                                </div>
                              </div>
                              <UProgress
                                class="mt-3"
                                color="primary"
                                :model-value="
                                  completionPercentage(
                                    weekSummary(week).scheduledMinutes,
                                    week.volumeTargetMinutes || 0
                                  )
                                "
                              />
                            </div>
                            <div class="rounded-xl border border-default/70 bg-default px-3 py-3">
                              <div class="flex items-center justify-between gap-3">
                                <div>
                                  <div
                                    class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                                  >
                                    TSS
                                  </div>
                                  <div class="mt-1 text-sm font-semibold text-highlighted">
                                    {{ weekSummary(week).scheduledTss }} / {{ week.tssTarget || 0 }}
                                  </div>
                                  <div
                                    class="mt-1 text-[11px]"
                                    :class="deltaTone(weekTssDelta(week))"
                                  >
                                    {{ formatSignedTss(weekTssDelta(week)) }} vs target
                                  </div>
                                </div>
                                <div class="text-right text-[11px] text-muted">
                                  {{
                                    completionPercentage(
                                      weekSummary(week).scheduledTss,
                                      week.tssTarget || 0
                                    )
                                  }}%
                                </div>
                              </div>
                              <UProgress
                                class="mt-3"
                                color="neutral"
                                :model-value="
                                  completionPercentage(
                                    weekSummary(week).scheduledTss,
                                    week.tssTarget || 0
                                  )
                                "
                              />
                            </div>
                            <div class="rounded-xl border border-default/70 bg-default px-3 py-3">
                              <div
                                class="text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                              >
                                Workouts
                              </div>
                              <div class="mt-1 text-sm font-semibold text-highlighted">
                                {{ weekSummary(week).workoutCount }} scheduled
                              </div>
                              <div class="mt-1 text-[11px] text-muted">
                                {{ previousWeekDeltaLabel(week) }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>

                    <div class="mt-4 hidden lg:block">
                      <div
                        class="rounded-2xl border border-dashed border-default/70 bg-muted/5 px-4 py-3 text-sm text-muted"
                      >
                        Tip: select a week rail to focus it, hover a week or workout to reveal quick
                        actions, and collapse finished blocks to scan the season faster.
                      </div>
                    </div>

                    <div class="space-y-4 lg:hidden">
                      <article
                        v-for="week in orderedWeeks(block)"
                        :key="`mobile-${week.id}`"
                        class="rounded-2xl border border-default bg-default p-4 shadow-sm"
                      >
                        <div
                          class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div>
                            <div
                              class="text-[11px] font-black uppercase tracking-[0.24em] text-muted"
                            >
                              Week {{ week.weekNumber }}
                            </div>
                            <div class="mt-1 text-xl font-black tracking-tight text-highlighted">
                              {{ weekFocusLabel(week) }}
                            </div>
                          </div>

                          <div class="flex flex-wrap gap-2">
                            <UBadge color="neutral" variant="soft" size="sm">
                              {{ weekSummary(week).scheduledMinutes }} /
                              {{ week.volumeTargetMinutes || 0 }} min
                            </UBadge>
                            <UBadge color="neutral" variant="soft" size="sm">
                              {{ weekSummary(week).scheduledTss }} / {{ week.tssTarget || 0 }} TSS
                            </UBadge>
                          </div>
                        </div>

                        <div class="mt-4 grid gap-3 sm:grid-cols-2">
                          <div
                            v-for="day in weekDays(week)"
                            :key="`mobile-${week.id}-${day.dayIndex}`"
                            class="rounded-xl border border-default bg-muted/10 p-3"
                          >
                            <div class="flex items-center justify-between gap-2">
                              <span
                                class="text-xs font-black uppercase tracking-[0.18em] text-muted"
                              >
                                {{ day.label }}
                              </span>
                              <span class="text-xs text-muted">
                                {{ day.workouts.length }} session{{
                                  day.workouts.length === 1 ? '' : 's'
                                }}
                              </span>
                            </div>

                            <div class="mt-2 space-y-2">
                              <div
                                v-for="workout in day.workouts"
                                :key="workout.id"
                                class="rounded-lg border border-default bg-default p-2"
                              >
                                <button
                                  class="w-full text-left"
                                  @click="openWorkoutEditor(week.id, day.dayIndex, workout)"
                                >
                                  <div class="line-clamp-2 text-sm font-semibold text-highlighted">
                                    {{ workout.title }}
                                  </div>
                                  <div
                                    class="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted"
                                  >
                                    {{ workout.type || 'Workout' }} •
                                    {{ Math.round((workout.durationSec || 0) / 60) }}m •
                                    {{ Math.round(workout.tss || 0) }} TSS
                                  </div>
                                </button>
                              </div>

                              <div
                                v-if="!day.workouts.length"
                                class="rounded-lg border border-dashed border-default bg-default px-3 py-2 text-xs text-muted"
                              >
                                No workout scheduled.
                              </div>
                            </div>

                            <UButton
                              color="neutral"
                              variant="ghost"
                              size="xs"
                              icon="i-heroicons-plus-circle"
                              class="mt-3"
                              @click="addWorkout(week.id, day.dayIndex)"
                            >
                              Add workout
                            </UButton>
                          </div>
                        </div>
                      </article>
                    </div>
                  </div>

                  <div v-else class="border-t border-default/80 p-4 sm:p-6">
                    <div
                      class="rounded-2xl border border-dashed border-default/80 bg-muted/10 px-4 py-5"
                    >
                      <div
                        class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div
                            class="text-[11px] font-black uppercase tracking-[0.22em] text-muted"
                          >
                            Block collapsed
                          </div>
                          <div class="mt-1 text-sm text-muted">
                            {{ blockSummaryLabel(block) }}. Expand to review daily structure and
                            weekly summaries.
                          </div>
                        </div>
                        <UButton
                          color="neutral"
                          variant="outline"
                          size="sm"
                          icon="i-heroicons-chevron-down"
                          @click="toggleBlockCollapsed(block.id)"
                        >
                          Expand block
                        </UButton>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              <section v-else class="space-y-6">
                <article
                  v-for="block in sortedBlocks"
                  :key="`table-${block.id}`"
                  class="overflow-hidden rounded-3xl border bg-default shadow-sm"
                >
                  <div class="border-b border-default bg-muted/20 px-5 py-4">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <div class="text-[10px] font-black uppercase tracking-[0.24em] text-muted">
                          Block {{ block.order }}
                        </div>
                        <div class="mt-1 text-xl font-black tracking-tight text-highlighted">
                          {{ block.name }}
                        </div>
                      </div>
                      <UBadge size="sm" variant="soft" :color="blockChrome(block).badgeColor">
                        {{ block.type || 'BLOCK' }}
                      </UBadge>
                    </div>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="min-w-[980px] w-full text-sm">
                      <thead class="bg-muted/20">
                        <tr
                          class="text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted"
                        >
                          <th class="px-4 py-3">Week</th>
                          <th class="px-4 py-3">Focus</th>
                          <th class="px-4 py-3">Target Min</th>
                          <th class="px-4 py-3">Scheduled Min</th>
                          <th class="px-4 py-3">Target TSS</th>
                          <th class="px-4 py-3">Scheduled TSS</th>
                          <th class="px-4 py-3">Workouts</th>
                          <th class="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="week in orderedWeeks(block)"
                          :key="`table-row-${week.id}`"
                          class="border-t border-default"
                        >
                          <td class="px-4 py-3 font-semibold text-highlighted">
                            Week {{ week.weekNumber }}
                          </td>
                          <td class="px-4 py-3">
                            <div class="max-w-[18rem] truncate" :title="weekFocusLabel(week)">
                              {{ weekFocusLabel(week) }}
                            </div>
                          </td>
                          <td class="px-4 py-3">{{ week.volumeTargetMinutes || 0 }}</td>
                          <td class="px-4 py-3">{{ weekSummary(week).scheduledMinutes }}</td>
                          <td class="px-4 py-3">{{ week.tssTarget || 0 }}</td>
                          <td class="px-4 py-3">{{ weekSummary(week).scheduledTss }}</td>
                          <td class="px-4 py-3">{{ weekSummary(week).workoutCount }}</td>
                          <td class="px-4 py-3">
                            <div class="flex justify-end gap-2">
                              <UButton
                                color="neutral"
                                variant="ghost"
                                size="xs"
                                icon="i-heroicons-eye"
                                @click="openWeekInBoard(week.id)"
                              >
                                Open in board
                              </UButton>
                              <UButton
                                color="neutral"
                                variant="ghost"
                                size="xs"
                                icon="i-heroicons-pencil-square"
                                @click="openWeekEditor(block.id, week)"
                              >
                                Edit week
                              </UButton>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            </template>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <USlideover
    v-model:open="isPlanEditorOpen"
    title="Plan details"
    description="Adjust the blueprint metadata shown in the library and architect views."
  >
    <template #content>
      <div v-if="draftPlan" class="space-y-6 p-6">
        <UFormField label="Plan name">
          <UInput v-model="draftPlan.name" />
        </UFormField>

        <UFormField label="Description">
          <UTextarea v-model="draftPlan.description" autoresize />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Difficulty">
            <UInput v-model.number="draftPlan.difficulty" type="number" min="1" max="10" />
          </UFormField>

          <UFormField label="Strategy">
            <UInput :model-value="draftPlan.strategy || 'Unset'" disabled />
          </UFormField>
        </div>

        <div
          class="flex items-center justify-between rounded-2xl border border-default/80 bg-muted/20 p-4"
        >
          <div>
            <div class="text-sm font-bold text-highlighted">Public blueprint</div>
            <div class="text-xs text-muted">Show this template in the community gallery.</div>
          </div>
          <USwitch v-model="draftPlan.isPublic" />
        </div>

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isPlanEditorOpen = false">Close</UButton>
          <UButton color="primary" @click="isPlanEditorOpen = false">Apply</UButton>
        </div>
      </div>
    </template>
  </USlideover>

  <UModal v-model:open="isBlockEditorOpen" title="Edit block">
    <template #body>
      <div v-if="editingBlock" class="space-y-4">
        <UFormField label="Block name">
          <UInput v-model="editingBlock.name" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Block type">
            <USelect v-model="editingBlock.type" :items="blockTypeOptions" />
          </UFormField>

          <UFormField label="Primary focus">
            <UInput v-model="editingBlock.primaryFocus" />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isBlockEditorOpen = false">Close</UButton>
        <UButton color="primary" @click="applyBlockEditor">Apply</UButton>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="isWeekEditorOpen" title="Edit week">
    <template #body>
      <div v-if="editingWeek" class="space-y-4">
        <UFormField label="Week title / focus">
          <UInput v-model="editingWeek.focus" placeholder="Consolidation and Adaptation Week" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Volume target (minutes)">
            <UInput v-model.number="editingWeek.volumeTargetMinutes" type="number" min="0" />
          </UFormField>

          <UFormField label="TSS target">
            <UInput v-model.number="editingWeek.tssTarget" type="number" min="0" />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isWeekEditorOpen = false">Close</UButton>
        <UButton color="primary" @click="applyWeekEditor">Apply</UButton>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="isWorkoutEditorOpen" title="Edit workout">
    <template #body>
      <div v-if="editingWorkout" class="space-y-4">
        <UFormField label="Workout title">
          <UInput v-model="editingWorkout.title" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Type">
            <UInput v-model="editingWorkout.type" />
          </UFormField>

          <UFormField label="Category">
            <UInput v-model="editingWorkout.category" />
          </UFormField>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Duration (minutes)">
            <UInput v-model.number="editingWorkout.durationMinutes" type="number" min="0" />
          </UFormField>

          <UFormField label="TSS">
            <UInput v-model.number="editingWorkout.tss" type="number" min="0" />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between gap-2">
        <UButton color="error" variant="ghost" @click="removeEditingWorkout">Remove</UButton>
        <div class="flex gap-2">
          <UButton color="neutral" variant="ghost" @click="isWorkoutEditorOpen = false"
            >Close</UButton
          >
          <UButton color="primary" @click="applyWorkoutEditor">Apply</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <USlideover
    v-model:open="isUtilityPanelOpen"
    title="Utility panel"
    description="Quick stats, workout templates, and planning notes."
    side="right"
    :ui="{ content: 'w-full sm:max-w-xl' }"
  >
    <template #content>
      <div class="h-full overflow-y-auto p-4">
        <PlanArchitectLibrarySidebar :quick-stats="sidebarStats" :planning-tips="planningTips" />
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
  import PlanArchitectLibrarySidebar from '~/components/plans/PlanArchitectLibrarySidebar.vue'
  import PlanArchitectTimelineChart from '~/components/plans/PlanArchitectTimelineChart.vue'

  type ViewMode = 'board' | 'table'
  type ChartMetric = 'tss' | 'minutes'

  const route = useRoute()
  const toast = useToast()
  const planId = route.params.id as string

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const blockTypeOptions = ['BASE', 'BUILD', 'PEAK', 'RECOVERY', 'DELOAD', 'TAPER']
  const viewModeKey = `architect-view-mode:${planId}`

  const {
    data: planResponse,
    status,
    refresh
  } = await useFetch<any>(`/api/library/plans/${planId}/architect`)

  const loading = computed(() => status.value === 'pending')
  const saving = ref(false)

  const draftPlan = ref<any | null>(null)
  const lastSavedSnapshot = ref('')
  const activeWeekId = ref<string | null>(null)
  const viewMode = ref<ViewMode>('board')
  const chartMetric = ref<ChartMetric>('tss')
  const selectedChartWeekId = ref<string | null>(null)
  const collapsedBlockIds = ref<string[]>([])

  const isPlanEditorOpen = ref(false)
  const isUtilityPanelOpen = ref(false)
  const isBlockEditorOpen = ref(false)
  const isWeekEditorOpen = ref(false)
  const isWorkoutEditorOpen = ref(false)

  const editingBlock = ref<any | null>(null)
  const editingWeek = ref<any | null>(null)
  const editingWeekTarget = ref<{ blockId: string; weekId: string } | null>(null)
  const editingWorkout = ref<any | null>(null)
  const editingWorkoutTarget = ref<{ weekId: string; workoutId: string } | null>(null)

  if (import.meta.client) {
    const storedViewMode = sessionStorage.getItem(viewModeKey)
    if (storedViewMode === 'board' || storedViewMode === 'table') {
      viewMode.value = storedViewMode
    }
  }

  watch(
    viewMode,
    (newValue) => {
      if (import.meta.client) {
        sessionStorage.setItem(viewModeKey, newValue)
      }
    },
    { flush: 'post' }
  )

  watch(
    planResponse,
    (value) => {
      if (!value) {
        draftPlan.value = null
        lastSavedSnapshot.value = ''
        return
      }

      const normalized = normalizePlan(value)
      draftPlan.value = normalized
      lastSavedSnapshot.value = serializePlan(normalized)
    },
    { immediate: true }
  )

  const sortedBlocks = computed(() => {
    if (!draftPlan.value?.blocks) {
      return []
    }

    return [...draftPlan.value.blocks].sort((a, b) => a.order - b.order)
  })

  const totalWeeks = computed(() =>
    sortedBlocks.value.reduce((sum: number, block: any) => sum + (block.weeks?.length || 0), 0)
  )

  const totalWorkouts = computed(() =>
    sortedBlocks.value.reduce(
      (sum: number, block: any) =>
        sum +
        orderedWeeks(block).reduce(
          (weekSum: number, week: any) => weekSum + (week.workouts?.length || 0),
          0
        ),
      0
    )
  )

  const totalTargetMinutes = computed(() =>
    sortedBlocks.value.reduce(
      (sum: number, block: any) =>
        sum +
        orderedWeeks(block).reduce(
          (weekSum: number, week: any) => weekSum + (week.volumeTargetMinutes || 0),
          0
        ),
      0
    )
  )

  const totalTargetTss = computed(() =>
    sortedBlocks.value.reduce(
      (sum: number, block: any) =>
        sum +
        orderedWeeks(block).reduce(
          (weekSum: number, week: any) => weekSum + (week.tssTarget || 0),
          0
        ),
      0
    )
  )

  const headlineMetrics = computed(() => [
    {
      label: 'Difficulty',
      value: draftPlan.value?.difficulty || 'N/A',
      hint: 'Perceived challenge'
    },
    {
      label: 'Strategy',
      value: draftPlan.value?.strategy || 'Unset',
      hint: 'Current planning model'
    },
    {
      label: 'Minutes',
      value: totalTargetMinutes.value,
      hint: 'Total target volume'
    },
    {
      label: 'TSS',
      value: totalTargetTss.value,
      hint: 'Target load across blueprint'
    }
  ])

  const sidebarStats = computed(() => [
    { label: 'Blueprint status', value: draftPlan.value?.isPublic ? 'Public' : 'Private' },
    { label: 'Template type', value: draftPlan.value?.isTemplate ? 'Template' : 'Draft' },
    {
      label: 'Average weekly volume',
      value: totalWeeks.value
        ? `${Math.round(totalTargetMinutes.value / totalWeeks.value)} min`
        : '0 min'
    },
    {
      label: 'Average weekly load',
      value: totalWeeks.value
        ? `${Math.round(totalTargetTss.value / totalWeeks.value)} TSS`
        : '0 TSS'
    }
  ])

  const planningTips = [
    'Use each block to communicate the why of the phase before filling every day with detail.',
    'Check scheduled totals against the weekly targets before saving the blueprint.',
    'Keep week titles descriptive so the plan table stays useful when scanning the whole season.'
  ]

  const hasUnsavedChanges = computed(() => {
    if (!draftPlan.value) {
      return false
    }

    return serializePlan(draftPlan.value) !== lastSavedSnapshot.value
  })

  const orderedPlanWeeks = computed(() =>
    sortedBlocks.value.flatMap((block: any) => orderedWeeks(block))
  )

  const weekAnalytics = computed(() =>
    sortedBlocks.value.flatMap((block: any) =>
      orderedWeeks(block).map((week: any, weekIndex: number) => {
        const summary = weekSummary(week)
        const typeBreakdown = orderedWorkouts(week).reduce(
          (acc: Record<string, any>, workout: any) => {
            const label = classifyWorkoutBucket(workout)
            if (!acc[label]) {
              acc[label] = {
                label,
                count: 0,
                minutes: 0,
                tss: 0
              }
            }

            acc[label].count += 1
            acc[label].minutes += Math.round((workout.durationSec || 0) / 60)
            acc[label].tss += Math.round(workout.tss || 0)
            return acc
          },
          {}
        )

        return {
          weekId: week.id,
          weekNumber: week.weekNumber,
          displayWeekNumber: weekIndex + 1,
          weekFocus: weekFocusLabel(week),
          blockId: block.id,
          blockName: block.name,
          blockType: block.type,
          targetMinutes: Number(week.volumeTargetMinutes) || 0,
          scheduledMinutes: summary.scheduledMinutes,
          targetTss: Number(week.tssTarget) || 0,
          scheduledTss: summary.scheduledTss,
          minuteDelta: summary.scheduledMinutes - (Number(week.volumeTargetMinutes) || 0),
          tssDelta: summary.scheduledTss - (Number(week.tssTarget) || 0),
          workoutCount: summary.workoutCount,
          typeBreakdown: Object.values(typeBreakdown)
        }
      })
    )
  )

  const blockAnalytics = computed(() =>
    sortedBlocks.value.map((block: any) => {
      const weeks = orderedWeeks(block)
      const relatedWeeks = weekAnalytics.value.filter((week) => week.blockId === block.id)

      return {
        blockId: block.id,
        blockName: block.name,
        blockType: block.type,
        startWeekNumber: relatedWeeks[0]?.displayWeekNumber || 0,
        endWeekNumber: relatedWeeks[relatedWeeks.length - 1]?.displayWeekNumber || 0,
        weekCount: weeks.length,
        targetMinutes: relatedWeeks.reduce((sum, week) => sum + week.targetMinutes, 0),
        scheduledMinutes: relatedWeeks.reduce((sum, week) => sum + week.scheduledMinutes, 0),
        targetTss: relatedWeeks.reduce((sum, week) => sum + week.targetTss, 0),
        scheduledTss: relatedWeeks.reduce((sum, week) => sum + week.scheduledTss, 0),
        workoutCount: relatedWeeks.reduce((sum, week) => sum + week.workoutCount, 0)
      }
    })
  )

  const chartBlockRanges = computed(() =>
    blockAnalytics.value
      .map((block) => ({
        blockId: block.blockId,
        blockName: block.blockName,
        blockType: block.blockType,
        startIndex: weekAnalytics.value.findIndex((week) => week.blockId === block.blockId),
        endIndex:
          weekAnalytics.value.length -
          1 -
          [...weekAnalytics.value].reverse().findIndex((week) => week.blockId === block.blockId)
      }))
      .filter((block) => block.startIndex >= 0 && block.endIndex >= 0)
  )

  const selectedWeekAnalytics = computed(
    () =>
      weekAnalytics.value.find((week) => week.weekId === selectedChartWeekId.value) ||
      weekAnalytics.value[0] ||
      null
  )

  const selectedWeekBreakdown = computed(() => {
    const selected = selectedWeekAnalytics.value
    if (!selected) {
      return []
    }

    const colorMap: Record<string, 'success' | 'info' | 'warning' | 'neutral' | 'secondary'> = {
      Run: 'success',
      Ride: 'info',
      Gym: 'secondary',
      'Rest/Recovery': 'warning',
      Other: 'neutral'
    }

    return ['Run', 'Ride', 'Gym', 'Rest/Recovery', 'Other']
      .map((label) => {
        const bucket = selected.typeBreakdown.find((entry: any) => entry.label === label)
        return {
          label,
          count: bucket?.count || 0,
          minutes: bucket?.minutes || 0,
          tss: bucket?.tss || 0,
          color: colorMap[label] || 'neutral'
        }
      })
      .filter((bucket) => bucket.count > 0 || labelIsAlwaysVisible(bucket.label))
  })

  watch(
    weekAnalytics,
    (weeks) => {
      if (!weeks.length) {
        selectedChartWeekId.value = null
        return
      }

      if (
        !selectedChartWeekId.value ||
        !weeks.some((week) => week.weekId === selectedChartWeekId.value)
      ) {
        selectedChartWeekId.value =
          activeWeekId.value && weeks.some((week) => week.weekId === activeWeekId.value)
            ? activeWeekId.value
            : weeks[0].weekId
      }
    },
    { immediate: true }
  )

  watch(activeWeekId, (weekId) => {
    if (weekId && weekAnalytics.value.some((week) => week.weekId === weekId)) {
      selectedChartWeekId.value = weekId
    }
  })

  function normalizePlan(plan: any) {
    return {
      ...structuredClone(plan),
      blocks: (plan.blocks || []).map((block: any, blockIndex: number) => ({
        ...block,
        name: block.name || `Block ${blockIndex + 1}`,
        type: block.type || 'BUILD',
        primaryFocus: block.primaryFocus || 'AEROBIC_ENDURANCE',
        durationWeeks: block.durationWeeks || block.weeks?.length || 0,
        order: block.order || blockIndex + 1,
        weeks: (block.weeks || []).map((week: any, weekIndex: number) => ({
          ...week,
          weekNumber: week.weekNumber || weekIndex + 1,
          volumeTargetMinutes: week.volumeTargetMinutes || 0,
          tssTarget: week.tssTarget || 0,
          focus: week.focus || null,
          workouts: (week.workouts || []).map((workout: any) => ({
            ...workout,
            title: workout.title || 'Untitled workout',
            type: workout.type || 'Workout',
            durationSec: workout.durationSec || 0,
            tss: workout.tss || 0,
            category: workout.category || 'Workout'
          }))
        }))
      }))
    }
  }

  function serializePlan(plan: any) {
    return JSON.stringify(buildPayload(plan))
  }

  function buildPayload(plan: any) {
    return {
      name: plan.name,
      description: plan.description,
      difficulty: Number(plan.difficulty) || 1,
      isPublic: Boolean(plan.isPublic),
      blocks: sortedPayloadBlocks(plan.blocks || [])
    }
  }

  function sortedPayloadBlocks(blocks: any[]) {
    return [...blocks]
      .sort((a, b) => a.order - b.order)
      .map((block, blockIndex) => ({
        id: block.id,
        name: block.name,
        type: block.type,
        primaryFocus: block.primaryFocus || 'AEROBIC_ENDURANCE',
        durationWeeks: orderedWeeks(block).length,
        order: blockIndex + 1,
        weeks: orderedWeeks(block).map((week: any, weekIndex: number) => ({
          id: week.id,
          weekNumber: weekIndex + 1,
          volumeTargetMinutes: Number(week.volumeTargetMinutes) || 0,
          tssTarget: Number(week.tssTarget) || 0,
          focus: week.focus || null,
          workouts: orderedWorkouts(week).map((workout: any) => ({
            id: workout.id?.startsWith('temp-') ? undefined : workout.id,
            dayIndex: workout.dayIndex,
            weekIndex: weekIndex + 1,
            title: workout.title,
            type: workout.type || null,
            durationSec: Number(workout.durationSec) || 0,
            tss: Number(workout.tss) || 0,
            category: workout.category || null,
            structuredWorkout: workout.structuredWorkout || null
          }))
        }))
      }))
  }

  function orderedWeeks(block: any) {
    return [...(block.weeks || [])].sort((a, b) => a.weekNumber - b.weekNumber)
  }

  function orderedWorkouts(week: any) {
    return [...(week.workouts || [])].sort((a, b) => a.dayIndex - b.dayIndex)
  }

  function weekSummary(week: any) {
    const workouts = orderedWorkouts(week)

    return {
      workoutCount: workouts.length,
      scheduledMinutes: workouts.reduce(
        (sum: number, workout: any) => sum + Math.round((workout.durationSec || 0) / 60),
        0
      ),
      scheduledTss: workouts.reduce(
        (sum: number, workout: any) => sum + Math.round(workout.tss || 0),
        0
      )
    }
  }

  function blockChrome(block: any) {
    const type = String(block.type || '').toUpperCase()

    if (type.includes('BUILD')) {
      return {
        card: 'border-emerald-200/80 dark:border-emerald-900/60',
        header:
          'border-emerald-200/80 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/20',
        badgeColor: 'success'
      }
    }

    if (type.includes('PEAK')) {
      return {
        card: 'border-sky-200/80 dark:border-sky-900/60',
        header: 'border-sky-200/80 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/20',
        badgeColor: 'info'
      }
    }

    if (type.includes('RECOVERY') || type.includes('DELOAD') || type.includes('TAPER')) {
      return {
        card: 'border-amber-200/80 dark:border-amber-900/60',
        header: 'border-amber-200/80 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20',
        badgeColor: 'warning'
      }
    }

    return {
      card: 'border-default/80',
      header: 'border-default/80 bg-muted/20',
      badgeColor: 'neutral'
    }
  }

  function blockSummaryLabel(block: any) {
    const weeks = block.weeks?.length || 0
    const workouts = block.weeks?.reduce(
      (sum: number, week: any) => sum + (week.workouts?.length || 0),
      0
    )

    return `${weeks} week${weeks === 1 ? '' : 's'} • ${workouts} workout${workouts === 1 ? '' : 's'} scheduled`
  }

  function weekFocusLabel(week: any) {
    return week.focus || 'Untitled training week'
  }

  function weekDays(week: any) {
    return DAYS.map((label, dayIndex) => ({
      label,
      dayIndex,
      workouts: orderedWorkouts(week).filter((workout: any) => workout.dayIndex === dayIndex)
    }))
  }

  function isBlockCollapsed(blockId: string) {
    return collapsedBlockIds.value.includes(blockId)
  }

  function toggleBlockCollapsed(blockId: string) {
    collapsedBlockIds.value = isBlockCollapsed(blockId)
      ? collapsedBlockIds.value.filter((id) => id !== blockId)
      : [...collapsedBlockIds.value, blockId]
  }

  function weekRowSurface(weekNumber: number, weekId?: string) {
    const tone = weekNumber % 2 === 0 ? 'bg-muted/10' : 'bg-default'

    if (weekId && activeWeekId.value === weekId) {
      return `${tone} bg-primary/5`
    }

    return tone
  }

  function workoutCardTone(workout: any) {
    const type = String(workout.type || '').toUpperCase()

    if (type.includes('RUN')) {
      return 'border-emerald-500/25'
    }

    if (type.includes('RIDE') || type.includes('BIKE') || type.includes('CYCLE')) {
      return 'border-sky-500/25'
    }

    if (type.includes('REST') || type.includes('RECOVERY')) {
      return 'border-amber-500/25'
    }

    if (type.includes('GYM') || type.includes('STRENGTH')) {
      return 'border-fuchsia-500/25'
    }

    return 'border-default'
  }

  function classifyWorkoutBucket(workout: any) {
    const fingerprint = `${workout.type || ''} ${workout.category || ''}`.toUpperCase()

    if (fingerprint.includes('RUN')) {
      return 'Run'
    }

    if (
      fingerprint.includes('RIDE') ||
      fingerprint.includes('BIKE') ||
      fingerprint.includes('CYCLE')
    ) {
      return 'Ride'
    }

    if (fingerprint.includes('GYM') || fingerprint.includes('STRENGTH')) {
      return 'Gym'
    }

    if (fingerprint.includes('REST') || fingerprint.includes('RECOVERY')) {
      return 'Rest/Recovery'
    }

    return 'Other'
  }

  function labelIsAlwaysVisible(label: string) {
    return ['Run', 'Ride', 'Gym', 'Rest/Recovery', 'Other'].includes(label)
  }

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

  function formatSignedMinutes(minutes: number) {
    if (!minutes) {
      return 'On target'
    }

    const sign = minutes > 0 ? '+' : '-'
    return `${sign}${formatMinutes(Math.abs(minutes))}`
  }

  function formatSignedTss(tss: number) {
    if (!tss) {
      return 'On target'
    }

    const sign = tss > 0 ? '+' : '-'
    return `${sign}${Math.abs(Math.round(tss))} TSS`
  }

  function completionPercentage(actual: number, target: number) {
    const safeTarget = Math.max(0, Number(target) || 0)
    const safeActual = Math.max(0, Number(actual) || 0)

    if (!safeTarget) {
      return safeActual ? 100 : 0
    }

    return Math.min(100, Math.round((safeActual / safeTarget) * 100))
  }

  function workoutMetaLine(workout: any) {
    const parts = [
      workout.type || 'Workout',
      formatMinutes(Math.round((workout.durationSec || 0) / 60)),
      `${Math.round(workout.tss || 0)} TSS`
    ]

    if (workout.category) {
      parts.push(workout.category)
    }

    return parts.join(' • ')
  }

  function weekMinuteDelta(week: any) {
    return weekSummary(week).scheduledMinutes - (Number(week.volumeTargetMinutes) || 0)
  }

  function weekTssDelta(week: any) {
    return weekSummary(week).scheduledTss - (Number(week.tssTarget) || 0)
  }

  function deltaTone(delta: number) {
    if (!delta) {
      return 'text-muted'
    }

    return delta > 0 ? 'text-amber-500' : 'text-sky-500'
  }

  function previousWeek(weekId: string) {
    const index = orderedPlanWeeks.value.findIndex((week: any) => week.id === weekId)
    if (index <= 0) {
      return null
    }

    return orderedPlanWeeks.value[index - 1]
  }

  function previousWeekDeltaLabel(week: any) {
    const previous = previousWeek(week.id)

    if (!previous) {
      return 'First week in the plan'
    }

    const minuteDelta = weekSummary(week).scheduledMinutes - weekSummary(previous).scheduledMinutes
    const tssDelta = weekSummary(week).scheduledTss - weekSummary(previous).scheduledTss
    const minuteText = minuteDelta
      ? `${minuteDelta > 0 ? '+' : '-'}${formatMinutes(Math.abs(minuteDelta))}`
      : 'No volume change'
    const tssText = tssDelta ? `${tssDelta > 0 ? '+' : '-'}${Math.abs(tssDelta)} TSS` : 'steady TSS'

    return `${minuteText} • ${tssText} vs previous week`
  }

  function weekRowId(weekId: string) {
    return `architect-week-${weekId}`
  }

  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  async function handleChartWeekSelect(weekId: string) {
    selectedChartWeekId.value = weekId
    await openWeekInBoard(weekId)
  }

  async function openWeekInBoard(weekId: string) {
    activeWeekId.value = weekId
    viewMode.value = 'board'

    if (import.meta.client) {
      await nextTick()
      document.getElementById(weekRowId(weekId))?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      })
    }
  }

  function addBlock() {
    if (!draftPlan.value) {
      return
    }

    const nextOrder = draftPlan.value.blocks.length + 1
    draftPlan.value.blocks.push({
      id: `temp-block-${Date.now()}`,
      name: `New Block ${nextOrder}`,
      type: 'BUILD',
      primaryFocus: 'AEROBIC_ENDURANCE',
      durationWeeks: 4,
      order: nextOrder,
      weeks: Array.from({ length: 4 }, (_, index) => ({
        id: `temp-week-${Date.now()}-${index}`,
        weekNumber: totalWeeks.value + index + 1,
        volumeTargetMinutes: 240,
        tssTarget: 150,
        focus: `Week ${index + 1} focus`,
        workouts: []
      }))
    })

    renumberPlan()
    toast.add({ title: 'Block added', color: 'success' })
  }

  function removeBlock(blockId: string) {
    if (!draftPlan.value) {
      return
    }

    draftPlan.value.blocks = draftPlan.value.blocks.filter((block: any) => block.id !== blockId)
    renumberPlan()
    toast.add({ title: 'Block removed', color: 'info' })
  }

  function openBlockEditor(block: any) {
    editingBlock.value = { ...block }
    isBlockEditorOpen.value = true
  }

  function applyBlockEditor() {
    if (!draftPlan.value || !editingBlock.value) {
      return
    }

    const block = draftPlan.value.blocks.find((entry: any) => entry.id === editingBlock.value.id)
    if (!block) {
      return
    }

    Object.assign(block, editingBlock.value)
    isBlockEditorOpen.value = false
    editingBlock.value = null
    toast.add({ title: 'Block updated', color: 'success' })
  }

  function openWeekEditor(blockId: string, week: any) {
    editingWeekTarget.value = { blockId, weekId: week.id }
    editingWeek.value = { ...week }
    isWeekEditorOpen.value = true
  }

  function applyWeekEditor() {
    if (!draftPlan.value || !editingWeek.value || !editingWeekTarget.value) {
      return
    }

    const block = draftPlan.value.blocks.find(
      (entry: any) => entry.id === editingWeekTarget.value?.blockId
    )
    const week = block?.weeks.find((entry: any) => entry.id === editingWeekTarget.value?.weekId)
    if (!week) {
      return
    }

    week.focus = editingWeek.value.focus || null
    week.volumeTargetMinutes = Number(editingWeek.value.volumeTargetMinutes) || 0
    week.tssTarget = Number(editingWeek.value.tssTarget) || 0
    isWeekEditorOpen.value = false
    editingWeek.value = null
    editingWeekTarget.value = null
    toast.add({ title: 'Week updated', color: 'success' })
  }

  function duplicateWeek(blockId: string, weekId: string) {
    if (!draftPlan.value) {
      return
    }

    const block = draftPlan.value.blocks.find((entry: any) => entry.id === blockId)
    const source = block?.weeks.find((entry: any) => entry.id === weekId)
    if (!block || !source) {
      return
    }

    const clone = structuredClone(source)
    clone.id = `temp-week-${Date.now()}`
    clone.weekNumber = source.weekNumber + 1
    clone.focus = source.focus ? `${source.focus} Copy` : 'Duplicated week'
    clone.workouts = (clone.workouts || []).map((workout: any, index: number) => ({
      ...workout,
      id: `temp-workout-${Date.now()}-${index}`,
      weekIndex: clone.weekNumber
    }))

    const sourceIndex = block.weeks.findIndex((entry: any) => entry.id === weekId)
    block.weeks.splice(sourceIndex + 1, 0, clone)
    renumberPlan()
    toast.add({ title: 'Week duplicated', color: 'success' })
  }

  function addWorkout(weekId: string, dayIndex: number) {
    const week = findWeek(weekId)
    if (!week) {
      return
    }

    week.workouts.push({
      id: `temp-workout-${Date.now()}`,
      dayIndex,
      weekIndex: week.weekNumber,
      title: 'New workout',
      type: 'Workout',
      durationSec: 1800,
      tss: 20,
      category: 'Workout',
      structuredWorkout: null
    })

    toast.add({ title: 'Workout added', color: 'success' })
  }

  function removeWorkout(weekId: string, workoutId: string) {
    const week = findWeek(weekId)
    if (!week) {
      return
    }

    week.workouts = week.workouts.filter((workout: any) => workout.id !== workoutId)
    toast.add({ title: 'Workout removed', color: 'info' })
  }

  function openWorkoutEditor(weekId: string, _dayIndex: number, workout: any) {
    editingWorkoutTarget.value = { weekId, workoutId: workout.id }
    editingWorkout.value = {
      ...workout,
      durationMinutes: Math.round((workout.durationSec || 0) / 60)
    }
    isWorkoutEditorOpen.value = true
  }

  function applyWorkoutEditor() {
    if (!editingWorkout.value || !editingWorkoutTarget.value) {
      return
    }

    const week = findWeek(editingWorkoutTarget.value.weekId)
    const workout = week?.workouts.find(
      (entry: any) => entry.id === editingWorkoutTarget.value?.workoutId
    )
    if (!workout) {
      return
    }

    workout.title = editingWorkout.value.title || 'Untitled workout'
    workout.type = editingWorkout.value.type || 'Workout'
    workout.category = editingWorkout.value.category || 'Workout'
    workout.durationSec = (Number(editingWorkout.value.durationMinutes) || 0) * 60
    workout.tss = Number(editingWorkout.value.tss) || 0
    isWorkoutEditorOpen.value = false
    editingWorkout.value = null
    editingWorkoutTarget.value = null
    toast.add({ title: 'Workout updated', color: 'success' })
  }

  function removeEditingWorkout() {
    if (!editingWorkoutTarget.value) {
      return
    }

    removeWorkout(editingWorkoutTarget.value.weekId, editingWorkoutTarget.value.workoutId)
    isWorkoutEditorOpen.value = false
    editingWorkout.value = null
    editingWorkoutTarget.value = null
  }

  function findWeek(weekId: string) {
    for (const block of draftPlan.value?.blocks || []) {
      const week = block.weeks.find((entry: any) => entry.id === weekId)
      if (week) {
        return week
      }
    }

    return null
  }

  function renumberPlan() {
    if (!draftPlan.value) {
      return
    }

    let globalWeek = 1
    draftPlan.value.blocks
      .sort((a: any, b: any) => a.order - b.order)
      .forEach((block: any, blockIndex: number) => {
        block.order = blockIndex + 1
        block.weeks
          .sort((a: any, b: any) => a.weekNumber - b.weekNumber)
          .forEach((week: any, weekIndex: number) => {
            week.weekNumber = globalWeek
            week.workouts = (week.workouts || []).map((workout: any) => ({
              ...workout,
              weekIndex: globalWeek
            }))
            globalWeek += 1
            if (!week.focus) {
              week.focus = `Week ${weekIndex + 1} focus`
            }
          })

        block.durationWeeks = block.weeks.length
      })
  }

  async function savePlan() {
    if (!draftPlan.value) {
      return
    }

    saving.value = true
    try {
      const payload = buildPayload(draftPlan.value)
      await $fetch(`/api/library/plans/${planId}/architect`, {
        method: 'PATCH',
        body: payload
      })

      lastSavedSnapshot.value = JSON.stringify(payload)
      toast.add({ title: 'Blueprint saved', color: 'success' })
      await refresh()
    } catch (error: any) {
      toast.add({
        title: 'Save failed',
        description: error.data?.message || 'Please review the blueprint data and try again.',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }
</script>
