<template>
  <UModal v-model:open="isOpen" title="Workout Overview" description="Dialog content and actions.">
    <template #actions>
      <div class="flex items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-clipboard"
          size="sm"
          aria-label="Copy workout ID"
          @click="copyWorkoutId"
        />
        <UButton
          color="error"
          variant="ghost"
          icon="i-heroicons-trash"
          size="sm"
          aria-label="Delete workout"
          @click="showDeleteConfirm = true"
        />
      </div>
    </template>

    <!-- Hidden trigger - modal is controlled programmatically -->
    <span class="hidden" />

    <template #body>
      <div v-if="workout" class="space-y-8">
        <!-- Header Info -->
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {{ workout.title }}
            </h3>
            <div
              class="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest"
            >
              <div class="flex items-center gap-1.5">
                <UIcon :name="getActivityIcon(workout.type)" class="w-3.5 h-3.5 text-primary-500" />
                <span>{{ workout.type || 'Activity' }}</span>
              </div>
              <span class="opacity-30">•</span>
              <span>{{ formatDateTime(workout.date) }}</span>
            </div>
            <!-- Data Capability Icons -->
            <div class="flex items-center gap-2 mt-3">
              <UTooltip
                v-for="badge in getDataBadges(workout)"
                :key="badge.label"
                :text="badge.label"
              >
                <div
                  class="p-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <UIcon :name="badge.icon" class="w-3.5 h-3.5 text-gray-400" />
                </div>
              </UTooltip>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0">
            <UiDataAttribution
              v-if="
                [
                  'strava',
                  'garmin',
                  'zwift',
                  'apple_health',
                  'whoop',
                  'intervals',
                  'withings',
                  'hevy'
                ].includes(workout.source)
              "
              :provider="workout.source"
              :device-name="workout.deviceName"
            />
            <UBadge
              v-else
              :color="workout.source === 'manual' ? 'warning' : 'neutral'"
              variant="subtle"
              size="xs"
              class="font-black uppercase tracking-widest text-[9px]"
            >
              {{ workout.source }}
            </UBadge>
          </div>
        </div>

        <!-- Clean Stats Grid (Top Level) -->
        <div
          class="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm"
        >
          <div
            class="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-gray-50 dark:divide-gray-800 border-b border-gray-50 dark:divide-gray-800"
          >
            <div v-if="workout.durationSec" class="p-4 bg-gray-50/30 dark:bg-gray-900/30">
              <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1"
                >Duration</span
              >
              <span class="text-base font-black text-gray-900 dark:text-white tabular-nums">{{
                formatDuration(workout.durationSec)
              }}</span>
            </div>

            <div v-if="workout.tss" class="p-4 bg-gray-50/30 dark:bg-gray-900/30">
              <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1"
                >TSS</span
              >
              <span
                class="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums"
                >{{ Math.round(workout.tss) }}</span
              >
            </div>

            <div v-if="workout.averageHr" class="p-4 bg-gray-50/30 dark:bg-gray-900/30 border-t-0">
              <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1"
                >Avg HR</span
              >
              <span class="text-base font-black text-pink-600 dark:text-pink-400 tabular-nums"
                >{{ workout.averageHr
                }}<span class="text-[9px] ml-0.5 opacity-50 uppercase">bpm</span></span
              >
            </div>

            <div v-if="workout.kilojoules" class="p-4 bg-gray-50/30 dark:bg-gray-900/30 border-t-0">
              <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1"
                >Energy</span
              >
              <span class="text-base font-black text-orange-600 dark:text-orange-400 tabular-nums"
                >{{ workout.kilojoules
                }}<span class="text-[9px] ml-0.5 opacity-50 uppercase">kJ</span></span
              >
            </div>

            <div v-if="workout.distanceMeters" class="p-4 bg-gray-50/30 dark:bg-gray-900/30">
              <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1"
                >Distance</span
              >
              <span class="text-base font-black text-gray-900 dark:text-white tabular-nums"
                >{{ (workout.distanceMeters / 1000).toFixed(2)
                }}<span class="text-[9px] ml-0.5 opacity-50 uppercase">km</span></span
              >
            </div>

            <div v-if="workout.averageWatts" class="p-4 bg-gray-50/30 dark:bg-gray-900/30">
              <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1"
                >Avg Power</span
              >
              <span class="text-base font-black text-purple-600 dark:text-purple-400 tabular-nums"
                >{{ workout.averageWatts
                }}<span class="text-[9px] ml-0.5 opacity-50 uppercase">W</span></span
              >
            </div>

            <div v-if="workout.normalizedPower" class="p-4 bg-gray-50/30 dark:bg-gray-900/30">
              <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1"
                >Norm Power</span
              >
              <span class="text-base font-black text-indigo-600 dark:text-indigo-400 tabular-nums"
                >{{ workout.normalizedPower
                }}<span class="text-[9px] ml-0.5 opacity-50 uppercase">W</span></span
              >
            </div>

            <div v-if="workout.rpe" class="p-4 bg-gray-50/30 dark:bg-gray-900/30">
              <span class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1"
                >RPE</span
              >
              <span class="text-base font-black text-gray-900 dark:text-white tabular-nums"
                >{{ workout.rpe
                }}<span class="text-[9px] ml-0.5 opacity-50 uppercase">/10</span></span
              >
            </div>
          </div>
        </div>

        <!-- Planned Workout Section -->
        <div
          v-if="workout.plannedWorkout"
          class="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-5 border border-blue-100 dark:border-blue-900/30 relative group"
        >
          <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-heroicons-link-slash"
              :loading="isUnlinking"
              title="Unlink from Plan"
              class="font-black uppercase tracking-widest text-[8px]"
              @click="unlinkWorkout"
            />
          </div>

          <div class="flex items-center justify-between mb-6 pr-8">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-white/50 dark:bg-black/20 rounded-lg">
                <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-primary-500" />
              </div>
              <div class="flex flex-col">
                <NuxtLink
                  :to="`/workouts/planned/${workout.plannedWorkout.id}`"
                  class="text-sm font-black text-blue-900 dark:text-blue-100 uppercase tracking-tight hover:text-primary-500 transition-colors flex items-center gap-2 group/link"
                >
                  {{ workout.plannedWorkout.title }}
                  <UIcon
                    name="i-heroicons-arrow-top-right-on-square"
                    class="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity"
                  />
                </NuxtLink>
                <div
                  class="flex gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mt-0.5"
                >
                  <span>{{ formatDateUTC(workout.plannedWorkout.date) }}</span>
                  <span class="opacity-40">•</span>
                  <span>{{ workout.plannedWorkout.type || 'Workout' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Planned vs Actual Grid -->
          <div class="grid grid-cols-1 gap-4">
            <div
              class="grid grid-cols-3 gap-4 text-[9px] font-black uppercase tracking-widest text-blue-700/50 dark:text-blue-300/30 border-b border-blue-100/50 dark:border-blue-800/50 pb-2 px-1"
            >
              <span>Metric</span>
              <span class="text-center">Prescribed</span>
              <span class="text-right">Observed</span>
            </div>

            <div class="space-y-3 px-1">
              <div class="grid grid-cols-3 gap-4 items-center">
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-200"
                  >Duration</span
                >
                <span
                  class="text-center text-xs font-bold text-blue-700/70 dark:text-blue-300/60 tabular-nums"
                >
                  {{
                    workout.plannedWorkout.durationSec
                      ? formatDuration(workout.plannedWorkout.durationSec)
                      : '—'
                  }}
                </span>
                <span
                  class="text-right text-sm font-black tabular-nums"
                  :class="
                    getComplianceColor(workout.durationSec, workout.plannedWorkout.durationSec)
                  "
                >
                  {{ formatDuration(workout.durationSec) }}
                </span>
              </div>

              <div
                v-if="workout.plannedWorkout.distanceMeters || workout.distanceMeters"
                class="grid grid-cols-3 gap-4 items-center"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-200"
                  >Distance</span
                >
                <span
                  class="text-center text-xs font-bold text-blue-700/70 dark:text-blue-300/60 tabular-nums"
                >
                  {{
                    workout.plannedWorkout.distanceMeters
                      ? `${(workout.plannedWorkout.distanceMeters / 1000).toFixed(1)}km`
                      : '—'
                  }}
                </span>
                <span
                  class="text-right text-sm font-black tabular-nums"
                  :class="
                    getComplianceColor(
                      workout.distanceMeters,
                      workout.plannedWorkout.distanceMeters
                    )
                  "
                >
                  {{
                    workout.distanceMeters ? `${(workout.distanceMeters / 1000).toFixed(1)}km` : '—'
                  }}
                </span>
              </div>

              <div
                v-if="workout.plannedWorkout.tss || workout.tss"
                class="grid grid-cols-3 gap-4 items-center"
              >
                <span
                  class="text-[10px] font-black uppercase tracking-widest text-blue-800 dark:text-blue-200"
                  >Load (TSS)</span
                >
                <span
                  class="text-center text-xs font-bold text-blue-700/70 dark:text-blue-300/60 tabular-nums"
                >
                  {{ workout.plannedWorkout.tss ? Math.round(workout.plannedWorkout.tss) : '—' }}
                </span>
                <span
                  class="text-right text-sm font-black tabular-nums"
                  :class="getComplianceColor(workout.tss, workout.plannedWorkout.tss)"
                >
                  {{ workout.tss ? Math.round(workout.tss) : '—' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Collapsible Description -->
        <div v-if="workout.description">
          <UAccordion
            color="neutral"
            variant="ghost"
            size="sm"
            :items="[
              {
                label: 'Workout Description',
                slot: 'body',
                icon: 'i-heroicons-document-text'
              }
            ]"
            :ui="{
              item: 'text-[10px] font-black uppercase tracking-widest',
              header: 'hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl px-2'
            }"
          >
            <template #body>
              <div
                class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 mt-2"
              >
                <p
                  class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium"
                >
                  {{ workout.description }}
                </p>
              </div>
            </template>
          </UAccordion>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between gap-3 w-full">
        <UButton
          color="neutral"
          variant="soft"
          class="font-black uppercase tracking-widest text-[10px] px-4"
          @click="closeModal"
        >
          Dismiss
        </UButton>
        <UButton
          color="primary"
          variant="solid"
          class="font-black uppercase tracking-widest text-[10px] px-6"
          @click="viewFullWorkout"
        >
          View Full Details
        </UButton>
      </div>
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="showDeleteConfirm"
    title="Delete Workout"
    description="Dialog content and actions."
  >
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="showDeleteConfirm = false">
          Cancel
        </UButton>
        <UButton color="error" :loading="isDeleting" @click="deleteWorkout"> Delete </UButton>
      </div>
    </template>
  </UModal>

  <!-- Unlink Confirmation Modal -->
  <UModal
    v-model:open="showUnlinkConfirm"
    title="Unlink Workout"
    description="Dialog content and actions."
  >
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="showUnlinkConfirm = false">
          Cancel
        </UButton>
        <UButton color="warning" :loading="isUnlinking" @click="executeUnlink"> Unlink </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  const { formatDateTime, formatDateUTC } = useFormat()

  const props = defineProps<{
    workout: any | null
    modelValue: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    deleted: [workoutId: string]
    updated: [workoutId: string]
  }>()

  const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const isDeleting = ref(false)
  const isUnlinking = ref(false)
  const showDeleteConfirm = ref(false)
  const showUnlinkConfirm = ref(false)
  const toast = useToast()

  function closeModal() {
    isOpen.value = false
  }

  function copyWorkoutId() {
    if (!props.workout?.id) return
    navigator.clipboard.writeText(props.workout.id)
    toast.add({
      title: 'Copied',
      description: 'Workout ID copied to clipboard',
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
  }

  function unlinkWorkout() {
    if (!props.workout?.id) return
    showUnlinkConfirm.value = true
  }

  async function executeUnlink() {
    if (!props.workout?.id) return

    isUnlinking.value = true
    try {
      await $fetch(`/api/workouts/${props.workout.id}/unlink`, {
        method: 'POST'
      })

      toast.add({
        title: 'Unlinked',
        description: 'Workout unlinked from plan',
        color: 'success'
      })

      emit('updated', props.workout.id)
      closeModal()
    } catch (error) {
      console.error('Failed to unlink workout:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to unlink workout',
        color: 'error'
      })
    } finally {
      isUnlinking.value = false
      showUnlinkConfirm.value = false
    }
  }

  async function deleteWorkout() {
    if (!props.workout?.id) return

    isDeleting.value = true
    try {
      await $fetch(`/api/workouts/${props.workout.id}`, {
        method: 'DELETE'
      })

      toast.add({
        title: 'Workout deleted',
        color: 'success'
      })

      showDeleteConfirm.value = false
      emit('deleted', props.workout.id)
      closeModal()
    } catch (error) {
      console.error('Failed to delete workout:', error)
      toast.add({
        title: 'Error',
        description: 'Failed to delete workout',
        color: 'error'
      })
    } finally {
      isDeleting.value = false
    }
  }

  function viewFullWorkout() {
    if (props.workout) {
      navigateTo(`/workouts/${props.workout.id}`)
    }
  }

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)

    if (h > 0) {
      return `${h}h ${m}m`
    }
    return `${m}m`
  }

  function getActivityIcon(type: string) {
    const t = (type || '').toLowerCase()
    if (t.includes('ride') || t.includes('cycle')) return 'i-heroicons-bolt'
    if (t.includes('run')) return 'i-heroicons-fire'
    if (t.includes('swim')) return 'i-heroicons-beaker'
    if (t.includes('weight') || t.includes('strength')) return 'i-heroicons-trophy'
    return 'i-heroicons-check-circle'
  }

  function getDataBadges(workout: any) {
    const badges = []
    if (workout.averageHr > 0) badges.push({ icon: 'i-heroicons-heart', label: 'Heart Rate' })
    if (workout.averageWatts > 0) badges.push({ icon: 'i-heroicons-bolt', label: 'Power' })
    if (workout.distanceMeters > 0) badges.push({ icon: 'i-heroicons-map-pin', label: 'GPS' })
    if (workout.averageCadence > 0) badges.push({ icon: 'i-ph-sneaker-move', label: 'Cadence' })
    if (workout.streams)
      badges.push({
        icon: 'i-heroicons-chart-bar',
        label: 'Detailed Streams'
      })
    if (workout.elevationGain > 0)
      badges.push({
        icon: 'i-heroicons-arrow-trending-up',
        label: 'Elevation'
      })
    return badges
  }

  function getComplianceColor(
    actual: number | null | undefined,
    planned: number | null | undefined
  ) {
    if (!actual || !planned) return ''
    const ratio = actual / planned
    if (ratio >= 0.9 && ratio <= 1.1) return 'text-green-600 dark:text-green-400 font-medium'
    if (ratio >= 0.8 && ratio <= 1.2) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }
</script>
