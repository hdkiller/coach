<template>
  <div class="space-y-5">
    <div class="rounded-xl border border-primary/15 bg-primary/5 p-4">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="text-sm font-semibold text-highlighted">Edit Strength Routine</div>
            <div class="text-sm text-muted">
              Build the session block by block, then prescribe each exercise one set row at a time.
            </div>
          </div>
          <div
            class="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wider text-muted"
          >
            <span>{{ summary.blockCount }} block{{ summary.blockCount === 1 ? '' : 's' }}</span>
            <span
              >{{ summary.exerciseCount }} exercise{{
                summary.exerciseCount === 1 ? '' : 's'
              }}</span
            >
            <span>{{ summary.totalSets }} sets</span>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div class="rounded-xl border border-default/60 bg-default/70 p-3">
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted">Blocks</div>
            <div class="mt-1 text-xl font-semibold text-highlighted">{{ summary.blockCount }}</div>
          </div>
          <div class="rounded-xl border border-default/60 bg-default/70 p-3">
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted">Exercises</div>
            <div class="mt-1 text-xl font-semibold text-highlighted">
              {{ summary.exerciseCount }}
            </div>
          </div>
          <div class="rounded-xl border border-default/60 bg-default/70 p-3">
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted">Sets</div>
            <div class="mt-1 text-xl font-semibold text-highlighted">{{ summary.totalSets }}</div>
          </div>
          <div class="rounded-xl border border-default/60 bg-default/70 p-3">
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted">Duration (min)</div>
            <UInput v-model.number="manualDurationMinutes" type="number" min="1" class="mt-2" />
          </div>
          <div class="rounded-xl border border-default/60 bg-default/70 p-3">
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted">TSS Override</div>
            <UInput
              v-model="manualTssInput"
              type="number"
              min="0"
              step="1"
              class="mt-2"
              placeholder="Auto"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-if="localBlocks.length" class="space-y-4">
      <div
        v-for="(block, blockIndex) in localBlocks"
        :key="block.id"
        class="overflow-hidden rounded-2xl border border-default/70 bg-default/70 shadow-sm"
      >
        <div class="border-b border-default/70 bg-muted/20 px-4 py-4 sm:px-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1 space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="primary" variant="soft" size="sm" class="uppercase tracking-wide">
                  {{ blockTypeLabel(block.type) }}
                </UBadge>
                <div class="text-xs uppercase tracking-[0.18em] text-muted">
                  {{ block.steps.length }} exercise{{ block.steps.length === 1 ? '' : 's' }}
                </div>
              </div>

              <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
                <UInput v-model="block.title" size="lg" placeholder="Block title" />
                <UInput
                  v-model.number="block.durationSec"
                  type="number"
                  min="0"
                  placeholder="Block duration (s)"
                />
              </div>

              <UTextarea
                v-model="block.notes"
                :rows="2"
                autoresize
                placeholder="Block notes or coach instructions..."
              />
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton size="xs" color="neutral" variant="soft" @click="moveBlock(blockIndex, -1)">
                Up
              </UButton>
              <UButton size="xs" color="neutral" variant="soft" @click="moveBlock(blockIndex, 1)">
                Down
              </UButton>
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                @click="openLibraryPicker(blockIndex)"
              >
                Add Exercise
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                :disabled="localBlocks.length === 1"
                @click="removeBlock(blockIndex)"
              >
                Delete Block
              </UButton>
            </div>
          </div>
        </div>

        <div v-if="block.steps.length" class="p-4 sm:p-5">
          <draggable
            v-model="block.steps"
            item-key="id"
            handle=".drag-handle"
            ghost-class="opacity-50"
            chosen-class="strength-step-chosen"
            class="space-y-3"
            @start="startExerciseDrag(block, $event)"
            @end="endExerciseDrag"
          >
            <template #item="{ element: step, index: stepIndex }">
              <div
                :class="[
                  'rounded-xl border border-default/70 bg-default p-4 shadow-sm transition-all',
                  isStepBeingDragged(step) ? 'strength-step-dragging' : ''
                ]"
              >
                <div class="space-y-4">
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div class="min-w-0 flex-1 space-y-3">
                      <div class="flex flex-wrap items-center gap-2">
                        <UButton
                          color="neutral"
                          variant="ghost"
                          size="xs"
                          icon="i-heroicons-bars-3"
                          class="drag-handle cursor-grab active:cursor-grabbing"
                        />
                        <div
                          class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                        >
                          Exercise {{ stepIndex + 1 }}
                        </div>
                        <UBadge
                          v-if="step.libraryExerciseId"
                          color="primary"
                          variant="soft"
                          size="sm"
                          class="uppercase tracking-wide"
                        >
                          Saved Exercise
                        </UBadge>
                      </div>

                      <div class="space-y-3">
                        <div class="flex gap-2">
                          <UButton
                            color="neutral"
                            variant="outline"
                            class="min-w-0 flex-1 justify-start truncate"
                            @click="openLibraryPicker(blockIndex, stepIndex)"
                          >
                            {{ step.name || 'Select Exercise' }}
                          </UButton>
                          <UButton
                            v-if="step.name"
                            :to="getYouTubeSearchUrl(step.name)"
                            target="_blank"
                            rel="noopener noreferrer"
                            color="neutral"
                            variant="ghost"
                            icon="i-simple-icons-youtube"
                            aria-label="Search YouTube for this exercise"
                          />
                        </div>
                      </div>
                    </div>

                    <div class="flex flex-wrap gap-2">
                      <UButton size="xs" color="neutral" variant="soft" @click="addSetRow(step)">
                        + Set
                      </UButton>
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="soft"
                        :disabled="step.setRows.length <= 1"
                        @click="removeSetRow(step)"
                      >
                        - Set
                      </UButton>
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="soft"
                        @click="openAdvancedStep(blockIndex, stepIndex)"
                      >
                        Details
                      </UButton>
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="soft"
                        :loading="savingLibraryExerciseId === step.id"
                        @click="saveStepToLibrary(step)"
                      >
                        {{ step.libraryExerciseId ? 'Update Saved' : 'Save to Library' }}
                      </UButton>
                      <UButton
                        size="xs"
                        color="error"
                        variant="ghost"
                        @click="removeStep(blockIndex, stepIndex)"
                      >
                        Delete
                      </UButton>
                    </div>
                  </div>

                  <div
                    v-if="isDraggingExercises"
                    class="rounded-xl border border-dashed border-default/70 bg-muted/10 px-4 py-3 text-sm text-muted"
                  >
                    {{ step.setRows.length }} set{{ step.setRows.length === 1 ? '' : 's' }}
                  </div>

                  <div v-else class="overflow-x-auto rounded-xl border border-default/70">
                    <table class="min-w-full divide-y divide-default/70 text-sm xl:table-fixed">
                      <colgroup>
                        <col style="width: 88px" />
                        <col v-if="step.loadMode !== 'none'" style="width: 220px" />
                        <col />
                        <col v-if="step.showRestColumn" style="width: 180px" />
                      </colgroup>
                      <thead class="bg-muted/10">
                        <tr>
                          <th
                            class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                          >
                            Set
                          </th>
                          <th
                            v-if="step.loadMode !== 'none'"
                            class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                          >
                            {{ loadModeLabel(step.loadMode) }}
                          </th>
                          <th
                            class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                          >
                            {{ prescriptionColumnLabel(step.prescriptionMode) }}
                          </th>
                          <th
                            v-if="step.showRestColumn"
                            class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                          >
                            Rest Override
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-default/70">
                        <tr v-for="row in step.setRows" :key="row.id">
                          <td class="px-3 py-2 font-medium text-highlighted">{{ row.index }}</td>
                          <td v-if="step.loadMode !== 'none'" class="px-3 py-2">
                            <UInput
                              v-model="row.loadValue"
                              :placeholder="loadModePlaceholder(step.loadMode)"
                            />
                          </td>
                          <td class="px-3 py-2">
                            <UInput
                              v-model="row.value"
                              :placeholder="prescriptionPlaceholder(step.prescriptionMode)"
                            />
                          </td>
                          <td v-if="step.showRestColumn" class="px-3 py-2">
                            <UInput v-model="row.restOverride" placeholder="Use default" />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div
                    v-if="step.notes && !isDraggingExercises"
                    class="rounded-lg bg-muted/15 px-3 py-2 text-sm text-muted"
                  >
                    {{ step.notes }}
                  </div>
                </div>
              </div>
            </template>
          </draggable>
        </div>
        <div
          v-else
          class="m-4 rounded-xl border border-dashed border-default/70 bg-muted/10 p-5 text-sm text-muted sm:m-5"
        >
          No exercises in this block yet.
        </div>
      </div>
    </div>

    <div
      class="sticky bottom-0 flex flex-col gap-3 rounded-xl border border-default/70 bg-default/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
    >
      <UButton
        color="primary"
        variant="soft"
        icon="i-heroicons-plus"
        size="lg"
        @click="isBlockTypeModalOpen = true"
      >
        Add Block
      </UButton>
      <div class="flex gap-2">
        <UButton color="neutral" variant="ghost" size="lg" @click="$emit('cancel')">Cancel</UButton>
        <UButton color="primary" size="lg" @click="saveChanges">Save Routine</UButton>
      </div>
    </div>

    <UModal
      v-model:open="isBlockTypeModalOpen"
      title="Add Block"
      description="Choose the type of block you want to add to this routine."
    >
      <template #body>
        <div class="grid gap-3 p-6 sm:grid-cols-2">
          <UButton
            v-for="blockType in blockTypeOptions"
            :key="blockType.value"
            color="neutral"
            variant="outline"
            class="justify-start"
            @click="addBlock(blockType.value)"
          >
            {{ blockType.label }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isLibraryModalOpen"
      title="Add Exercise"
      description="Search your saved exercises or create a new custom exercise."
      :ui="{ content: 'sm:max-w-3xl' }"
    >
      <template #body>
        <div class="space-y-4 p-6">
          <UInput
            v-model="libraryQuery"
            icon="i-heroicons-magnifying-glass"
            class="w-full"
            placeholder="Search exercises, notes, or movement pattern..."
          />

          <div class="flex justify-between gap-2">
            <div class="text-sm text-muted">Pick an existing exercise or create a new one.</div>
            <UButton size="sm" color="primary" variant="soft" @click="openCustomExerciseModal">
              Create Custom Exercise
            </UButton>
          </div>

          <div
            v-if="libraryLoading"
            class="rounded-xl border border-default/70 bg-muted/10 p-4 text-sm text-muted"
          >
            Loading saved exercises...
          </div>
          <div
            v-else-if="!libraryItems.length"
            class="rounded-xl border border-dashed border-default/70 bg-muted/10 p-5 text-sm text-muted"
          >
            No saved exercises match this search yet.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="item in libraryItems"
              :key="item.id"
              class="flex flex-col gap-3 rounded-xl border border-default/70 bg-default p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <div class="font-semibold text-highlighted">{{ item.title }}</div>
                  <UBadge v-if="item.ownerScope" color="neutral" variant="soft" size="sm">
                    {{ item.ownerScope }}
                  </UBadge>
                  <UBadge v-if="item.movementPattern" color="neutral" variant="subtle" size="sm">
                    {{ formatOptionLabel(item.movementPattern) }}
                  </UBadge>
                  <UBadge v-if="item.prescriptionMode" color="neutral" variant="subtle" size="sm">
                    {{ prescriptionColumnLabel(item.prescriptionMode) }}
                  </UBadge>
                </div>
                <div class="text-sm text-muted">
                  <span>{{ item.setRows?.length || item.sets || 1 }} sets</span>
                  <span v-if="item.defaultRest || item.rest" class="mx-1">•</span>
                  <span v-if="item.defaultRest || item.rest">
                    Rest {{ item.defaultRest || item.rest }}
                  </span>
                </div>
                <div v-if="item.notes" class="line-clamp-2 text-sm text-muted">
                  {{ item.notes }}
                </div>
              </div>
              <div class="flex shrink-0 gap-2">
                <UButton size="sm" color="primary" @click="selectLibraryExercise(item)">
                  Use Exercise
                </UButton>
                <UButton
                  size="sm"
                  color="error"
                  variant="ghost"
                  :loading="deletingLibraryExerciseId === item.id"
                  @click="deleteLibraryExercise(item)"
                >
                  Delete
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isCustomExerciseModalOpen"
      title="Create Custom Exercise"
      description="Create a saved exercise with a starter set table and insert it into the active block."
      :ui="{ content: 'sm:max-w-4xl' }"
    >
      <template #body>
        <div class="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div class="space-y-4">
            <UInput v-model="customExerciseForm.title" placeholder="Exercise title" />
            <USelect
              :items="movementPatternOptions"
              :model-value="selectValue(customExerciseForm.movementPattern)"
              class="w-full"
              @update:model-value="
                customExerciseForm.movementPattern = normalizeSelectValue($event)
              "
            />
            <USelect
              :items="intentOptions"
              :model-value="selectValue(customExerciseForm.intent)"
              class="w-full"
              @update:model-value="customExerciseForm.intent = normalizeSelectValue($event)"
            />
            <UInput v-model="customExerciseForm.videoUrl" placeholder="Video URL" />
            <UTextarea
              v-model="customExerciseForm.notes"
              :rows="4"
              autoresize
              placeholder="Instructions or coaching notes..."
            />
          </div>

          <div class="space-y-4">
            <div class="space-y-3 rounded-xl border border-default/70 bg-muted/10 p-4">
              <div class="text-sm font-semibold text-highlighted">Parameters</div>
              <div
                v-for="(parameter, parameterIndex) in getCustomParameterTokens()"
                :key="`custom-parameter-${parameterIndex}`"
                class="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)_auto]"
              >
                <div
                  class="flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-muted"
                >
                  {{ parameterIndex === 0 ? 'Primary Metric' : 'Additional Metric' }}
                </div>
                <USelect
                  :items="
                    parameterIndex === 0
                      ? primaryParameterOptions
                      : secondaryParameterOptions(customExerciseForm, parameterIndex)
                  "
                  :model-value="parameter"
                  class="w-full"
                  @update:model-value="updateCustomParameter(parameterIndex, $event)"
                />
                <UButton
                  v-if="parameterIndex > 0"
                  size="sm"
                  color="error"
                  variant="ghost"
                  @click="removeCustomParameter(parameterIndex)"
                >
                  Remove
                </UButton>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="soft"
                  :disabled="!canAddParameter(customExerciseForm)"
                  @click="addCustomParameter"
                >
                  Add Parameter
                </UButton>
                <UInput
                  v-if="customExerciseForm.showRestColumn"
                  v-model="customExerciseForm.defaultRest"
                  class="max-w-48"
                  placeholder="Default rest"
                />
              </div>
            </div>

            <div class="rounded-xl border border-default/70">
              <div class="flex items-center justify-between border-b border-default/70 px-4 py-3">
                <div class="text-sm font-semibold text-highlighted">Starter Set Rows</div>
                <div class="flex gap-2">
                  <UButton size="xs" color="neutral" variant="soft" @click="addCustomSetRow">
                    + Set
                  </UButton>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="soft"
                    :disabled="customExerciseForm.setRows.length <= 1"
                    @click="removeCustomSetRow"
                  >
                    - Set
                  </UButton>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-default/70 text-sm">
                  <thead class="bg-muted/10">
                    <tr>
                      <th
                        class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                      >
                        Set
                      </th>
                      <th
                        v-if="customExerciseForm.loadMode !== 'none'"
                        class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                      >
                        {{ loadModeLabel(customExerciseForm.loadMode) }}
                      </th>
                      <th
                        class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                      >
                        {{ prescriptionColumnLabel(customExerciseForm.prescriptionMode) }}
                      </th>
                      <th
                        v-if="customExerciseForm.showRestColumn"
                        class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
                      >
                        Rest Override
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-default/70">
                    <tr v-for="row in customExerciseForm.setRows" :key="row.id">
                      <td class="px-3 py-2 font-medium text-highlighted">{{ row.index }}</td>
                      <td v-if="customExerciseForm.loadMode !== 'none'" class="px-3 py-2">
                        <UInput
                          v-model="row.loadValue"
                          :placeholder="loadModePlaceholder(customExerciseForm.loadMode)"
                        />
                      </td>
                      <td class="px-3 py-2">
                        <UInput
                          v-model="row.value"
                          :placeholder="
                            prescriptionPlaceholder(customExerciseForm.prescriptionMode)
                          "
                        />
                      </td>
                      <td v-if="customExerciseForm.showRestColumn" class="px-3 py-2">
                        <UInput v-model="row.restOverride" placeholder="Use default" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isCustomExerciseModalOpen = false">
            Cancel
          </UButton>
          <UButton color="primary" :loading="creatingCustomExercise" @click="createCustomExercise">
            Save and Insert
          </UButton>
        </div>
      </template>
    </UModal>

    <USlideover
      v-model:open="isAdvancedOpen"
      side="right"
      title="Exercise Details"
      description="Edit exercise metadata, coaching notes, and video details."
    >
      <template #content>
        <div v-if="activeStep" class="flex h-full flex-col gap-4 p-6">
          <UInput v-model="activeStep.name" placeholder="Exercise name" size="lg" />

          <div class="grid gap-3 md:grid-cols-2">
            <USelect
              :items="movementPatternOptions"
              :model-value="selectValue(activeStep.movementPattern)"
              @update:model-value="activeStep.movementPattern = normalizeSelectValue($event)"
            />
            <USelect
              :items="intentOptions"
              :model-value="selectValue(activeStep.intent)"
              @update:model-value="activeStep.intent = normalizeSelectValue($event)"
            />
          </div>

          <UInput v-model="activeStep.videoUrl" placeholder="Video URL" />

          <div class="rounded-xl border border-default/70 bg-muted/10 p-4">
            <div class="text-sm font-semibold text-highlighted">Set Table Options</div>
            <div class="mt-3 space-y-3">
              <div
                v-for="(parameter, parameterIndex) in getStepParameterTokens(activeStep)"
                :key="`${activeStep.id}-parameter-${parameterIndex}`"
                class="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)_auto]"
              >
                <div
                  class="flex items-center text-xs font-semibold uppercase tracking-[0.18em] text-muted"
                >
                  {{ parameterIndex === 0 ? 'Primary Metric' : 'Additional Metric' }}
                </div>
                <USelect
                  :items="
                    parameterIndex === 0
                      ? primaryParameterOptions
                      : secondaryParameterOptions(activeStep, parameterIndex)
                  "
                  :model-value="parameter"
                  @update:model-value="updateStepParameter(activeStep, parameterIndex, $event)"
                />
                <UButton
                  v-if="parameterIndex > 0"
                  size="sm"
                  color="error"
                  variant="ghost"
                  @click="removeStepParameter(activeStep, parameterIndex)"
                >
                  Remove
                </UButton>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="soft"
                  :disabled="!canAddParameter(activeStep)"
                  @click="addStepParameter(activeStep)"
                >
                  Add Parameter
                </UButton>
                <UInput
                  v-if="activeStep.showRestColumn"
                  v-model="activeStep.defaultRest"
                  class="max-w-48"
                  placeholder="Default rest"
                />
              </div>
            </div>
          </div>

          <div
            v-if="getYouTubeEmbedUrl(activeStep.videoUrl)"
            class="overflow-hidden rounded-xl border border-default/70 bg-default"
          >
            <iframe
              :src="getYouTubeEmbedUrl(activeStep.videoUrl) || undefined"
              title="Exercise video preview"
              class="aspect-video w-full"
              loading="lazy"
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

          <UTextarea
            v-model="activeStep.notes"
            :rows="6"
            autoresize
            placeholder="Instructions, form cues, substitutions..."
          />

          <div class="mt-auto flex gap-2">
            <UButton
              color="neutral"
              variant="soft"
              :loading="savingLibraryExerciseId === activeStep.id"
              @click="saveActiveStepToLibrary"
            >
              {{ activeStep.libraryExerciseId ? 'Update Saved Exercise' : 'Save to Library' }}
            </UButton>
            <UButton color="primary" @click="isAdvancedOpen = false">Done</UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
  import draggable from 'vuedraggable'
  import {
    DEFAULT_LOAD_MODE,
    DEFAULT_PRESCRIPTION_MODE,
    createStrengthBlock,
    createStrengthSetRow,
    flattenStrengthBlocksToExercises,
    normalizeStrengthBlocks,
    normalizeStrengthSetRows,
    summarizeStrengthBlocks,
    type StrengthBlock,
    type StrengthBlockStep,
    type StrengthBlockType,
    type StrengthLoadMode,
    type StrengthPrescriptionMode,
    type StrengthSetRow
  } from '~/utils/strengthWorkout'
  import {
    getYouTubeEmbedUrl,
    mapLibraryExerciseToWorkoutStep,
    normalizeYouTubeUrl,
    type StrengthLibraryExercise,
    type StrengthLibraryExercisePayload
  } from '~/utils/strengthExerciseLibrary'

  const props = defineProps<{
    structuredWorkout?: any
    exercises?: any[]
    ownerScope?: 'athlete' | 'coach'
    initialDurationSec?: number | null
    initialTss?: number | null
    openStepTarget?: { blockIndex: number; stepIndex: number; requestId?: number } | null
  }>()

  const emit = defineEmits(['save', 'cancel'])
  const toast = useToast()

  const EMPTY_SELECT_VALUE = '__none__'

  const blockTypeOptions: Array<{ label: string; value: StrengthBlockType }> = [
    { label: 'Warm Up', value: 'warmup' },
    { label: 'Single Exercise', value: 'single_exercise' },
    { label: 'Cooldown', value: 'cooldown' },
    { label: 'Superset', value: 'superset' },
    { label: 'Circuit', value: 'circuit' }
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

  type ParameterToken =
    | `prescription:${StrengthPrescriptionMode}`
    | `load:${Exclude<StrengthLoadMode, 'none'>}`
    | 'rest'

  const primaryParameterOptions: Array<{ label: string; value: ParameterToken }> =
    prescriptionModeOptions.map((option) => ({
      label: option.label,
      value: `prescription:${option.value}` as ParameterToken
    }))

  const intentOptions = [
    { label: 'No specific intent', value: EMPTY_SELECT_VALUE },
    { label: 'Max Strength', value: 'max_strength' },
    { label: 'Power', value: 'power' },
    { label: 'Muscular Endurance', value: 'muscular_endurance' },
    { label: 'Prehab', value: 'prehab' }
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

  const localBlocks = ref<StrengthBlock[]>([])
  const isBlockTypeModalOpen = ref(false)
  const isLibraryModalOpen = ref(false)
  const isCustomExerciseModalOpen = ref(false)
  const isAdvancedOpen = ref(false)
  const libraryItems = ref<StrengthLibraryExercise[]>([])
  const libraryLoading = ref(false)
  const libraryQuery = ref('')
  const creatingCustomExercise = ref(false)
  const savingLibraryExerciseId = ref<string | null>(null)
  const deletingLibraryExerciseId = ref<string | null>(null)
  const isDraggingExercises = ref(false)
  const draggedStepId = ref<string | null>(null)
  const pickerTarget = reactive<{ blockIndex: number; stepIndex: number | null }>({
    blockIndex: 0,
    stepIndex: null
  })
  const activeTarget = ref<{ blockIndex: number; stepIndex: number } | null>(null)
  let libraryQueryTimer: ReturnType<typeof setTimeout> | null = null

  const customExerciseForm = reactive<{
    title: string
    movementPattern: string
    intent: string
    notes: string
    videoUrl: string
    prescriptionMode: StrengthPrescriptionMode
    loadMode: StrengthLoadMode
    defaultRest: string
    showRestColumn: boolean
    setRows: StrengthSetRow[]
  }>({
    title: '',
    movementPattern: '',
    intent: '',
    notes: '',
    videoUrl: '',
    prescriptionMode: DEFAULT_PRESCRIPTION_MODE,
    loadMode: DEFAULT_LOAD_MODE,
    defaultRest: '',
    showRestColumn: false,
    setRows: normalizeStrengthSetRows([{ value: '', loadValue: '' }])
  })

  const activeBlock = computed(() =>
    activeTarget.value ? localBlocks.value[activeTarget.value.blockIndex] : null
  )
  const activeStep = computed(() =>
    activeTarget.value && activeBlock.value
      ? activeBlock.value.steps[activeTarget.value.stepIndex]
      : null
  )
  const summary = computed(() => summarizeStrengthBlocks(localBlocks.value))
  const manualDurationMinutes = ref<number>(0)
  const manualTssInput = ref<string>('')

  function resetFromProps() {
    localBlocks.value = normalizeStrengthBlocks({
      ...(props.structuredWorkout || {}),
      exercises: props.exercises || props.structuredWorkout?.exercises || []
    })

    if (!localBlocks.value.length) {
      localBlocks.value = [createStrengthBlock('single_exercise')]
    }

    const initialDurationSec = Number(props.initialDurationSec || 0)
    manualDurationMinutes.value = Math.max(
      1,
      Math.round(
        (initialDurationSec > 0
          ? initialDurationSec
          : summarizeStrengthBlocks(localBlocks.value).durationSec) / 60
      ) || 1
    )
    manualTssInput.value =
      Number.isFinite(Number(props.initialTss)) && Number(props.initialTss) > 0
        ? String(Math.round(Number(props.initialTss)))
        : ''
  }

  watch(() => [props.structuredWorkout, props.exercises], resetFromProps, {
    immediate: true,
    deep: true
  })

  watch(
    () => props.openStepTarget?.requestId,
    async () => {
      const target = props.openStepTarget
      if (!target) return
      await nextTick()
      if (!localBlocks.value[target.blockIndex]?.steps?.[target.stepIndex]) return
      openAdvancedStep(target.blockIndex, target.stepIndex)
    },
    { flush: 'post' }
  )

  watch(
    libraryQuery,
    () => {
      if (!isLibraryModalOpen.value) return
      if (libraryQueryTimer) clearTimeout(libraryQueryTimer)
      libraryQueryTimer = setTimeout(fetchLibraryExercises, 200)
    },
    { flush: 'post' }
  )

  watch(isLibraryModalOpen, (open) => {
    if (open) {
      fetchLibraryExercises()
      return
    }
    libraryQuery.value = ''
  })

  function blockTypeLabel(value: StrengthBlockType) {
    return blockTypeOptions.find((option) => option.value === value)?.label || 'Block'
  }

  function addBlock(type: StrengthBlockType) {
    localBlocks.value.push(createStrengthBlock(type))
    isBlockTypeModalOpen.value = false
  }

  function removeBlock(index: number) {
    if (localBlocks.value.length === 1) {
      localBlocks.value[0] = createStrengthBlock(localBlocks.value[0]?.type || 'single_exercise')
      return
    }
    localBlocks.value.splice(index, 1)
  }

  function moveBlock(index: number, direction: number) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= localBlocks.value.length) return
    const [block] = localBlocks.value.splice(index, 1)
    if (block) localBlocks.value.splice(targetIndex, 0, block)
  }

  function openLibraryPicker(blockIndex: number, stepIndex: number | null = null) {
    pickerTarget.blockIndex = blockIndex
    pickerTarget.stepIndex = stepIndex
    isLibraryModalOpen.value = true
  }

  function openAdvancedStep(blockIndex: number, stepIndex: number) {
    activeTarget.value = { blockIndex, stepIndex }
    isAdvancedOpen.value = true
  }

  function startExerciseDrag(block: StrengthBlock, event: any) {
    isDraggingExercises.value = true
    const draggedStep = block.steps?.[event?.oldIndex ?? -1]
    draggedStepId.value = draggedStep?.id || null
  }

  function endExerciseDrag() {
    isDraggingExercises.value = false
    draggedStepId.value = null
  }

  function isStepBeingDragged(step: StrengthBlockStep) {
    return isDraggingExercises.value && draggedStepId.value === step.id
  }

  function addSetRow(step: StrengthBlockStep) {
    const previousRow = step.setRows[step.setRows.length - 1]
    step.setRows = normalizeStrengthSetRows(
      [
        ...step.setRows,
        createStrengthSetRow({
          value: String(previousRow?.value || '').trim(),
          loadValue: String(previousRow?.loadValue || '').trim(),
          restOverride: String(previousRow?.restOverride || '').trim()
        })
      ],
      step.setRows.length + 1
    )
  }

  function removeSetRow(step: StrengthBlockStep) {
    if (step.setRows.length <= 1) return
    step.setRows = normalizeStrengthSetRows(step.setRows.slice(0, -1))
  }

  function updatePrescriptionMode(step: StrengthBlockStep, value: unknown) {
    step.prescriptionMode = String(value || DEFAULT_PRESCRIPTION_MODE) as StrengthPrescriptionMode
    step.setRows = normalizeStrengthSetRows(
      step.setRows.map((row) => ({ ...row, value: '' })),
      step.setRows.length
    )
  }

  function updateLoadMode(step: StrengthBlockStep, value: unknown) {
    step.loadMode = String(value || DEFAULT_LOAD_MODE) as StrengthLoadMode
    if (step.loadMode === 'none') {
      step.setRows = normalizeStrengthSetRows(
        step.setRows.map((row) => ({ ...row, loadValue: '' })),
        step.setRows.length
      )
    }
  }

  function availableSecondaryParameterOptions(
    selected: ParameterToken[],
    current?: ParameterToken
  ): Array<{ label: string; value: ParameterToken }> {
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

  function parameterTokenLabel(token: ParameterToken) {
    if (token === 'rest') return 'Rest Override'
    if (token.startsWith('load:'))
      return loadModeLabel(token.replace('load:', '') as StrengthLoadMode)
    return prescriptionColumnLabel(token.replace('prescription:', '') as StrengthPrescriptionMode)
  }

  function parameterLabels(step: StrengthBlockStep) {
    return getParameterTokens(step).map(parameterTokenLabel)
  }

  function secondaryParameterOptions(
    target: {
      prescriptionMode: StrengthPrescriptionMode
      loadMode: StrengthLoadMode
      showRestColumn?: boolean
    },
    index: number
  ) {
    const tokens = getParameterTokens(target)
    return availableSecondaryParameterOptions(
      tokens.filter((_, tokenIndex) => tokenIndex !== index),
      tokens[index]
    )
  }

  function setPrimaryParameter(
    target: { prescriptionMode: StrengthPrescriptionMode; setRows: StrengthSetRow[] },
    value: ParameterToken
  ) {
    const mode = String(value || `prescription:${DEFAULT_PRESCRIPTION_MODE}`).replace(
      'prescription:',
      ''
    ) as StrengthPrescriptionMode

    if (target.prescriptionMode === mode) return
    target.prescriptionMode = mode
    target.setRows = normalizeStrengthSetRows(
      target.setRows.map((row) => ({ ...row, value: '' })),
      target.setRows.length
    )
  }

  function applyParameterTokens(
    target: {
      prescriptionMode: StrengthPrescriptionMode
      loadMode: StrengthLoadMode
      showRestColumn?: boolean
      setRows: StrengthSetRow[]
    },
    tokens: ParameterToken[]
  ) {
    const nextPrimary = tokens.find((token) => token.startsWith('prescription:'))
    setPrimaryParameter(
      target,
      nextPrimary || (`prescription:${DEFAULT_PRESCRIPTION_MODE}` as ParameterToken)
    )

    const nextLoad = tokens.find((token) => token.startsWith('load:'))
    updateLoadMode(
      target as StrengthBlockStep,
      nextLoad ? nextLoad.replace('load:', '') : DEFAULT_LOAD_MODE
    )

    const hasRest = tokens.includes('rest')
    toggleRestOverrideColumn(target as StrengthBlockStep, hasRest)
  }

  function updateStepParameter(step: StrengthBlockStep, index: number, value: unknown) {
    const tokens = getParameterTokens(step)
    tokens[index] = String(value) as ParameterToken
    applyParameterTokens(step, tokens)
  }

  function addStepParameter(step: StrengthBlockStep) {
    const tokens = getParameterTokens(step)
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
    applyParameterTokens(step, tokens)
  }

  function removeStepParameter(step: StrengthBlockStep, index: number) {
    if (index === 0) return
    const tokens = getParameterTokens(step).filter((_, tokenIndex) => tokenIndex !== index)
    applyParameterTokens(step, tokens)
  }

  function getStepParameterTokens(step: StrengthBlockStep) {
    return getParameterTokens(step)
  }

  function toggleRestOverrideColumn(step: StrengthBlockStep, value: unknown) {
    const enabled = Boolean(value)
    step.showRestColumn = enabled
    if (!enabled) {
      step.setRows = normalizeStrengthSetRows(
        step.setRows.map((row) => ({ ...row, restOverride: '' })),
        step.setRows.length
      )
    }
  }

  async function fetchLibraryExercises() {
    libraryLoading.value = true
    try {
      libraryItems.value = await $fetch('/api/library/strength-exercises', {
        query: {
          scope: props.ownerScope,
          q: libraryQuery.value || undefined
        }
      })
    } catch (error: any) {
      toast.add({
        title: 'Library Load Failed',
        description: error.data?.message || 'Could not load saved exercises.',
        color: 'error'
      })
    } finally {
      libraryLoading.value = false
    }
  }

  function applyExerciseToTarget(source: StrengthLibraryExercise) {
    const block = localBlocks.value[pickerTarget.blockIndex]
    if (!block) return

    const currentStep = pickerTarget.stepIndex !== null ? block.steps[pickerTarget.stepIndex] : null
    const mapped = mapLibraryExerciseToWorkoutStep(source)

    const nextStep = {
      ...mapped,
      id: currentStep?.id || mapped.id,
      notes: currentStep?.notes || mapped.notes,
      videoUrl: currentStep?.videoUrl || mapped.videoUrl,
      showRestColumn: currentStep?.showRestColumn ?? mapped.showRestColumn
    }

    if (pickerTarget.stepIndex !== null && block.steps[pickerTarget.stepIndex]) {
      block.steps.splice(pickerTarget.stepIndex, 1, nextStep)
    } else {
      block.steps.push(nextStep)
    }
  }

  function selectLibraryExercise(item: StrengthLibraryExercise) {
    applyExerciseToTarget(item)
    isLibraryModalOpen.value = false
    toast.add({
      title: 'Exercise Added',
      description: `${item.title} was added to the workout.`,
      color: 'success'
    })
  }

  function openCustomExerciseModal() {
    customExerciseForm.title = ''
    customExerciseForm.movementPattern = ''
    customExerciseForm.intent = ''
    customExerciseForm.notes = ''
    customExerciseForm.videoUrl = ''
    customExerciseForm.prescriptionMode = DEFAULT_PRESCRIPTION_MODE
    customExerciseForm.loadMode = DEFAULT_LOAD_MODE
    customExerciseForm.defaultRest = ''
    customExerciseForm.showRestColumn = false
    customExerciseForm.setRows = normalizeStrengthSetRows([{ value: '', loadValue: '' }])
    isCustomExerciseModalOpen.value = true
  }

  function addCustomSetRow() {
    const previousRow = customExerciseForm.setRows[customExerciseForm.setRows.length - 1]
    customExerciseForm.setRows = normalizeStrengthSetRows(
      [
        ...customExerciseForm.setRows,
        createStrengthSetRow({
          value: String(previousRow?.value || '').trim(),
          loadValue: String(previousRow?.loadValue || '').trim(),
          restOverride: String(previousRow?.restOverride || '').trim()
        })
      ],
      customExerciseForm.setRows.length + 1
    )
  }

  function removeCustomSetRow() {
    if (customExerciseForm.setRows.length <= 1) return
    customExerciseForm.setRows = normalizeStrengthSetRows(customExerciseForm.setRows.slice(0, -1))
  }

  function createCustomExercisePayload(): StrengthLibraryExercisePayload {
    const title = String(customExerciseForm.title || '').trim()
    if (!title) throw new Error('Exercise title is required')

    return {
      title,
      movementPattern: customExerciseForm.movementPattern || undefined,
      intent: customExerciseForm.intent || undefined,
      notes: customExerciseForm.notes || undefined,
      videoUrl: customExerciseForm.videoUrl || undefined,
      prescriptionMode: customExerciseForm.prescriptionMode,
      loadMode: customExerciseForm.loadMode,
      defaultRest: customExerciseForm.defaultRest || undefined,
      setRows: customExerciseForm.setRows.map((row) => ({
        id: row.id,
        index: row.index,
        value: String(row.value || '').trim() || undefined,
        loadValue: String(row.loadValue || '').trim() || undefined,
        restOverride: String(row.restOverride || '').trim() || undefined
      }))
    }
  }

  function updateCustomParameter(index: number, value: unknown) {
    const tokens = getParameterTokens(customExerciseForm)
    tokens[index] = String(value) as ParameterToken
    applyParameterTokens(customExerciseForm, tokens)
  }

  function addCustomParameter() {
    const tokens = getParameterTokens(customExerciseForm)
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
    applyParameterTokens(customExerciseForm, tokens)
  }

  function removeCustomParameter(index: number) {
    if (index === 0) return
    const tokens = getParameterTokens(customExerciseForm).filter(
      (_, tokenIndex) => tokenIndex !== index
    )
    applyParameterTokens(customExerciseForm, tokens)
  }

  function getCustomParameterTokens() {
    return getParameterTokens(customExerciseForm)
  }

  async function createCustomExercise() {
    creatingCustomExercise.value = true
    try {
      const saved: any = await $fetch('/api/library/strength-exercises', {
        method: 'POST',
        body: createCustomExercisePayload()
      })
      libraryItems.value = [saved, ...libraryItems.value.filter((item) => item.id !== saved.id)]
      applyExerciseToTarget(saved)
      isCustomExerciseModalOpen.value = false
      isLibraryModalOpen.value = false
      toast.add({
        title: 'Custom Exercise Created',
        description: `${saved.title} was saved and added to the workout.`,
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Create Failed',
        description: error.data?.message || error.message || 'Could not create the exercise.',
        color: 'error'
      })
    } finally {
      creatingCustomExercise.value = false
    }
  }

  function selectValue(value: unknown) {
    const normalized = String(value || '').trim()
    return normalized || EMPTY_SELECT_VALUE
  }

  function normalizeSelectValue(value: unknown) {
    const normalized = String(value || '').trim()
    return normalized === EMPTY_SELECT_VALUE ? '' : normalized
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

  function formatOptionLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }

  function cleanStep(step: StrengthBlockStep) {
    const name = String(step?.name || '').trim()
    if (!name) return null

    const cleaned: Record<string, any> = {
      id: step.id,
      name,
      prescriptionMode: step.prescriptionMode || DEFAULT_PRESCRIPTION_MODE,
      loadMode: step.loadMode || DEFAULT_LOAD_MODE,
      defaultRest: String(step?.defaultRest || '').trim() || undefined,
      showRestColumn: step?.showRestColumn ? true : undefined,
      setRows: normalizeStrengthSetRows(step.setRows).map((row) => ({
        id: row.id,
        index: row.index,
        value: String(row.value || '').trim() || undefined,
        loadValue: String(row.loadValue || '').trim() || undefined,
        restOverride: String(row.restOverride || '').trim() || undefined
      }))
    }

    if (String(step?.libraryExerciseId || '').trim()) {
      cleaned.libraryExerciseId = String(step.libraryExerciseId).trim()
    }
    if (String(step?.videoUrl || '').trim()) {
      const normalizedVideoUrl = normalizeYouTubeUrl(step.videoUrl)
      if (!normalizedVideoUrl) {
        throw new Error(`"${name}" has an invalid YouTube URL`)
      }
      cleaned.videoUrl = normalizedVideoUrl
    }
    if (String(step?.notes || '').trim()) cleaned.notes = String(step.notes).trim()
    if (String(step?.movementPattern || '').trim()) {
      cleaned.movementPattern = String(step.movementPattern).trim()
    }
    if (String(step?.intent || '').trim()) cleaned.intent = String(step.intent).trim()

    return cleaned
  }

  function cleanBlock(block: StrengthBlock) {
    const cleanedSteps = block.steps.map(cleanStep).filter(Boolean) as any[]
    return {
      id: block.id,
      type: block.type,
      title: String(block.title || '').trim() || blockTypeLabel(block.type),
      notes: String(block.notes || '').trim() || undefined,
      durationSec:
        Number.isFinite(Number(block.durationSec)) && Number(block.durationSec) > 0
          ? Math.trunc(Number(block.durationSec))
          : undefined,
      steps: cleanedSteps
    }
  }

  function buildStructuredWorkoutPayload() {
    const cleanedBlocks = localBlocks.value.map(cleanBlock)
    const blocks = cleanedBlocks.filter(
      (block) => block.steps.length > 0 || block.notes || block.durationSec
    )
    const exercises = flattenStrengthBlocksToExercises(blocks as any)
    const durationSec = Math.max(1, Math.round(Number(manualDurationMinutes.value || 0))) * 60
    const parsedTss = String(manualTssInput.value || '').trim()
    const tss = parsedTss ? Number(parsedTss) : undefined

    return {
      blocks,
      exercises,
      durationSec,
      tss: Number.isFinite(tss) && tss !== undefined ? tss : undefined
    }
  }

  function buildLibraryPayload(step: StrengthBlockStep): StrengthLibraryExercisePayload {
    const cleaned = cleanStep(step)
    if (!cleaned) {
      throw new Error('Exercise name is required before saving to the library')
    }

    return {
      title: cleaned.name,
      movementPattern: cleaned.movementPattern,
      intent: cleaned.intent,
      notes: cleaned.notes,
      videoUrl: cleaned.videoUrl,
      prescriptionMode: cleaned.prescriptionMode,
      loadMode: cleaned.loadMode,
      defaultRest: cleaned.defaultRest,
      setRows: cleaned.setRows
    }
  }

  function getYouTubeSearchUrl(name: string) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(name).replace(/%20/g, '+')}`
  }

  function syncLibraryItemLocally(item: StrengthLibraryExercise) {
    const nextItems = [...libraryItems.value]
    const index = nextItems.findIndex((entry) => entry.id === item.id)
    if (index >= 0) nextItems.splice(index, 1, item)
    else nextItems.unshift(item)
    libraryItems.value = nextItems
  }

  async function saveStepToLibrary(step: StrengthBlockStep) {
    savingLibraryExerciseId.value = step.id
    try {
      const isUpdate = Boolean(step.libraryExerciseId)
      const saved: any = step.libraryExerciseId
        ? await $fetch(`/api/library/strength-exercises/${step.libraryExerciseId}`, {
            method: 'PATCH',
            body: buildLibraryPayload(step)
          })
        : await $fetch('/api/library/strength-exercises', {
            method: 'POST',
            body: buildLibraryPayload(step)
          })

      step.libraryExerciseId = saved.id
      step.videoUrl = saved.videoUrl || step.videoUrl
      syncLibraryItemLocally(saved)
      toast.add({
        title: isUpdate ? 'Saved Exercise Updated' : 'Saved Exercise Created',
        description: `${saved.title} is now available in your strength library.`,
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Library Save Failed',
        description: error.data?.message || error.message || 'Could not save this exercise.',
        color: 'error'
      })
    } finally {
      savingLibraryExerciseId.value = null
    }
  }

  async function saveActiveStepToLibrary() {
    if (!activeStep.value) return
    await saveStepToLibrary(activeStep.value)
  }

  async function deleteLibraryExercise(item: StrengthLibraryExercise) {
    if (!window.confirm(`Delete "${item.title}" from the saved exercise library?`)) return
    deletingLibraryExerciseId.value = item.id
    try {
      await $fetch(`/api/library/strength-exercises/${item.id}`, { method: 'DELETE' })
      libraryItems.value = libraryItems.value.filter((entry) => entry.id !== item.id)
      toast.add({
        title: 'Saved Exercise Deleted',
        description: `${item.title} was removed from the library.`,
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Delete Failed',
        description: error.data?.message || 'Could not delete this saved exercise.',
        color: 'error'
      })
    } finally {
      deletingLibraryExerciseId.value = null
    }
  }

  function removeStep(blockIndex: number, stepIndex: number) {
    localBlocks.value[blockIndex]?.steps.splice(stepIndex, 1)
  }

  function saveChanges() {
    try {
      emit('save', buildStructuredWorkoutPayload())
    } catch (error: any) {
      toast.add({
        title: 'Fix Exercise Details',
        description: error.message || 'Please review the strength routine and try again.',
        color: 'error'
      })
    }
  }
</script>

<style scoped>
  :deep(.strength-step-chosen),
  .strength-step-dragging {
    opacity: 0.9;
  }

  :deep(.strength-step-chosen .space-y-4),
  .strength-step-dragging .space-y-4 {
    gap: 0.75rem;
  }
</style>
