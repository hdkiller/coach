<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { z } from 'zod'
  import type { FormSubmitEvent } from '#ui/types'

  const { t } = useTranslate('profile')
  const tr = (key: string, fallback: string, params?: Record<string, any>) =>
    typeof t.value === 'function' ? t.value(key, params) : fallback

  const toast = useToast()

  const daysEnums = [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'
  ] as const
  type Day = (typeof daysEnums)[number]

  const days = computed<{ label: string; value: Day }[]>(() => [
    { label: tr('comm_day_mon', 'Mon'), value: 'MONDAY' },
    { label: tr('comm_day_tue', 'Tue'), value: 'TUESDAY' },
    { label: tr('comm_day_wed', 'Wed'), value: 'WEDNESDAY' },
    { label: tr('comm_day_thu', 'Thu'), value: 'THURSDAY' },
    { label: tr('comm_day_fri', 'Fri'), value: 'FRIDAY' },
    { label: tr('comm_day_sat', 'Sat'), value: 'SATURDAY' },
    { label: tr('comm_day_sun', 'Sun'), value: 'SUNDAY' }
  ])

  const schema = z.object({
    workoutAnalysis: z.boolean(),
    thresholdUpdates: z.boolean(),
    planUpdates: z.boolean(),
    billing: z.boolean(),
    productUpdates: z.boolean(),
    retentionNudges: z.boolean(),
    dailyCoach: z.boolean(),
    dailyCoachTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    dailyCoachDays: z.array(z.enum(daysEnums)),
    marketing: z.boolean(),
    globalUnsubscribe: z.boolean()
  })

  type Schema = z.output<typeof schema>

  const state = reactive<Schema>({
    workoutAnalysis: true,
    thresholdUpdates: true,
    planUpdates: true,
    billing: true,
    productUpdates: true,
    retentionNudges: true,
    dailyCoach: true,
    dailyCoachTime: '07:00',
    dailyCoachDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
    marketing: false,
    globalUnsubscribe: false
  })

  const isLoading = ref(true)
  const isSaving = ref(false)

  onMounted(async () => {
    try {
      const data = (await $fetch('/api/profile/email-preferences')) as any
      if (data) {
        state.workoutAnalysis = data.workoutAnalysis ?? true
        state.thresholdUpdates = data.thresholdUpdates ?? true
        state.planUpdates = data.planUpdates ?? true
        state.billing = data.billing ?? true
        state.productUpdates = data.productUpdates ?? true
        state.retentionNudges = data.retentionNudges ?? true
        state.dailyCoach = data.dailyCoach ?? true
        state.dailyCoachTime = data.dailyCoachTime ?? '07:00'
        state.dailyCoachDays = data.dailyCoachDays ?? [
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
          'SATURDAY',
          'SUNDAY'
        ]
        state.marketing = data.marketing ?? false
        state.globalUnsubscribe = data.globalUnsubscribe ?? false
      }
    } catch (error) {
      console.error('Failed to load preferences', error)
    } finally {
      isLoading.value = false
    }
  })

  // Watch for global unsubscribe to disable everything else
  watch(
    () => state.globalUnsubscribe,
    (newVal) => {
      if (newVal) {
        state.workoutAnalysis = false
        state.thresholdUpdates = false
        state.planUpdates = false
        state.productUpdates = false
        state.retentionNudges = false
        state.dailyCoach = false
        state.marketing = false
      }
    }
  )

  async function onSubmit(event: FormSubmitEvent<Schema>) {
    isSaving.value = true
    try {
      await $fetch('/api/profile/email-preferences', {
        method: 'PUT',
        body: event.data
      })
      toast.add({
        title: t.value('comm_toast_updated_title'),
        description: t.value('comm_toast_updated_desc'),
        color: 'success'
      })
    } catch (error) {
      console.error('Failed to save preferences', error)
      toast.add({
        title: t.value('comm_toast_failed_title'),
        description: t.value('comm_toast_failed_desc'),
        color: 'error'
      })
    } finally {
      isSaving.value = false
    }
  }

  function toggleDay(dayValue: Day) {
    const index = state.dailyCoachDays.indexOf(dayValue)
    if (index === -1) {
      state.dailyCoachDays.push(dayValue)
    } else {
      state.dailyCoachDays.splice(index, 1)
    }
  }

  function isDaySelected(dayValue: Day) {
    return state.dailyCoachDays.includes(dayValue)
  }
</script>

<template>
  <div v-if="!isLoading" class="space-y-6">
    <UForm :schema="schema" :state="state" @submit="onSubmit">
      <div class="space-y-6">
        <!-- Global Override Card -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-no-symbol" class="w-5 h-5 text-error-500" />
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                {{ t('comm_header_override') }}
              </h3>
            </div>
          </template>

          <UFormField name="globalUnsubscribe">
            <UCheckbox
              v-model="state.globalUnsubscribe"
              :label="t('comm_label_unsubscribe_all')"
              :description="t('comm_desc_unsubscribe_all')"
              color="error"
            />
          </UFormField>
        </UCard>

        <!-- Training Insights Card -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-academic-cap" class="w-5 h-5 text-primary-500" />
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                {{ t('comm_header_insights') }}
              </h3>
            </div>
          </template>

          <div class="space-y-6">
            <!-- Daily Coach -->
            <div class="space-y-4">
              <UFormField name="dailyCoach">
                <UCheckbox
                  v-model="state.dailyCoach"
                  :label="t('comm_label_daily_coach')"
                  :description="t('comm_desc_daily_coach')"
                  :disabled="state.globalUnsubscribe"
                />
              </UFormField>

              <div
                v-if="state.dailyCoach && !state.globalUnsubscribe"
                class="ml-7 space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800"
              >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <UFormField
                    :label="t('comm_label_daily_time')"
                    name="dailyCoachTime"
                    :help="t('comm_help_daily_time')"
                  >
                    <UInput v-model="state.dailyCoachTime" type="time" class="w-32" />
                  </UFormField>
                </div>

                <UFormField :label="t('comm_label_daily_days')" name="dailyCoachDays">
                  <div class="flex flex-wrap gap-2 pt-1">
                    <UButton
                      v-for="day in days"
                      :key="day.value"
                      :variant="isDaySelected(day.value) ? 'solid' : 'outline'"
                      :color="isDaySelected(day.value) ? 'primary' : 'neutral'"
                      size="xs"
                      @click="toggleDay(day.value)"
                    >
                      {{ day.label }}
                    </UButton>
                  </div>
                </UFormField>
              </div>
            </div>

            <UFormField name="workoutAnalysis">
              <UCheckbox
                v-model="state.workoutAnalysis"
                :label="t('comm_label_workout_analysis')"
                :description="t('comm_desc_workout_analysis')"
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
            <UFormField name="thresholdUpdates">
              <UCheckbox
                v-model="state.thresholdUpdates"
                :label="t('comm_label_threshold_updates')"
                :description="t('comm_desc_threshold_updates')"
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
            <UFormField name="planUpdates">
              <UCheckbox
                v-model="state.planUpdates"
                :label="t('comm_label_plan_updates')"
                :description="t('comm_desc_plan_updates')"
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
            <UFormField name="retentionNudges">
              <UCheckbox
                v-model="state.retentionNudges"
                :label="t('comm_label_retention')"
                :description="t('comm_desc_retention')"
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Product & Marketing Card -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-warning-500" />
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                {{ t('comm_header_product_marketing') }}
              </h3>
            </div>
          </template>

          <div class="space-y-6">
            <UFormField name="productUpdates">
              <UCheckbox
                v-model="state.productUpdates"
                :label="t('comm_label_product_updates')"
                :description="t('comm_desc_product_updates')"
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
            <UFormField name="marketing">
              <UCheckbox
                v-model="state.marketing"
                :label="t('comm_label_marketing')"
                :description="t('comm_desc_marketing')"
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Required Card -->
        <UCard :ui="{ body: 'opacity-75' }">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-credit-card" class="w-5 h-5 text-gray-400" />
              <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                {{ t('comm_header_account') }}
              </h3>
            </div>
          </template>

          <UFormField name="billing">
            <UCheckbox
              v-model="state.billing"
              :label="t('comm_label_billing')"
              :description="t('comm_desc_billing')"
              disabled
            />
          </UFormField>
        </UCard>

        <!-- Action Bar -->
        <div class="flex justify-end pt-2">
          <UButton
            type="submit"
            color="primary"
            size="lg"
            :loading="isSaving"
            icon="i-heroicons-check"
          >
            {{ t('comm_button_save') }}
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
  <div v-else class="flex justify-center p-12">
    <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-primary-500" />
  </div>
</template>
