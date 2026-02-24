<template>
  <UModal
    v-model:open="isOpen"
    title="Edit Wellness Record"
    description="Correct imported wellness values for this day."
    :ui="{ content: 'sm:max-w-3xl', body: 'p-0' }"
  >
    <template #content>
      <UForm :schema="schema" :state="state" @submit="onSubmit">
        <div class="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 text-primary" />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Record Metadata
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField
                label="Date"
                name="date"
                required
                description="Local calendar date for this record."
              >
                <UInput v-model="state.date" type="date" class="w-full" />
              </UFormField>
              <UFormField
                label="Tags"
                name="tags"
                description="Comma-separated context tags (for example: Travel, Sick, Alcohol)."
              >
                <UInput v-model="state.tags" placeholder="Alcohol, Sick, Travel" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Comments" name="comments" description="Optional notes about the day.">
              <UTextarea
                v-model="state.comments"
                :rows="3"
                placeholder="Context or notes about this day"
                class="w-full"
              />
            </UFormField>
          </section>

          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon name="i-heroicons-moon" class="w-4 h-4 text-primary" />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Recovery & Sleep
              </h4>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <UFormField label="Readiness" name="readiness" description="Overall readiness score (0-100).">
                <UInput v-model="state.readiness" type="number" min="0" max="100" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">%</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Recovery Score"
                name="recoveryScore"
                description="Recovery quality score (0-100)."
              >
                <UInput
                  v-model="state.recoveryScore"
                  type="number"
                  min="0"
                  max="100"
                  class="w-full"
                >
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">%</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Sleep Hours"
                name="sleepHours"
                description="Total sleep duration in hours."
              >
                <UInput v-model="state.sleepHours" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">h</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Sleep Seconds"
                name="sleepSecs"
                description="Raw sleep duration in seconds (if provided)."
              >
                <UInput v-model="state.sleepSecs" type="number" min="0" step="1" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">sec</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Sleep Score"
                name="sleepScore"
                description="Platform sleep score (usually 0-100)."
              >
                <UInput v-model="state.sleepScore" type="number" min="0" max="100" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">pts</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Sleep Quality (1-10)"
                name="sleepQuality"
                description="Subjective sleep quality scale from 1 to 10."
              >
                <UInput v-model="state.sleepQuality" type="number" min="1" max="10" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">/10</span>
                  </template>
                </UInput>
              </UFormField>
            </div>
          </section>

          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon name="i-heroicons-heart" class="w-4 h-4 text-primary" />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Cardiovascular
              </h4>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <UFormField label="HRV (rMSSD)" name="hrv" description="Heart rate variability in milliseconds.">
                <UInput v-model="state.hrv" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">ms</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="HRV SDNN" name="hrvSdnn" description="SDNN variability in milliseconds.">
                <UInput v-model="state.hrvSdnn" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">ms</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Resting HR" name="restingHr" description="Resting heart rate.">
                <UInput v-model="state.restingHr" type="number" min="0" step="1" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">bpm</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Avg Sleeping HR"
                name="avgSleepingHr"
                description="Average heart rate while asleep."
              >
                <UInput v-model="state.avgSleepingHr" type="number" min="0" step="1" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">bpm</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Respiration" name="respiration" description="Respiration rate per minute.">
                <UInput
                  v-model="state.respiration"
                  type="number"
                  step="any"
                  min="0"
                  class="w-full"
                >
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">br/min</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="SpO2 %" name="spO2" description="Blood oxygen saturation percentage.">
                <UInput v-model="state.spO2" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">%</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Systolic" name="systolic" description="Systolic blood pressure.">
                <UInput v-model="state.systolic" type="number" min="0" step="1" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">mmHg</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Diastolic" name="diastolic" description="Diastolic blood pressure.">
                <UInput v-model="state.diastolic" type="number" min="0" step="1" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">mmHg</span>
                  </template>
                </UInput>
              </UFormField>
            </div>
          </section>

          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon name="i-heroicons-face-smile" class="w-4 h-4 text-primary" />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Subjective Scores
              </h4>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <UFormField label="Soreness" name="soreness" description="Subjective soreness scale (1-10).">
                <UInput v-model="state.soreness" type="number" min="1" max="10" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">/10</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Fatigue" name="fatigue" description="Subjective fatigue scale (1-10).">
                <UInput v-model="state.fatigue" type="number" min="1" max="10" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">/10</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Stress" name="stress" description="Subjective stress scale (1-10).">
                <UInput v-model="state.stress" type="number" min="1" max="10" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">/10</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Mood" name="mood" description="Subjective mood scale (1-10).">
                <UInput v-model="state.mood" type="number" min="1" max="10" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">/10</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Motivation"
                name="motivation"
                description="Subjective motivation scale (1-10)."
              >
                <UInput v-model="state.motivation" type="number" min="1" max="10" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">/10</span>
                  </template>
                </UInput>
              </UFormField>
            </div>
          </section>

          <section class="space-y-4">
            <div
              class="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2"
            >
              <UIcon name="i-heroicons-beaker" class="w-4 h-4 text-primary" />
              <h4 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Body, Labs & Context
              </h4>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <UFormField label="Weight (kg)" name="weight" description="Body weight in kilograms.">
                <UInput v-model="state.weight" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">kg</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Body Fat %" name="bodyFat" description="Body fat percentage.">
                <UInput v-model="state.bodyFat" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">%</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Abdomen (cm)" name="abdomen" description="Abdominal circumference in cm.">
                <UInput v-model="state.abdomen" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">cm</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Blood Glucose"
                name="bloodGlucose"
                description="Blood glucose value as provided by your source device."
              >
                <UInput
                  v-model="state.bloodGlucose"
                  type="number"
                  step="any"
                  min="0"
                  class="w-full"
                >
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">glucose</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Skin Temp" name="skinTemp" description="Skin temperature delta from baseline.">
                <UInput v-model="state.skinTemp" type="number" step="any" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">deg</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="VO2 Max" name="vo2max" description="Estimated maximal oxygen uptake.">
                <UInput v-model="state.vo2max" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">ml/kg/min</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="Lactate" name="lactate" description="Blood lactate concentration.">
                <UInput v-model="state.lactate" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">mmol/L</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="CTL" name="ctl" description="Chronic training load (fitness proxy).">
                <UInput v-model="state.ctl" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">load</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField label="ATL" name="atl" description="Acute training load (fatigue proxy).">
                <UInput v-model="state.atl" type="number" step="any" min="0" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">load</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Hydration Status"
                name="hydration"
                description="Text status from provider (for example: WELL_HYDRATED)."
              >
                <UInput v-model="state.hydration" placeholder="e.g. WELL_HYDRATED" class="w-full" />
              </UFormField>
              <UFormField
                label="Hydration Volume"
                name="hydrationVolume"
                description="Hydration volume value as reported by source."
              >
                <UInput
                  v-model="state.hydrationVolume"
                  type="number"
                  step="any"
                  min="0"
                  class="w-full"
                >
                  <template #trailing>
                    <span class="text-xs text-gray-500 pr-2">volume</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField
                label="Menstrual Phase"
                name="menstrualPhase"
                description="Cycle phase label from provider or manual entry."
              >
                <UInput
                  v-model="state.menstrualPhase"
                  placeholder="Follicular, Luteal, etc."
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="Injury"
                name="injury"
                class="sm:col-span-2 md:col-span-3"
                description="Optional injury context impacting readiness."
              >
                <UInput
                  v-model="state.injury"
                  placeholder="Short injury description"
                  class="w-full"
                />
              </UFormField>
            </div>
          </section>
        </div>

        <div
          class="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
        >
          <UButton label="Cancel" color="neutral" variant="ghost" @click="isOpen = false" />
          <UButton
            type="submit"
            label="Save Wellness Changes"
            color="primary"
            class="px-6 font-bold"
            :loading="saving"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import { z } from 'zod'

  const props = defineProps<{
    wellness: Record<string, any> | null
  }>()

  const emit = defineEmits<{
    updated: []
  }>()

  const isOpen = defineModel<boolean>('open', { default: false })
  const toast = useToast()
  const { formatDateUTC } = useFormat()
  const saving = ref(false)

  const schema = z.object({
    date: z.string().min(1, 'Date is required')
  })

  const state = reactive({
    date: '',
    comments: '',
    tags: '',
    hrv: '',
    hrvSdnn: '',
    restingHr: '',
    avgSleepingHr: '',
    sleepSecs: '',
    sleepHours: '',
    sleepScore: '',
    sleepQuality: '',
    readiness: '',
    recoveryScore: '',
    soreness: '',
    fatigue: '',
    stress: '',
    mood: '',
    motivation: '',
    weight: '',
    spO2: '',
    ctl: '',
    atl: '',
    abdomen: '',
    bloodGlucose: '',
    bodyFat: '',
    diastolic: '',
    hydration: '',
    hydrationVolume: '',
    injury: '',
    lactate: '',
    menstrualPhase: '',
    respiration: '',
    skinTemp: '',
    systolic: '',
    vo2max: ''
  })

  watch(
    [isOpen, () => props.wellness],
    ([open]) => {
      if (!open || !props.wellness) return

      state.date = formatDateUTC(props.wellness.date, 'yyyy-MM-dd')
      state.comments = stringOrEmpty(props.wellness.comments)
      state.tags = stringOrEmpty(props.wellness.tags)
      state.hrv = numberOrEmpty(props.wellness.hrv)
      state.hrvSdnn = numberOrEmpty(props.wellness.hrvSdnn)
      state.restingHr = numberOrEmpty(props.wellness.restingHr)
      state.avgSleepingHr = numberOrEmpty(props.wellness.avgSleepingHr)
      state.sleepSecs = numberOrEmpty(props.wellness.sleepSecs)
      state.sleepHours = numberOrEmpty(props.wellness.sleepHours)
      state.sleepScore = numberOrEmpty(props.wellness.sleepScore)
      state.sleepQuality = numberOrEmpty(props.wellness.sleepQuality)
      state.readiness = numberOrEmpty(props.wellness.readiness)
      state.recoveryScore = numberOrEmpty(props.wellness.recoveryScore)
      state.soreness = numberOrEmpty(props.wellness.soreness)
      state.fatigue = numberOrEmpty(props.wellness.fatigue)
      state.stress = numberOrEmpty(props.wellness.stress)
      state.mood = numberOrEmpty(props.wellness.mood)
      state.motivation = numberOrEmpty(props.wellness.motivation)
      state.weight = numberOrEmpty(props.wellness.weight)
      state.spO2 = numberOrEmpty(props.wellness.spO2)
      state.ctl = numberOrEmpty(props.wellness.ctl)
      state.atl = numberOrEmpty(props.wellness.atl)
      state.abdomen = numberOrEmpty(props.wellness.abdomen)
      state.bloodGlucose = numberOrEmpty(props.wellness.bloodGlucose)
      state.bodyFat = numberOrEmpty(props.wellness.bodyFat)
      state.diastolic = numberOrEmpty(props.wellness.diastolic)
      state.hydration = stringOrEmpty(props.wellness.hydration)
      state.hydrationVolume = numberOrEmpty(props.wellness.hydrationVolume)
      state.injury = stringOrEmpty(props.wellness.injury)
      state.lactate = numberOrEmpty(props.wellness.lactate)
      state.menstrualPhase = stringOrEmpty(props.wellness.menstrualPhase)
      state.respiration = numberOrEmpty(props.wellness.respiration)
      state.skinTemp = numberOrEmpty(props.wellness.skinTemp)
      state.systolic = numberOrEmpty(props.wellness.systolic)
      state.vo2max = numberOrEmpty(props.wellness.vo2max)
    },
    { immediate: true }
  )

  function numberOrEmpty(value: number | null | undefined) {
    return value == null ? '' : String(value)
  }

  function stringOrEmpty(value: string | null | undefined) {
    return value ?? ''
  }

  function normalizeInput(value: unknown) {
    if (value == null) return ''
    return typeof value === 'string' ? value : String(value)
  }

  function parseFloatOrNull(value: unknown) {
    const normalized = normalizeInput(value).trim()
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  function parseIntOrNull(value: unknown) {
    const normalized = normalizeInput(value).trim()
    if (!normalized) return null
    const parsed = Number.parseInt(normalized, 10)
    return Number.isFinite(parsed) ? parsed : null
  }

  function parseStringOrNull(value: unknown) {
    const trimmed = normalizeInput(value).trim()
    return trimmed.length > 0 ? trimmed : null
  }

  async function onSubmit() {
    if (!props.wellness?.id) return

    saving.value = true
    try {
      await $fetch(`/api/wellness/${props.wellness.id}`, {
        method: 'PATCH',
        body: {
          date: state.date,
          comments: parseStringOrNull(state.comments),
          tags: parseStringOrNull(state.tags),
          hrv: parseFloatOrNull(state.hrv),
          hrvSdnn: parseFloatOrNull(state.hrvSdnn),
          restingHr: parseIntOrNull(state.restingHr),
          avgSleepingHr: parseIntOrNull(state.avgSleepingHr),
          sleepSecs: parseIntOrNull(state.sleepSecs),
          sleepHours: parseFloatOrNull(state.sleepHours),
          sleepScore: parseIntOrNull(state.sleepScore),
          sleepQuality: parseIntOrNull(state.sleepQuality),
          readiness: parseIntOrNull(state.readiness),
          recoveryScore: parseIntOrNull(state.recoveryScore),
          soreness: parseIntOrNull(state.soreness),
          fatigue: parseIntOrNull(state.fatigue),
          stress: parseIntOrNull(state.stress),
          mood: parseIntOrNull(state.mood),
          motivation: parseIntOrNull(state.motivation),
          weight: parseFloatOrNull(state.weight),
          spO2: parseFloatOrNull(state.spO2),
          ctl: parseFloatOrNull(state.ctl),
          atl: parseFloatOrNull(state.atl),
          abdomen: parseFloatOrNull(state.abdomen),
          bloodGlucose: parseFloatOrNull(state.bloodGlucose),
          bodyFat: parseFloatOrNull(state.bodyFat),
          diastolic: parseIntOrNull(state.diastolic),
          hydration: parseStringOrNull(state.hydration),
          hydrationVolume: parseFloatOrNull(state.hydrationVolume),
          injury: parseStringOrNull(state.injury),
          lactate: parseFloatOrNull(state.lactate),
          menstrualPhase: parseStringOrNull(state.menstrualPhase),
          respiration: parseFloatOrNull(state.respiration),
          skinTemp: parseFloatOrNull(state.skinTemp),
          systolic: parseIntOrNull(state.systolic),
          vo2max: parseFloatOrNull(state.vo2max)
        }
      })

      toast.add({
        title: 'Wellness Updated',
        description: 'Record corrections have been saved.',
        color: 'success'
      })
      isOpen.value = false
      emit('updated')
    } catch (error: any) {
      toast.add({
        title: 'Save Failed',
        description: error?.data?.message || error?.message || 'Unable to update wellness record.',
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }
</script>
