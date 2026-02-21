<script setup lang="ts">
  import { z } from 'zod'
  import type { FormSubmitEvent } from '#ui/types'

  const toast = useToast()

  const days = [
    { label: 'Mon', value: 'MONDAY' },
    { label: 'Tue', value: 'TUESDAY' },
    { label: 'Wed', value: 'WEDNESDAY' },
    { label: 'Thu', value: 'THURSDAY' },
    { label: 'Fri', value: 'FRIDAY' },
    { label: 'Sat', value: 'SATURDAY' },
    { label: 'Sun', value: 'SUNDAY' }
  ]

  const schema = z.object({
    workoutAnalysis: z.boolean(),
    planUpdates: z.boolean(),
    billing: z.boolean(),
    productUpdates: z.boolean(),
    retentionNudges: z.boolean(),
    dailyCoach: z.boolean(),
    dailyCoachTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    dailyCoachDays: z.array(
      z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
    ),
    marketing: z.boolean(),
    globalUnsubscribe: z.boolean()
  })

  type Schema = z.output<typeof schema>

  const state = reactive<Schema>({
    workoutAnalysis: true,
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
      const data = await $fetch<any>('/api/profile/email-preferences')
      if (data) {
        state.workoutAnalysis = data.workoutAnalysis ?? true
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
        title: 'Preferences Updated',
        description: 'Your communication preferences have been saved.',
        color: 'success'
      })
    } catch (error) {
      console.error('Failed to save preferences', error)
      toast.add({
        title: 'Error',
        description: 'Failed to save preferences.',
        color: 'error'
      })
    } finally {
      isSaving.value = false
    }
  }

  function toggleDay(dayValue: string) {
    const index = state.dailyCoachDays.indexOf(dayValue)
    if (index === -1) {
      state.dailyCoachDays.push(dayValue)
    } else {
      state.dailyCoachDays.splice(index, 1)
    }
  }

  function isDaySelected(dayValue: string) {
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
                Communication Override
              </h3>
            </div>
          </template>

          <UFormField name="globalUnsubscribe">
            <UCheckbox
              v-model="state.globalUnsubscribe"
              label="Unsubscribe from all optional emails"
              description="Instantly opt-out of all coaching nudges and product updates. You will still receive critical billing notices."
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
                Training Insights
              </h3>
            </div>
          </template>

          <div class="space-y-6">
            <!-- Daily Coach -->
            <div class="space-y-4">
              <UFormField name="dailyCoach">
                <UCheckbox
                  v-model="state.dailyCoach"
                  label="Daily Training Recommendation"
                  description="Receive an email every morning with your AI-powered training guidance."
                  :disabled="state.globalUnsubscribe"
                />
              </UFormField>

              <div
                v-if="state.dailyCoach && !state.globalUnsubscribe"
                class="ml-7 space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800"
              >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <UFormField
                    label="Preferred Time"
                    name="dailyCoachTime"
                    help="When should we send your daily brief?"
                  >
                    <UInput v-model="state.dailyCoachTime" type="time" class="w-32" />
                  </UFormField>
                </div>

                <UFormField label="Scheduled Days" name="dailyCoachDays">
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
                label="Workout Analysis"
                description="Receive an email when your AI workout analysis is ready."
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
            <UFormField name="planUpdates">
              <UCheckbox
                v-model="state.planUpdates"
                label="Plan Updates"
                description="Get notified when your upcoming training plan is generated or adjusted."
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
            <UFormField name="retentionNudges">
              <UCheckbox
                v-model="state.retentionNudges"
                label="Coaching Nudges"
                description="Weekly summaries, check-ins, and reminders to stay on track."
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
                Product & Marketing
              </h3>
            </div>
          </template>

          <div class="space-y-6">
            <UFormField name="productUpdates">
              <UCheckbox
                v-model="state.productUpdates"
                label="Product Updates"
                description="News about new features, integrations, and platform improvements."
                :disabled="state.globalUnsubscribe"
              />
            </UFormField>
            <UFormField name="marketing">
              <UCheckbox
                v-model="state.marketing"
                label="Marketing & Offers"
                description="Promotions, discounts, and partnership offers."
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
                Account & Billing
              </h3>
            </div>
          </template>

          <UFormField name="billing">
            <UCheckbox
              v-model="state.billing"
              label="Billing Notices"
              description="Receipts, failed payment alerts, and subscription updates. (Mandatory)"
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
            Save Preferences
          </UButton>
        </div>
      </div>
    </UForm>
  </div>
  <div v-else class="flex justify-center p-12">
    <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 animate-spin text-primary-500" />
  </div>
</template>
