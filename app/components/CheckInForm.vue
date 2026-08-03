<script setup lang="ts">
  import { reactive, ref } from 'vue'
  import { z } from 'zod'

  const emit = defineEmits(['success'])
  const toast = useToast()

  const state = reactive({
    // Subjective Metrics (1-10)
    personalFatigue: 5,
    wellnessSleep: 5,
    wellnessStress: 5,
    wellnessPainScore: 1,
    trainingLoad: 5,
    trainingDifficulty: 5,
    trainingHydration: 5,
    trainingNutrition: 5,
    trainingRecovery: 5,

    // Text Responses
    personalChallenges: '',
    personalGoals: '',
    personalHighlights: '',
    personalNotes: '',
    wellnessInjury: '',
    wellnessPain: ''
  })

  // Validation Schema
  const schema = z.object({
    personalFatigue: z.number().min(1).max(10),
    wellnessSleep: z.number().min(1).max(10),
    wellnessStress: z.number().min(1).max(10),
    wellnessPainScore: z.number().min(1).max(10),
    trainingLoad: z.number().min(1).max(10),
    trainingDifficulty: z.number().min(1).max(10),
    trainingHydration: z.number().min(1).max(10),
    trainingNutrition: z.number().min(1).max(10),
    trainingRecovery: z.number().min(1).max(10),

    personalChallenges: z.string().optional(),
    personalGoals: z.string().optional(),
    personalHighlights: z.string().optional(),
    personalNotes: z.string().optional(),
    wellnessInjury: z.string().optional(),
    wellnessPain: z.string().optional()
  })

  const isLoading = ref(false)

  async function onSubmit() {
    isLoading.value = true
    try {
      await $fetch('/api/check-in', {
        method: 'POST',
        body: state
      })

      toast.add({
        title: 'Check-In Submitted!',
        description: 'Coach Watts is analyzing your data...',
        icon: 'i-heroicons-check-circle',
        color: 'green'
      })

      emit('success')
    } catch (error) {
      toast.add({
        title: 'Error Submitting Check-In',
        description: 'Please try again later.',
        icon: 'i-heroicons-exclamation-circle',
        color: 'red'
      })
    } finally {
      isLoading.value = false
    }
  }

  const accordionItems = [
    {
      label: 'Training',
      icon: 'i-heroicons-bolt',
      defaultOpen: true,
      slot: 'training'
    },
    {
      label: 'Wellness',
      icon: 'i-heroicons-heart',
      slot: 'wellness'
    },
    {
      label: 'Additional Context',
      icon: 'i-heroicons-document-text',
      slot: 'context'
    }
  ]
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
    <UAccordion :items="accordionItems" multiple>
      <!-- Training Section (Blue theme) -->
      <template #training>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
          <UFormGroup label="Training Load" name="trainingLoad">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingLoad }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <URange v-model="state.trainingLoad" :min="1" :max="10" color="primary" />
          </UFormGroup>

          <UFormGroup label="Training Difficulty" name="trainingDifficulty">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingDifficulty }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <URange v-model="state.trainingDifficulty" :min="1" :max="10" color="primary" />
          </UFormGroup>

          <UFormGroup label="Recovery" name="trainingRecovery">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingRecovery }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <URange v-model="state.trainingRecovery" :min="1" :max="10" color="primary" />
          </UFormGroup>

          <UFormGroup label="Hydration" name="trainingHydration">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingHydration }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <URange v-model="state.trainingHydration" :min="1" :max="10" color="primary" />
          </UFormGroup>

          <UFormGroup label="Nutrition" name="trainingNutrition">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingNutrition }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <URange v-model="state.trainingNutrition" :min="1" :max="10" color="primary" />
          </UFormGroup>
        </div>
      </template>

      <!-- Wellness Section (Orange theme) -->
      <template #wellness>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
          <UFormGroup label="Personal Fatigue" name="personalFatigue">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
                [ {{ state.personalFatigue }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <URange v-model="state.personalFatigue" :min="1" :max="10" color="orange" />
          </UFormGroup>

          <UFormGroup label="Sleep Quality" name="wellnessSleep">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>POOR</span>
              <span class="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
                [ {{ state.wellnessSleep }} / 10 ]
              </span>
              <span>EXCELLENT</span>
            </div>
            <URange v-model="state.wellnessSleep" :min="1" :max="10" color="orange" />
          </UFormGroup>

          <UFormGroup label="Stress Levels" name="wellnessStress">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
                [ {{ state.wellnessStress }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <URange v-model="state.wellnessStress" :min="1" :max="10" color="orange" />
          </UFormGroup>

          <UFormGroup label="Pain Score" name="wellnessPainScore">
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>NONE</span>
              <span class="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
                [ {{ state.wellnessPainScore }} / 10 ]
              </span>
              <span>SEVERE</span>
            </div>
            <URange v-model="state.wellnessPainScore" :min="1" :max="10" color="orange" />
          </UFormGroup>
        </div>
      </template>

      <!-- Additional Context Section -->
      <template #context>
        <div class="space-y-6 p-4">
          <UFormGroup label="Personal Notes" name="personalNotes">
            <UTextarea
              v-model="state.personalNotes"
              placeholder="Any general thoughts or feelings on your training..."
              :rows="3"
            />
          </UFormGroup>

          <UFormGroup label="Current Challenges" name="personalChallenges">
            <UTextarea
              v-model="state.personalChallenges"
              placeholder="What's holding you back right now?"
              :rows="3"
            />
          </UFormGroup>

          <UFormGroup label="Upcoming Goals" name="personalGoals">
            <UTextarea
              v-model="state.personalGoals"
              placeholder="What are we pushing for?"
              :rows="3"
            />
          </UFormGroup>

          <UFormGroup label="Weekly Highlights" name="personalHighlights">
            <UTextarea v-model="state.personalHighlights" placeholder="What went well?" :rows="3" />
          </UFormGroup>

          <UFormGroup label="Reported Injuries" name="wellnessInjury">
            <UTextarea
              v-model="state.wellnessInjury"
              placeholder="Describe any specific injuries..."
              :rows="3"
            />
          </UFormGroup>

          <UFormGroup label="Reported Pain / Soreness" name="wellnessPain">
            <UTextarea
              v-model="state.wellnessPain"
              placeholder="Describe any pain or general soreness..."
              :rows="3"
            />
          </UFormGroup>
        </div>
      </template>
    </UAccordion>

    <div class="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
      <UButton
        type="submit"
        color="primary"
        size="lg"
        :loading="isLoading"
        icon="i-heroicons-paper-airplane"
      >
        Submit Check-In
      </UButton>
    </div>
  </UForm>
</template>
