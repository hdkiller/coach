<template>
  <UDashboardPanel id="exercise-library">
    <template #header>
      <UDashboardNavbar title="Exercises">
        <template #right>
          <UButton
            color="primary"
            icon="i-heroicons-plus"
            label="New Exercise"
            @click="openCreateModal"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6 px-0 py-4 sm:p-6">
        <div class="flex flex-col justify-between gap-4 px-4 md:flex-row md:items-center sm:px-0">
          <div>
            <h1 class="text-3xl font-black uppercase tracking-tight">Exercises</h1>
            <p class="mt-1 text-xs font-bold uppercase italic tracking-[0.2em] text-muted">
              Your Reusable Strength Exercise Library
            </p>
          </div>

          <div class="flex flex-col items-stretch gap-2 md:items-end">
            <div v-if="isCoachingMode" class="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <UButton
                v-for="option in librarySourceOptions"
                :key="option.value"
                size="xs"
                :color="librarySource === option.value ? 'primary' : 'neutral'"
                :variant="librarySource === option.value ? 'solid' : 'ghost'"
                class="shrink-0 rounded-xl px-3"
                @click="librarySource = option.value"
              >
                {{ option.label }}
              </UButton>
            </div>

            <div class="flex items-center gap-2">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search exercises..."
                class="min-w-0 flex-1 md:w-72 md:flex-none"
              />
            </div>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 rounded-none border-y border-default/70 bg-muted/10 px-4 py-4 md:flex-row md:flex-wrap md:items-center sm:rounded-2xl sm:border sm:p-4"
        >
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <UButton
              size="xs"
              :color="selectedPattern === 'all' ? 'primary' : 'neutral'"
              :variant="selectedPattern === 'all' ? 'solid' : 'ghost'"
              icon="i-heroicons-squares-2x2"
              @click="selectedPattern = 'all'"
            >
              All Patterns
            </UButton>
            <UButton
              v-for="option in movementPatternFilterOptions"
              :key="option.value"
              size="xs"
              :color="selectedPattern === option.value ? 'primary' : 'neutral'"
              :variant="selectedPattern === option.value ? 'solid' : 'ghost'"
              @click="selectedPattern = option.value"
            >
              {{ option.label }}
            </UButton>
          </div>

          <div class="hidden h-4 w-px bg-default/70 md:block" />

          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <UButton
              v-for="option in intentFilterOptions"
              :key="option.value"
              size="xs"
              :color="selectedIntent === option.value ? 'primary' : 'neutral'"
              :variant="selectedIntent === option.value ? 'solid' : 'ghost'"
              @click="selectedIntent = option.value"
            >
              {{ option.label }}
            </UButton>
          </div>

          <div class="hidden h-4 w-px bg-default/70 md:block" />

          <div class="min-w-0 md:min-w-[230px]">
            <USelectMenu
              v-model="selectedMuscleGroups"
              multiple
              :items="muscleGroupOptions"
              placeholder="Filter muscle groups"
              class="w-full"
            />
          </div>

          <div class="hidden h-4 w-px bg-default/70 md:block" />

          <div class="flex items-center gap-2 md:ml-auto">
            <span class="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
              Sort
            </span>
            <USelect v-model="sortBy" :items="sortOptions" size="xs" class="min-w-[170px]" />
          </div>
        </div>

        <div
          v-if="loading && !exerciseItems.length"
          class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <UCard v-for="i in 6" :key="i" class="min-h-[220px]">
            <USkeleton class="mb-4 h-5 w-2/3" />
            <USkeleton class="mb-3 h-4 w-1/2" />
            <USkeleton class="mb-2 h-20 w-full" />
            <USkeleton class="h-10 w-full" />
          </UCard>
        </div>

        <div
          v-else-if="filteredExercises.length === 0"
          class="border-y border-dashed border-gray-200 bg-gray-50 px-4 py-20 text-center dark:border-gray-800 dark:bg-gray-900/50 sm:rounded-xl sm:border"
        >
          <UIcon name="i-tabler-barbell" class="mb-4 h-12 w-12 text-gray-300" />
          <h3 class="text-lg font-bold">
            {{ searchQuery ? 'No exercises match this search' : 'Your exercise library is empty' }}
          </h3>
          <p class="mx-auto mb-6 max-w-xs text-sm text-muted">
            {{
              searchQuery
                ? 'Try a different keyword or filter combination.'
                : 'Create reusable strength exercises here so coaches can quickly insert them into workout blocks.'
            }}
          </p>
          <UButton color="primary" variant="soft" @click="openCreateModal">
            Create First Exercise
          </UButton>
        </div>

        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <UCard
            v-for="exercise in filteredExercises"
            :key="exercise.id"
            class="group flex h-full cursor-pointer flex-col transition-all hover:border-primary/50"
            :ui="{
              header: 'px-4 py-3 sm:px-4',
              body: 'flex flex-1 flex-col px-4 py-3 sm:px-4',
              footer: 'px-4 py-3 sm:px-4'
            }"
            @click="openPreview(exercise)"
          >
            <template #header>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold leading-snug text-highlighted">
                    {{ exercise.title }}
                  </div>
                  <div class="mt-2 flex min-h-6 flex-wrap items-center gap-1.5">
                    <UBadge
                      v-if="exercise.ownerScope"
                      color="primary"
                      variant="outline"
                      size="xs"
                      class="font-medium"
                    >
                      {{ exercise.ownerScope === 'coach' ? 'Coach' : 'Athlete' }}
                    </UBadge>
                    <UBadge
                      v-if="exercise.movementPattern"
                      color="neutral"
                      variant="soft"
                      size="xs"
                    >
                      {{ formatTokenLabel(exercise.movementPattern) }}
                    </UBadge>
                    <UBadge v-if="exercise.intent" color="primary" variant="soft" size="xs">
                      {{ formatTokenLabel(exercise.intent) }}
                    </UBadge>
                    <UBadge
                      v-for="muscle in (exercise.targetMuscleGroups || []).slice(0, 2)"
                      :key="muscle"
                      color="warning"
                      variant="subtle"
                      size="xs"
                    >
                      {{ formatTokenLabel(muscle) }}
                    </UBadge>
                  </div>
                </div>

                <div class="flex items-center gap-1">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-tabler-brand-youtube"
                    class="text-red-400 hover:text-red-500"
                    @click.stop="openYouTubeSearch(exercise.title)"
                  />
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-pencil-square"
                    @click.stop="openEditModal(exercise)"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-trash"
                    :loading="deletingExerciseId === exercise.id"
                    @click.stop="deleteExercise(exercise)"
                  />
                </div>
              </div>
            </template>

            <div class="flex h-full flex-col space-y-3">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span
                  >{{ getSetCount(exercise) }} set{{ getSetCount(exercise) === 1 ? '' : 's' }}</span
                >
                <span class="text-default/50">•</span>
                <span>{{ prescriptionColumnLabel(exercise.prescriptionMode) }}</span>
                <template v-if="exercise.loadMode && exercise.loadMode !== 'none'">
                  <span class="text-default/50">•</span>
                  <span>{{ loadModeLabel(exercise.loadMode) }}</span>
                </template>
                <template v-if="exercise.defaultRest || exercise.rest">
                  <span class="text-default/50">•</span>
                  <span>Rest {{ exercise.defaultRest || exercise.rest }}</span>
                </template>
              </div>

              <p v-if="exercise.notes" class="line-clamp-2 text-sm italic text-muted">
                {{ exercise.notes }}
              </p>

              <div
                v-if="getYouTubeEmbedUrl(exercise.videoUrl)"
                class="overflow-hidden rounded-2xl border border-default/70 bg-default shadow-sm"
              >
                <iframe
                  :src="getYouTubeEmbedUrl(exercise.videoUrl) || undefined"
                  title="Exercise video"
                  class="aspect-video w-full"
                  allow="
                    accelerometer;
                    autoplay;
                    clipboard-write;
                    encrypted-media;
                    gyroscope;
                    picture-in-picture;
                  "
                  allowfullscreen
                />
              </div>

              <div class="overflow-hidden rounded-2xl border border-default/70 bg-default/30">
                <div
                  class="grid text-[10px] font-black uppercase tracking-[0.24em] text-muted"
                  :style="gridTemplateColumns(exercise)"
                >
                  <div class="border-b border-default/70 px-3 py-3">Set</div>
                  <div
                    v-if="exercise.loadMode && exercise.loadMode !== 'none'"
                    class="border-b border-default/70 px-3 py-3"
                  >
                    {{ loadModeLabel(exercise.loadMode) }}
                  </div>
                  <div class="border-b border-default/70 px-3 py-3">
                    {{ prescriptionColumnLabel(exercise.prescriptionMode) }}
                  </div>
                  <div v-if="exercise.showRestColumn" class="border-b border-default/70 px-3 py-3">
                    Rest
                  </div>
                </div>

                <div
                  v-for="row in previewRows(exercise).slice(0, 3)"
                  :key="row.id"
                  class="grid text-sm"
                  :style="gridTemplateColumns(exercise)"
                >
                  <div class="border-b border-default/50 px-3 py-3 font-semibold text-highlighted">
                    {{ row.index }}
                  </div>
                  <div
                    v-if="exercise.loadMode && exercise.loadMode !== 'none'"
                    class="border-b border-default/50 px-3 py-3 text-highlighted"
                  >
                    {{ row.loadValue || '--' }}
                  </div>
                  <div class="border-b border-default/50 px-3 py-3 text-highlighted">
                    {{ row.value || '--' }}
                  </div>
                  <div
                    v-if="exercise.showRestColumn"
                    class="border-b border-default/50 px-3 py-3 text-highlighted"
                  >
                    {{ row.restOverride || exercise.defaultRest || '--' }}
                  </div>
                </div>

                <div
                  v-if="previewRows(exercise).length > 3"
                  class="px-3 py-2 text-xs font-medium text-muted"
                >
                  +{{ previewRows(exercise).length - 3 }} more set{{
                    previewRows(exercise).length - 3 === 1 ? '' : 's'
                  }}
                </div>
              </div>

              <div class="flex-1" />
            </div>

            <template #footer>
              <div class="flex items-center justify-between gap-3 text-xs text-muted">
                <span>
                  Updated
                  {{
                    new Date(
                      exercise.updatedAt || exercise.createdAt || Date.now()
                    ).toLocaleDateString()
                  }}
                </span>
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  trailing-icon="i-heroicons-arrow-right"
                  @click.stop="openPreview(exercise)"
                >
                  View Details
                </UButton>
              </div>
            </template>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <USlideover v-model:open="isPreviewOpen" side="right">
    <template #content>
      <div class="flex h-full flex-col">
        <div class="border-b border-default/70 px-5 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-black uppercase tracking-[0.22em] text-muted">
                Saved Exercise
              </p>
              <h2 class="mt-1 text-xl font-semibold text-highlighted">
                {{ previewItem?.title || 'Exercise details' }}
              </h2>
              <div class="mt-3 flex flex-wrap items-center gap-1.5">
                <UBadge v-if="previewItem?.ownerScope" color="primary" variant="outline" size="xs">
                  {{ previewItem.ownerScope === 'coach' ? 'Coach' : 'Athlete' }}
                </UBadge>
                <UBadge
                  v-if="previewItem?.movementPattern"
                  color="neutral"
                  variant="soft"
                  size="xs"
                >
                  {{ formatTokenLabel(previewItem.movementPattern) }}
                </UBadge>
                <UBadge v-if="previewItem?.intent" color="primary" variant="soft" size="xs">
                  {{ formatTokenLabel(previewItem.intent) }}
                </UBadge>
                <UBadge
                  v-for="muscle in previewItem?.targetMuscleGroups || []"
                  :key="muscle"
                  color="warning"
                  variant="subtle"
                  size="xs"
                >
                  {{ formatTokenLabel(muscle) }}
                </UBadge>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-tabler-brand-youtube"
                class="text-red-400 hover:text-red-500"
                @click.stop="openYouTubeSearch(previewItem?.title || '')"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-heroicons-pencil-square"
                @click="previewItem && openEditModal(previewItem)"
              />
            </div>
          </div>
        </div>

        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div
            v-if="previewItem"
            class="grid gap-3 rounded-2xl border border-default/70 bg-muted/10 p-4 sm:grid-cols-3"
          >
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Sets</div>
              <div class="mt-1 text-lg font-semibold text-highlighted">
                {{ getSetCount(previewItem) }}
              </div>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                Primary Metric
              </div>
              <div class="mt-1 text-sm font-medium text-highlighted">
                {{ prescriptionColumnLabel(previewItem.prescriptionMode) }}
              </div>
            </div>
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Load</div>
              <div class="mt-1 text-sm font-medium text-highlighted">
                {{
                  previewItem.loadMode && previewItem.loadMode !== 'none'
                    ? loadModeLabel(previewItem.loadMode)
                    : 'None'
                }}
              </div>
            </div>
          </div>

          <div v-if="previewEmbedUrl" class="space-y-2">
            <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Video</div>
            <div class="overflow-hidden rounded-2xl border border-default/70 bg-default shadow-sm">
              <iframe
                :src="previewEmbedUrl"
                title="Exercise video"
                class="aspect-video w-full"
                allow="
                  accelerometer;
                  autoplay;
                  clipboard-write;
                  encrypted-media;
                  gyroscope;
                  picture-in-picture;
                "
                allowfullscreen
              />
            </div>
          </div>

          <div
            v-if="previewItem"
            class="overflow-hidden rounded-2xl border border-default/70 bg-default shadow-sm"
          >
            <div
              class="grid text-[10px] font-black uppercase tracking-[0.24em] text-muted"
              :style="gridTemplateColumns(previewItem)"
            >
              <div class="border-b border-default/70 px-3 py-3">Set</div>
              <div
                v-if="previewItem.loadMode && previewItem.loadMode !== 'none'"
                class="border-b border-default/70 px-3 py-3"
              >
                {{ loadModeLabel(previewItem.loadMode) }}
              </div>
              <div class="border-b border-default/70 px-3 py-3">
                {{ prescriptionColumnLabel(previewItem.prescriptionMode) }}
              </div>
              <div v-if="previewItem.showRestColumn" class="border-b border-default/70 px-3 py-3">
                Rest
              </div>
            </div>

            <div
              v-for="row in previewRows(previewItem)"
              :key="row.id"
              class="grid text-sm"
              :style="gridTemplateColumns(previewItem)"
            >
              <div class="border-b border-default/50 px-3 py-3 font-semibold text-highlighted">
                {{ row.index }}
              </div>
              <div
                v-if="previewItem.loadMode && previewItem.loadMode !== 'none'"
                class="border-b border-default/50 px-3 py-3 text-highlighted"
              >
                {{ row.loadValue || '--' }}
              </div>
              <div class="border-b border-default/50 px-3 py-3 text-highlighted">
                {{ row.value || '--' }}
              </div>
              <div
                v-if="previewItem.showRestColumn"
                class="border-b border-default/50 px-3 py-3 text-highlighted"
              >
                {{ row.restOverride || previewItem.defaultRest || '--' }}
              </div>
            </div>
          </div>

          <div v-if="previewItem?.notes" class="space-y-2">
            <div class="text-[10px] font-black uppercase tracking-[0.22em] text-muted">Notes</div>
            <div
              class="rounded-2xl border border-default/70 bg-muted/10 p-4 text-sm italic text-muted"
            >
              {{ previewItem.notes }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <UModal v-model:open="isEditorOpen" :ui="{ content: 'max-w-5xl' }">
    <template #content>
      <div class="flex flex-col">
        <div class="border-b border-default/70 px-5 py-4">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ editorMode === 'create' ? 'Create Exercise' : 'Edit Exercise' }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            Save a reusable exercise with starter set rows and optional video or coaching notes.
          </p>
        </div>

        <div class="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.95fr)]">
          <div class="space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label
                  class="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-muted"
                >
                  Exercise Title
                </label>
                <div class="flex items-center gap-2">
                  <UInput v-model="form.title" placeholder="Back Squat" class="w-full" />
                  <UButton
                    color="neutral"
                    variant="outline"
                    size="sm"
                    icon="i-tabler-brand-youtube"
                    class="shrink-0 text-red-400 hover:text-red-500"
                    :disabled="!form.title.trim()"
                    @click="openYouTubeSearch(form.title)"
                  />
                </div>
              </div>

              <div>
                <label
                  class="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-muted"
                >
                  Movement Pattern
                </label>
                <USelect
                  v-model="movementPatternSelectValue"
                  :items="movementPatternOptions"
                  class="w-full"
                />
              </div>

              <div>
                <label
                  class="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-muted"
                >
                  Intent
                </label>
                <USelect v-model="intentSelectValue" :items="intentOptions" class="w-full" />
              </div>

              <div class="md:col-span-2">
                <label
                  class="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-muted"
                >
                  Target Muscle Groups
                </label>
                <USelectMenu
                  v-model="form.targetMuscleGroups"
                  multiple
                  :items="muscleGroupOptions"
                  placeholder="Select target muscle groups"
                  class="w-full"
                />
              </div>
            </div>

            <div class="overflow-hidden rounded-2xl border border-default/70 bg-default shadow-sm">
              <div
                class="flex items-center justify-between gap-3 border-b border-default/70 px-4 py-3"
              >
                <div>
                  <div class="text-sm font-semibold text-highlighted">Set Table</div>
                  <div class="text-xs text-muted">
                    Starter rows copied whenever this exercise is inserted.
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-minus"
                    :disabled="form.setRows.length <= 1"
                    @click="removeSetRow"
                  />
                  <div class="min-w-[56px] text-center text-sm font-semibold text-highlighted">
                    {{ form.setRows.length }} set{{ form.setRows.length === 1 ? '' : 's' }}
                  </div>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-heroicons-plus"
                    @click="addSetRow"
                  />
                </div>
              </div>

              <div class="overflow-x-auto">
                <div
                  class="grid min-w-[520px] text-[10px] font-black uppercase tracking-[0.24em] text-muted"
                  :style="gridTemplateColumns(form)"
                >
                  <div class="border-b border-default/70 px-3 py-3">Set</div>
                  <div v-if="form.loadMode !== 'none'" class="border-b border-default/70 px-3 py-3">
                    {{ loadModeLabel(form.loadMode) }}
                  </div>
                  <div class="border-b border-default/70 px-3 py-3">
                    {{ prescriptionColumnLabel(form.prescriptionMode) }}
                  </div>
                  <div v-if="form.showRestColumn" class="border-b border-default/70 px-3 py-3">
                    Rest
                  </div>
                </div>

                <div
                  v-for="row in form.setRows"
                  :key="row.id"
                  class="grid min-w-[520px]"
                  :style="gridTemplateColumns(form)"
                >
                  <div class="border-b border-default/50 px-3 py-3 font-semibold text-highlighted">
                    {{ row.index }}
                  </div>
                  <div v-if="form.loadMode !== 'none'" class="border-b border-default/50 px-3 py-2">
                    <UInput
                      v-model="row.loadValue"
                      :placeholder="loadModePlaceholder(form.loadMode)"
                      class="w-full"
                    />
                  </div>
                  <div class="border-b border-default/50 px-3 py-2">
                    <UInput
                      v-model="row.value"
                      :placeholder="prescriptionPlaceholder(form.prescriptionMode)"
                      class="w-full"
                    />
                  </div>
                  <div v-if="form.showRestColumn" class="border-b border-default/50 px-3 py-2">
                    <UInput v-model="row.restOverride" placeholder="e.g. 60s" class="w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <UCard :ui="{ body: 'space-y-4 p-4' }">
              <div>
                <div class="text-sm font-semibold text-highlighted">Set Table Options</div>
                <div class="text-xs text-muted">
                  Choose which metrics the saved exercise should track by default.
                </div>
              </div>

              <div v-if="isCoachingMode && editorMode === 'create'" class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Library Owner
                </label>
                <USelect v-model="form.ownerScope" :items="createScopeOptions" class="w-full" />
              </div>

              <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Primary Metric
                </label>
                <USelect
                  :model-value="getParameterTokens(form)[0]"
                  :items="primaryParameterOptions"
                  class="w-full"
                  @update:model-value="updateParameter(0, $event)"
                />
              </div>

              <div
                v-for="(token, index) in getParameterTokens(form).slice(1)"
                :key="`${token}-${index}`"
                class="space-y-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <label
                    class="block text-[10px] font-black uppercase tracking-[0.22em] text-muted"
                  >
                    Additional Metric
                  </label>
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-x-mark"
                    @click="removeParameter(index + 1)"
                  />
                </div>
                <USelect
                  :model-value="token"
                  :items="secondaryParameterOptions(form, index + 1)"
                  class="w-full"
                  @update:model-value="updateParameter(index + 1, $event)"
                />
              </div>

              <UButton
                size="sm"
                color="neutral"
                variant="soft"
                icon="i-heroicons-plus"
                :disabled="!canAddParameter(form)"
                @click="addParameter"
              >
                Add Metric
              </UButton>

              <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Default Rest
                </label>
                <UInput v-model="form.defaultRest" placeholder="e.g. 90s" class="w-full" />
              </div>
            </UCard>

            <UCard :ui="{ body: 'space-y-4 p-4' }">
              <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Video URL
                </label>
                <UInput
                  v-model="form.videoUrl"
                  placeholder="https://www.youtube.com/watch?v=..."
                  class="w-full"
                />
              </div>

              <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                  Notes
                </label>
                <UTextarea
                  v-model="form.notes"
                  :rows="6"
                  placeholder="Coaching notes, setup cues, regressions, or special reminders."
                  class="w-full"
                />
              </div>
            </UCard>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-default/70 px-5 py-4">
          <UButton color="neutral" variant="ghost" @click="isEditorOpen = false">Cancel</UButton>
          <UButton color="primary" :loading="saving" @click="saveExercise">
            {{ editorMode === 'create' ? 'Create Exercise' : 'Save Changes' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import {
    getYouTubeEmbedUrl,
    normalizeYouTubeUrl,
    type StrengthLibraryExercise,
    type StrengthLibraryExercisePayload
  } from '~/utils/strengthExerciseLibrary'
  import {
    DEFAULT_LOAD_MODE,
    DEFAULT_PRESCRIPTION_MODE,
    createStrengthSetRow,
    normalizeStrengthSetRows,
    type StrengthLoadMode,
    type StrengthPrescriptionMode,
    type StrengthSetRow
  } from '~/utils/strengthWorkout'

  definePageMeta({
    middleware: ['auth']
  })

  type EditableLibraryExercise = {
    title: string
    movementPattern: string
    intent: string
    targetMuscleGroups: string[]
    notes: string
    videoUrl: string
    ownerScope: 'athlete' | 'coach'
    prescriptionMode: StrengthPrescriptionMode
    loadMode: StrengthLoadMode
    defaultRest: string
    showRestColumn: boolean
    setRows: StrengthSetRow[]
  }

  type ParameterToken =
    | `prescription:${StrengthPrescriptionMode}`
    | `load:${Exclude<StrengthLoadMode, 'none'>}`
    | 'rest'

  const {
    source: librarySource,
    options: librarySourceOptions,
    isCoachingMode
  } = useLibrarySource('exercise-library', {
    itemLabel: 'exercises'
  })

  const toast = useToast()
  const searchQuery = ref('')
  const selectedPattern = ref('all')
  const selectedIntent = ref('all')
  const selectedMuscleGroups = ref<string[]>([])
  const sortBy = ref('updated')
  const isPreviewOpen = ref(false)
  const isEditorOpen = ref(false)
  const saving = ref(false)
  const deletingExerciseId = ref<string | null>(null)
  const editorMode = ref<'create' | 'edit'>('create')
  const editingExerciseId = ref<string | null>(null)
  const previewItem = ref<StrengthLibraryExercise | null>(null)
  const EMPTY_SELECT_VALUE = '__none__'

  const {
    data: exercises,
    refresh,
    status
  } = await useFetch<StrengthLibraryExercise[]>('/api/library/strength-exercises', {
    query: computed(() => ({
      scope: librarySource.value,
      q: searchQuery.value || undefined
    }))
  })
  const loading = computed(() => status.value === 'pending')

  const sortOptions = [
    { label: 'Recently Updated', value: 'updated' },
    { label: 'Title', value: 'title' },
    { label: 'Movement Pattern', value: 'movementPattern' }
  ]

  const movementPatternOptions = [
    { label: 'No specific pattern', value: EMPTY_SELECT_VALUE },
    { label: 'Squat', value: 'squat' },
    { label: 'Hinge', value: 'hinge' },
    { label: 'Push', value: 'push' },
    { label: 'Pull', value: 'pull' },
    { label: 'Lunge', value: 'lunge' },
    { label: 'Core', value: 'core' },
    { label: 'Carry', value: 'carry' },
    { label: 'Mobility', value: 'mobility' }
  ]

  const intentOptions = [
    { label: 'No specific intent', value: EMPTY_SELECT_VALUE },
    { label: 'Max Strength', value: 'max_strength' },
    { label: 'Power', value: 'power' },
    { label: 'Muscular Endurance', value: 'muscular_endurance' },
    { label: 'Prehab', value: 'prehab' }
  ]

  const movementPatternFilterOptions = movementPatternOptions.filter(
    (option) => option.value !== EMPTY_SELECT_VALUE
  )
  const muscleGroupOptions = [
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'forearms',
    'glutes',
    'quadriceps',
    'hamstrings',
    'calves',
    'core',
    'hip_flexors',
    'adductors',
    'abductors',
    'full_body'
  ].map((value) => ({
    label: formatTokenLabel(value),
    value
  }))
  const intentFilterOptions = [
    { label: 'All Intents', value: 'all' },
    ...intentOptions.filter((option) => option.value !== EMPTY_SELECT_VALUE)
  ]

  const prescriptionModeOptions: Array<{ label: string; value: StrengthPrescriptionMode }> = [
    { label: 'Reps', value: 'reps' },
    { label: 'Reps / Side', value: 'reps_per_side' },
    { label: 'Duration', value: 'duration' },
    { label: 'Distance (m)', value: 'distance_meters' },
    { label: 'Distance (km)', value: 'distance_km' },
    { label: 'Distance (ft)', value: 'distance_ft' },
    { label: 'Distance (yd)', value: 'distance_yd' },
    { label: 'Distance (miles)', value: 'distance_miles' }
  ]

  const loadModeOptions: Array<{ label: string; value: StrengthLoadMode }> = [
    { label: 'No Load', value: 'none' },
    { label: 'Generic Load', value: 'generic' },
    { label: 'Weight (lb)', value: 'weight_lb' },
    { label: 'Weight (kg)', value: 'weight_kg' },
    { label: 'Weight / Side (lb)', value: 'weight_per_side_lb' },
    { label: 'Weight / Side (kg)', value: 'weight_per_side_kg' }
  ]

  const primaryParameterOptions: Array<{ label: string; value: ParameterToken }> =
    prescriptionModeOptions.map((option) => ({
      label: option.label,
      value: `prescription:${option.value}` as ParameterToken
    }))

  const createScopeOptions = computed(() => [
    { label: 'Athlete Library', value: 'athlete' },
    ...(isCoachingMode.value ? [{ label: 'Coach Library', value: 'coach' }] : [])
  ])

  function createEmptyForm(): EditableLibraryExercise {
    return {
      title: '',
      movementPattern: '',
      intent: '',
      targetMuscleGroups: [],
      notes: '',
      videoUrl: '',
      ownerScope: isCoachingMode.value && librarySource.value !== 'athlete' ? 'coach' : 'athlete',
      prescriptionMode: DEFAULT_PRESCRIPTION_MODE,
      loadMode: DEFAULT_LOAD_MODE,
      defaultRest: '',
      showRestColumn: false,
      setRows: normalizeStrengthSetRows([{ value: '', loadValue: '', restOverride: '' }])
    }
  }

  const form = reactive<EditableLibraryExercise>(createEmptyForm())

  const exerciseItems = computed(() => (Array.isArray(exercises.value) ? exercises.value : []))

  const filteredExercises = computed(() => {
    let result = [...exerciseItems.value]

    if (selectedPattern.value !== 'all') {
      result = result.filter((exercise) => exercise.movementPattern === selectedPattern.value)
    }

    if (selectedIntent.value !== 'all') {
      result = result.filter((exercise) => exercise.intent === selectedIntent.value)
    }

    if (selectedMuscleGroups.value.length) {
      result = result.filter((exercise) =>
        selectedMuscleGroups.value.every((muscle) =>
          Array.isArray(exercise.targetMuscleGroups)
            ? exercise.targetMuscleGroups.includes(muscle)
            : false
        )
      )
    }

    result.sort((a, b) => {
      if (sortBy.value === 'title') return (a.title || '').localeCompare(b.title || '')
      if (sortBy.value === 'movementPattern') {
        return (a.movementPattern || '').localeCompare(b.movementPattern || '')
      }
      const aUpdated = new Date((a as any).updatedAt || (a as any).createdAt || 0).getTime()
      const bUpdated = new Date((b as any).updatedAt || (b as any).createdAt || 0).getTime()
      return bUpdated - aUpdated
    })

    return result
  })

  const previewEmbedUrl = computed(() => getYouTubeEmbedUrl(previewItem.value?.videoUrl))

  const movementPatternSelectValue = computed({
    get: () => selectValue(form.movementPattern),
    set: (value) => {
      form.movementPattern = normalizeSelectValue(value)
    }
  })

  const intentSelectValue = computed({
    get: () => selectValue(form.intent),
    set: (value) => {
      form.intent = normalizeSelectValue(value)
    }
  })

  function selectValue(value: unknown) {
    const normalized = String(value || '').trim()
    return normalized || EMPTY_SELECT_VALUE
  }

  function normalizeSelectValue(value: unknown) {
    const normalized = String(value || '').trim()
    return normalized === EMPTY_SELECT_VALUE ? '' : normalized
  }

  function resetForm() {
    Object.assign(form, createEmptyForm())
  }

  function getSetCount(exercise: { sets?: number; setRows?: StrengthSetRow[] }) {
    return Math.max(Number(exercise.sets || exercise.setRows?.length || 1), 1)
  }

  function previewRows(exercise: { setRows?: StrengthSetRow[] }) {
    return normalizeStrengthSetRows(exercise.setRows)
  }

  function prescriptionColumnLabel(mode: StrengthPrescriptionMode | undefined) {
    switch (mode) {
      case 'reps_per_side':
        return 'Reps / Side'
      case 'duration':
        return 'Duration'
      case 'distance_meters':
        return 'Distance (m)'
      case 'distance_km':
        return 'Distance (km)'
      case 'distance_ft':
        return 'Distance (ft)'
      case 'distance_yd':
        return 'Distance (yd)'
      case 'distance_miles':
        return 'Distance (miles)'
      default:
        return 'Reps'
    }
  }

  function loadModeLabel(mode: StrengthLoadMode | undefined) {
    switch (mode) {
      case 'weight_lb':
        return 'Weight (lb)'
      case 'weight_kg':
        return 'Weight (kg)'
      case 'weight_per_side_lb':
        return 'Weight / Side (lb)'
      case 'weight_per_side_kg':
        return 'Weight / Side (kg)'
      default:
        return 'Load'
    }
  }

  function prescriptionPlaceholder(mode: StrengthPrescriptionMode | undefined) {
    switch (mode) {
      case 'reps_per_side':
        return 'Reps / side'
      case 'duration':
        return 'Seconds'
      case 'distance_meters':
        return 'Meters'
      case 'distance_km':
        return 'Kilometers'
      case 'distance_ft':
        return 'Feet'
      case 'distance_yd':
        return 'Yards'
      case 'distance_miles':
        return 'Miles'
      default:
        return 'Reps'
    }
  }

  function loadModePlaceholder(mode: StrengthLoadMode | undefined) {
    switch (mode) {
      case 'weight_lb':
        return 'lb'
      case 'weight_kg':
        return 'kg'
      case 'weight_per_side_lb':
        return 'lb / side'
      case 'weight_per_side_kg':
        return 'kg / side'
      default:
        return 'Load'
    }
  }

  function formatTokenLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }

  function getParameterTokens(target: {
    prescriptionMode: StrengthPrescriptionMode
    loadMode: StrengthLoadMode
    showRestColumn?: boolean
  }): ParameterToken[] {
    const tokens: ParameterToken[] = [
      `prescription:${target.prescriptionMode || DEFAULT_PRESCRIPTION_MODE}` as ParameterToken
    ]

    if (target.loadMode && target.loadMode !== 'none') {
      tokens.push(`load:${target.loadMode as Exclude<StrengthLoadMode, 'none'>}` as ParameterToken)
    }

    if (target.showRestColumn) {
      tokens.push('rest')
    }

    return tokens
  }

  function availableSecondaryParameterOptions(
    selected: ParameterToken[],
    current?: ParameterToken
  ) {
    const options: Array<{ label: string; value: ParameterToken }> = [
      ...loadModeOptions
        .filter((option) => option.value !== 'none')
        .map((option) => ({
          label: option.label,
          value: `load:${option.value as Exclude<StrengthLoadMode, 'none'>}` as ParameterToken
        })),
      { label: 'Rest Override', value: 'rest' as ParameterToken }
    ]

    return options.filter((option) => option.value === current || !selected.includes(option.value))
  }

  function canAddParameter(target: {
    prescriptionMode: StrengthPrescriptionMode
    loadMode: StrengthLoadMode
    showRestColumn?: boolean
  }) {
    return availableSecondaryParameterOptions(getParameterTokens(target)).length > 0
  }

  function updatePrescriptionMode(target: EditableLibraryExercise, value: unknown) {
    target.prescriptionMode = String(value || DEFAULT_PRESCRIPTION_MODE) as StrengthPrescriptionMode
    target.setRows = normalizeStrengthSetRows(
      target.setRows.map((row) => ({ ...row, value: '' })),
      target.setRows.length
    )
  }

  function updateLoadMode(target: EditableLibraryExercise, value: unknown) {
    target.loadMode = String(value || DEFAULT_LOAD_MODE) as StrengthLoadMode
    if (target.loadMode === 'none') {
      target.setRows = normalizeStrengthSetRows(
        target.setRows.map((row) => ({ ...row, loadValue: '' })),
        target.setRows.length
      )
    }
  }

  function toggleRestOverrideColumn(target: EditableLibraryExercise, value: unknown) {
    const enabled = Boolean(value)
    target.showRestColumn = enabled
    if (!enabled) {
      target.setRows = normalizeStrengthSetRows(
        target.setRows.map((row) => ({ ...row, restOverride: '' })),
        target.setRows.length
      )
    }
  }

  function setPrimaryParameter(target: EditableLibraryExercise, value: ParameterToken) {
    const mode = String(value || `prescription:${DEFAULT_PRESCRIPTION_MODE}`).replace(
      'prescription:',
      ''
    ) as StrengthPrescriptionMode

    if (target.prescriptionMode === mode) return
    updatePrescriptionMode(target, mode)
  }

  function applyParameterTokens(target: EditableLibraryExercise, tokens: ParameterToken[]) {
    const nextPrimary = tokens.find((token) => token.startsWith('prescription:'))
    setPrimaryParameter(
      target,
      nextPrimary || (`prescription:${DEFAULT_PRESCRIPTION_MODE}` as ParameterToken)
    )

    const nextLoad = tokens.find((token) => token.startsWith('load:'))
    updateLoadMode(target, nextLoad ? nextLoad.replace('load:', '') : DEFAULT_LOAD_MODE)

    toggleRestOverrideColumn(target, tokens.includes('rest'))
  }

  function secondaryParameterOptions(target: EditableLibraryExercise, index: number) {
    const tokens = getParameterTokens(target)
    return availableSecondaryParameterOptions(
      tokens.filter((_, tokenIndex) => tokenIndex !== index),
      tokens[index]
    )
  }

  function updateParameter(index: number, value: unknown) {
    const tokens = getParameterTokens(form)
    tokens[index] = String(value) as ParameterToken
    applyParameterTokens(form, tokens)
  }

  function addParameter() {
    const tokens = getParameterTokens(form)
    const next = availableSecondaryParameterOptions(tokens)[0]
    if (!next) {
      toast.add({
        title: 'No More Metrics',
        description: 'This exercise already has all available additional metrics.',
        color: 'neutral'
      })
      return
    }
    tokens.push(next.value)
    applyParameterTokens(form, tokens)
  }

  function removeParameter(index: number) {
    if (index === 0) return
    const tokens = getParameterTokens(form).filter((_, tokenIndex) => tokenIndex !== index)
    applyParameterTokens(form, tokens)
  }

  function addSetRow() {
    const previousRow = form.setRows[form.setRows.length - 1]
    form.setRows = normalizeStrengthSetRows(
      [
        ...form.setRows,
        createStrengthSetRow({
          value: String(previousRow?.value || '').trim(),
          loadValue: String(previousRow?.loadValue || '').trim(),
          restOverride: String(previousRow?.restOverride || '').trim()
        })
      ],
      form.setRows.length + 1
    )
  }

  function removeSetRow() {
    if (form.setRows.length <= 1) return
    form.setRows = normalizeStrengthSetRows(form.setRows.slice(0, -1))
  }

  function mapExerciseToForm(exercise: StrengthLibraryExercise): EditableLibraryExercise {
    return {
      title: exercise.title || '',
      movementPattern: exercise.movementPattern || '',
      intent: exercise.intent || '',
      targetMuscleGroups: Array.isArray(exercise.targetMuscleGroups)
        ? [...exercise.targetMuscleGroups]
        : [],
      notes: exercise.notes || '',
      videoUrl: exercise.videoUrl || '',
      ownerScope: exercise.ownerScope === 'coach' && isCoachingMode.value ? 'coach' : 'athlete',
      prescriptionMode: exercise.prescriptionMode || DEFAULT_PRESCRIPTION_MODE,
      loadMode: exercise.loadMode || DEFAULT_LOAD_MODE,
      defaultRest: exercise.defaultRest || exercise.rest || '',
      showRestColumn: Boolean(
        exercise.setRows?.some((row) => String(row.restOverride || '').trim())
      ),
      setRows: normalizeStrengthSetRows(exercise.setRows)
    }
  }

  function buildPayload(): StrengthLibraryExercisePayload {
    const title = String(form.title || '').trim()
    if (!title) throw new Error('Exercise title is required')

    const payload: StrengthLibraryExercisePayload = {
      title,
      movementPattern: form.movementPattern || undefined,
      intent: form.intent || undefined,
      targetMuscleGroups: form.targetMuscleGroups,
      notes: form.notes || undefined,
      videoUrl: form.videoUrl || undefined,
      ownerScope: editorMode.value === 'create' ? form.ownerScope : undefined,
      prescriptionMode: form.prescriptionMode,
      loadMode: form.loadMode,
      defaultRest: form.defaultRest || undefined,
      setRows: form.setRows.map((row) => ({
        id: row.id,
        index: row.index,
        value: String(row.value || '').trim() || undefined,
        loadValue: String(row.loadValue || '').trim() || undefined,
        restOverride: String(row.restOverride || '').trim() || undefined
      }))
    }

    if (payload.videoUrl) {
      const normalized = normalizeYouTubeUrl(payload.videoUrl)
      if (!normalized) throw new Error('Only valid YouTube URLs are supported for exercise videos')
      payload.videoUrl = normalized
    }

    return payload
  }

  function openCreateModal() {
    editorMode.value = 'create'
    editingExerciseId.value = null
    resetForm()
    isEditorOpen.value = true
  }

  function openEditModal(exercise: StrengthLibraryExercise) {
    editorMode.value = 'edit'
    editingExerciseId.value = exercise.id
    Object.assign(form, mapExerciseToForm(exercise))
    isEditorOpen.value = true
    isPreviewOpen.value = false
  }

  function openPreview(exercise: StrengthLibraryExercise) {
    previewItem.value = exercise
    isPreviewOpen.value = true
  }

  async function saveExercise() {
    saving.value = true
    try {
      const body = buildPayload()
      await $fetch(
        editorMode.value === 'edit' && editingExerciseId.value
          ? `/api/library/strength-exercises/${editingExerciseId.value}`
          : '/api/library/strength-exercises',
        {
          method: editorMode.value === 'edit' ? 'PATCH' : 'POST',
          body
        }
      )

      await refresh()
      isEditorOpen.value = false
      toast.add({
        title: editorMode.value === 'edit' ? 'Exercise Updated' : 'Exercise Created',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Save Failed',
        description: error.data?.message || error.message || 'Could not save this exercise.',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }

  async function deleteExercise(exercise: StrengthLibraryExercise) {
    if (!window.confirm(`Delete "${exercise.title}" from the exercise library?`)) return
    deletingExerciseId.value = exercise.id
    try {
      await $fetch(`/api/library/strength-exercises/${exercise.id}`, { method: 'DELETE' })
      if (previewItem.value?.id === exercise.id) {
        isPreviewOpen.value = false
        previewItem.value = null
      }
      await refresh()
      toast.add({
        title: 'Exercise Deleted',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Delete Failed',
        description: error.data?.message || 'Could not delete this exercise.',
        color: 'error'
      })
    } finally {
      deletingExerciseId.value = null
    }
  }

  function openYouTubeSearch(title: string) {
    if (!title.trim()) return
    window.open(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(title).replace(/%20/g, '+')}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  function gridTemplateColumns(target: { loadMode?: StrengthLoadMode; showRestColumn?: boolean }) {
    const columns = ['72px']
    if (target.loadMode && target.loadMode !== 'none') columns.push('minmax(120px, 180px)')
    columns.push('minmax(140px, 1fr)')
    if (target.showRestColumn) columns.push('minmax(110px, 140px)')
    return {
      gridTemplateColumns: columns.join(' ')
    }
  }
</script>
