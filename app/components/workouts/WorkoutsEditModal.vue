<template>
  <UModal
    v-model:open="isOpen"
    title="Edit Workout"
    description="Update the technical and descriptive details of your activity."
    :ui="{ width: 'sm:max-w-2xl', body: 'p-0' }"
  >
    <template #content>
      <UForm :schema="schema" :state="state" @submit="onSubmit">
        <div class="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          <!-- Section: Basic Info -->
          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-primary" />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Activity Details
              </h4>
            </div>

            <UFormField
              label="Activity Title"
              name="title"
              required
              description="Give your workout a descriptive name."
            >
              <UInput
                v-model="state.title"
                placeholder="Morning Ride in the Park"
                size="lg"
                icon="i-heroicons-pencil"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Activity Type"
              name="type"
              required
              description="Category for analysis."
            >
              <USelectMenu
                v-model="state.type"
                :items="activityOptions"
                value-attribute="value"
                searchable
                placeholder="Select type"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </section>

          <!-- Section: Time & Distance -->
          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon name="i-heroicons-clock" class="w-4 h-4 text-primary" />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Time & Distance
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UFormField label="Date" name="date" required hint="Local day">
                <UInput
                  v-model="state.date"
                  type="date"
                  size="lg"
                  icon="i-heroicons-calendar"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Start Time" name="startTime" hint="Local time">
                <UInput
                  v-model="state.startTime"
                  type="time"
                  size="lg"
                  icon="i-heroicons-clock"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Duration"
                name="duration"
                description="Total activity time."
                class="md:col-span-2"
              >
                <div class="flex gap-2 items-center">
                  <UInput
                    v-model.number="durationHours"
                    type="number"
                    placeholder="0"
                    :min="0"
                    size="lg"
                    class="w-24"
                  >
                    <template #trailing>
                      <span class="text-xs font-bold text-gray-400">h</span>
                    </template>
                  </UInput>
                  <UInput
                    v-model.number="durationMinutes"
                    type="number"
                    placeholder="0"
                    :min="0"
                    :max="59"
                    size="lg"
                    class="w-24"
                  >
                    <template #trailing>
                      <span class="text-xs font-bold text-gray-400">m</span>
                    </template>
                  </UInput>
                  <UInput
                    v-model.number="durationSeconds"
                    type="number"
                    placeholder="0"
                    :min="0"
                    :max="59"
                    size="lg"
                    class="w-24"
                  >
                    <template #trailing>
                      <span class="text-xs font-bold text-gray-400">s</span>
                    </template>
                  </UInput>
                </div>
              </UFormField>

              <UFormField label="Distance" name="distanceKm" description="Total path length.">
                <UInput
                  v-model.number="state.distanceKm"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  size="lg"
                  icon="i-heroicons-map"
                  class="w-full"
                >
                  <template #trailing>
                    <span class="text-xs font-bold text-gray-400">km</span>
                  </template>
                </UInput>
              </UFormField>

              <UFormField
                label="Elevation Gain"
                name="elevationGain"
                description="Total vertical ascent."
              >
                <UInput
                  v-model.number="state.elevationGain"
                  type="number"
                  placeholder="0"
                  size="lg"
                  icon="i-heroicons-arrow-trending-up"
                  class="w-full"
                >
                  <template #trailing>
                    <span class="text-xs font-bold text-gray-400">m</span>
                  </template>
                </UInput>
              </UFormField>
            </div>
          </section>

          <!-- Section: Impact & Load -->
          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-primary" />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Impact & Metrics
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UFormField
                label="Training Load (TSS)"
                name="trainingLoad"
                description="Physiological cost of the activity."
              >
                <UInput
                  v-model.number="state.trainingLoad"
                  type="number"
                  step="1"
                  placeholder="0"
                  size="lg"
                  icon="i-heroicons-fire"
                  class="w-full"
                >
                  <template #trailing>
                    <UButton
                      color="neutral"
                      variant="link"
                      size="xs"
                      icon="i-heroicons-sparkles"
                      class="font-bold uppercase tracking-widest text-[9px]"
                      @click="estimateTSS"
                    >
                      Estimate
                    </UButton>
                  </template>
                </UInput>
              </UFormField>

              <UFormField
                label="Energy (Calories)"
                name="calories"
                description="Estimated kilocalories burned."
              >
                <UInput
                  v-model.number="state.calories"
                  type="number"
                  placeholder="0"
                  size="lg"
                  icon="i-heroicons-beaker"
                  class="w-full"
                >
                  <template #trailing>
                    <UButton
                      color="neutral"
                      variant="link"
                      size="xs"
                      icon="i-heroicons-sparkles"
                      class="font-bold uppercase tracking-widest text-[9px]"
                      @click="estimateCalories"
                    >
                      Estimate
                    </UButton>
                  </template>
                </UInput>
              </UFormField>
            </div>
          </section>

          <!-- Section: Additional Info -->
          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon
                name="i-heroicons-chat-bubble-bottom-center-text"
                class="w-4 h-4 text-primary"
              />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Additional Info
              </h4>
            </div>

            <UFormField
              label="Description"
              name="description"
              description="Personal notes or context."
            >
              <UTextarea
                v-model="state.description"
                placeholder="How did you feel? Any mechanical issues?"
                :rows="4"
                size="lg"
                class="w-full"
              />
            </UFormField>
          </section>
        </div>

        <div
          class="flex justify-between items-center p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
        >
          <UButton
            label="Delete Activity"
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            class="font-bold"
            @click="$emit('delete')"
          />
          <div class="flex gap-3">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
            <UButton
              type="submit"
              label="Save Activity Changes"
              color="primary"
              class="px-6 font-bold"
              :loading="saving"
            />
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { z } from 'zod'

  const props = defineProps<{
    workout: any
  }>()

  const emit = defineEmits(['updated', 'delete'])

  const isOpen = defineModel<boolean>('open', { default: false })
  const saving = ref(false)
  const toast = useToast()
  const { formatUserDate, timezone, getUserDateFromLocal } = useFormat()

  const schema = z.object({
    title: z.string().min(1, 'Title is required'),
    type: z.string().min(1, 'Activity type is required'),
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().optional(),
    description: z.string().optional().nullable(),
    distanceKm: z.number().nullable().optional(),
    trainingLoad: z.number().nullable().optional(),
    calories: z.number().int().nullable().optional(),
    elevationGain: z.number().int().nullable().optional()
  })

  type Schema = z.output<typeof schema>

  const state = reactive({
    title: '',
    type: '',
    date: '',
    startTime: '',
    description: '',
    distanceKm: null as number | null,
    trainingLoad: null as number | null,
    calories: null as number | null,
    elevationGain: null as number | null
  })

  const durationHours = ref(0)
  const durationMinutes = ref(0)
  const durationSeconds = ref(0)

  const activityOptions = [
    { label: 'Cycling', value: 'Ride' },
    { label: 'Virtual Ride', value: 'VirtualRide' },
    { label: 'Mountain Bike', value: 'MountainBikeRide' },
    { label: 'Gravel Ride', value: 'GravelRide' },
    { label: 'E-Bike Ride', value: 'EBikeRide' },
    { label: 'Running', value: 'Run' },
    { label: 'Virtual Run', value: 'VirtualRun' },
    { label: 'Trail Run', value: 'TrailRun' },
    { label: 'Walking', value: 'Walk' },
    { label: 'Hiking', value: 'Hike' },
    { label: 'Swimming', value: 'Swim' },
    { label: 'Strength / Gym', value: 'WeightTraining' },
    { label: 'Yoga', value: 'Yoga' },
    { label: 'Pilates', value: 'Pilates' },
    { label: 'Rowing', value: 'Rowing' },
    { label: 'Stair Stepper', value: 'StairStepper' },
    { label: 'Elliptical', value: 'Elliptical' },
    { label: 'Generic Workout', value: 'Workout' },
    { label: 'Other', value: 'Other' }
  ]

  // Initialize state from props
  watch(
    () => props.workout,
    (newWorkout) => {
      if (newWorkout) {
        state.title = newWorkout.title || ''
        state.type = newWorkout.type || 'Ride'
        state.description = newWorkout.description || ''
        state.distanceKm = newWorkout.distanceMeters
          ? Number((newWorkout.distanceMeters / 1000).toFixed(2))
          : null
        state.trainingLoad = newWorkout.tss || newWorkout.trainingLoad || null
        state.calories = newWorkout.calories || null
        state.elevationGain = newWorkout.elevationGain || null

        if (newWorkout.date) {
          // Use useFormat helper to get local date and time strings
          state.date = formatUserDate(newWorkout.date, timezone.value, 'yyyy-MM-dd')
          state.startTime = formatUserDate(newWorkout.date, timezone.value, 'HH:mm')
        }

        // Set duration
        if (newWorkout.durationSec) {
          durationHours.value = Math.floor(newWorkout.durationSec / 3600)
          durationMinutes.value = Math.floor((newWorkout.durationSec % 3600) / 60)
          durationSeconds.value = newWorkout.durationSec % 60
        } else {
          durationHours.value = 0
          durationMinutes.value = 0
          durationSeconds.value = 0
        }
      }
    },
    { immediate: true }
  )

  function estimateTSS() {
    const totalMinutes =
      Number(durationHours.value) * 60 +
      Number(durationMinutes.value) +
      Number(durationSeconds.value) / 60
    if (totalMinutes <= 0) return

    const type = (state.type || '').toLowerCase()
    const hourlyTss =
      type.includes('recovery') || type.includes('easy') || type.includes('walk')
        ? 30
        : type.includes('vo2') || type.includes('anaerobic')
          ? 85
          : type.includes('threshold') || type.includes('tempo') || type.includes('ride')
            ? 70
            : 50

    state.trainingLoad = Math.round((totalMinutes / 60) * hourlyTss)
    toast.add({
      title: 'TSS Estimated',
      description: `Based on ${state.type} duration.`,
      color: 'info'
    })
  }

  function estimateCalories() {
    const totalMinutes =
      Number(durationHours.value) * 60 +
      Number(durationMinutes.value) +
      Number(durationSeconds.value) / 60
    if (totalMinutes <= 0) return

    const type = (state.type || '').toLowerCase()
    // Rough metabolic cost (kcal/min)
    let kcalPerMin = 10 // default
    if (type.includes('ride') || type.includes('cycle')) kcalPerMin = 12
    if (type.includes('run')) kcalPerMin = 14
    if (type.includes('swim')) kcalPerMin = 11
    if (type.includes('recovery') || type.includes('walk')) kcalPerMin = 5

    state.calories = Math.round(totalMinutes * kcalPerMin)
    toast.add({
      title: 'Calories Estimated',
      description: `Based on ${state.type} duration.`,
      color: 'info'
    })
  }

  async function onSubmit() {
    if (!props.workout?.id) return

    const totalSeconds =
      Number(durationHours.value) * 3600 +
      Number(durationMinutes.value) * 60 +
      Number(durationSeconds.value)
    const distanceMeters = state.distanceKm ? Math.round(state.distanceKm * 1000) : null

    // Reconstruct UTC date from local date and time strings
    // getUserDateFromLocal expects (dateStr: YYYY-MM-DD, timeStr: HH:mm:ss)
    const utcDate = getUserDateFromLocal(state.date, `${state.startTime || '00:00'}:00`)

    if (isNaN(utcDate.getTime())) {
      toast.add({
        title: 'Invalid Date',
        description: 'Please provide a valid date and time.',
        color: 'error'
      })
      return
    }

    saving.value = true
    try {
      await $fetch(`/api/workouts/${props.workout.id}`, {
        method: 'PATCH',
        body: {
          title: state.title,
          type: state.type,
          date: utcDate.toISOString(),
          description: state.description,
          durationSec: totalSeconds,
          distanceMeters: distanceMeters,
          trainingLoad: state.trainingLoad,
          tss: state.trainingLoad, // Sync both for compatibility
          calories: state.calories,
          elevationGain: state.elevationGain
        }
      })

      toast.add({
        title: 'Workout Updated',
        description: 'The activity has been successfully corrected.',
        color: 'success'
      })

      emit('updated')
      isOpen.value = false
    } catch (e: any) {
      console.error('Failed to update workout:', e)
      toast.add({
        title: 'Update Failed',
        description: e.data?.message || 'Failed to save changes. Please check your network.',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }
</script>
