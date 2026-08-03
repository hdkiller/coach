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

  // Helper to render the scale
  const scaleHelp = '1 = Low / 10 = High'
  const scaleHelpGood = '1 = Poor / 10 = Excellent'
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 1-10 Metrics -->
      <UFormGroup label="Personal Fatigue" name="personalFatigue" :help="scaleHelp">
        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-500 font-bold">1</span>
          <URange v-model="state.personalFatigue" :min="1" :max="10" />
          <span class="text-xs text-gray-500 font-bold">10</span>
        </div>
        <div class="text-center font-semibold mt-1">{{ state.personalFatigue }}</div>
      </UFormGroup>

      <UFormGroup label="Sleep Quality" name="wellnessSleep" :help="scaleHelpGood">
        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-500 font-bold">1</span>
          <URange v-model="state.wellnessSleep" :min="1" :max="10" />
          <span class="text-xs text-gray-500 font-bold">10</span>
        </div>
        <div class="text-center font-semibold mt-1">{{ state.wellnessSleep }}</div>
      </UFormGroup>

      <UFormGroup label="Stress Levels" name="wellnessStress" :help="scaleHelp">
        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-500 font-bold">1</span>
          <URange v-model="state.wellnessStress" :min="1" :max="10" />
          <span class="text-xs text-gray-500 font-bold">10</span>
        </div>
        <div class="text-center font-semibold mt-1">{{ state.wellnessStress }}</div>
      </UFormGroup>

      <UFormGroup label="Training Load" name="trainingLoad" :help="scaleHelp">
        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-500 font-bold">1</span>
          <URange v-model="state.trainingLoad" :min="1" :max="10" />
          <span class="text-xs text-gray-500 font-bold">10</span>
        </div>
        <div class="text-center font-semibold mt-1">{{ state.trainingLoad }}</div>
      </UFormGroup>

      <UFormGroup label="Training Difficulty" name="trainingDifficulty" :help="scaleHelp">
        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-500 font-bold">1</span>
          <URange v-model="state.trainingDifficulty" :min="1" :max="10" />
          <span class="text-xs text-gray-500 font-bold">10</span>
        </div>
        <div class="text-center font-semibold mt-1">{{ state.trainingDifficulty }}</div>
      </UFormGroup>

      <UFormGroup label="Hydration" name="trainingHydration" :help="scaleHelpGood">
        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-500 font-bold">1</span>
          <URange v-model="state.trainingHydration" :min="1" :max="10" />
          <span class="text-xs text-gray-500 font-bold">10</span>
        </div>
        <div class="text-center font-semibold mt-1">{{ state.trainingHydration }}</div>
      </UFormGroup>

      <UFormGroup label="Nutrition" name="trainingNutrition" :help="scaleHelpGood">
        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-500 font-bold">1</span>
          <URange v-model="state.trainingNutrition" :min="1" :max="10" />
          <span class="text-xs text-gray-500 font-bold">10</span>
        </div>
        <div class="text-center font-semibold mt-1">{{ state.trainingNutrition }}</div>
      </UFormGroup>

      <UFormGroup label="Recovery" name="trainingRecovery" :help="scaleHelpGood">
        <div class="flex items-center gap-4">
          <span class="text-xs text-gray-500 font-bold">1</span>
          <URange v-model="state.trainingRecovery" :min="1" :max="10" />
          <span class="text-xs text-gray-500 font-bold">10</span>
        </div>
        <div class="text-center font-semibold mt-1">{{ state.trainingRecovery }}</div>
      </UFormGroup>
    </div>

    <hr class="border-gray-200 dark:border-gray-800 my-4" />

    <div class="space-y-4">
      <h3 class="text-lg font-semibold">Additional Context (Optional)</h3>

      <UFormGroup label="Personal Notes" name="personalNotes">
        <UTextarea
          v-model="state.personalNotes"
          placeholder="Any general thoughts or feelings on your training..."
        />
      </UFormGroup>

      <UFormGroup label="Current Challenges" name="personalChallenges">
        <UTextarea
          v-model="state.personalChallenges"
          placeholder="What's holding you back right now?"
        />
      </UFormGroup>

      <UFormGroup label="Upcoming Goals" name="personalGoals">
        <UTextarea v-model="state.personalGoals" placeholder="What are we pushing for?" />
      </UFormGroup>

      <UFormGroup label="Weekly Highlights" name="personalHighlights">
        <UTextarea v-model="state.personalHighlights" placeholder="What went well?" />
      </UFormGroup>

      <UFormGroup label="Reported Injuries" name="wellnessInjury">
        <UTextarea v-model="state.wellnessInjury" placeholder="Describe any specific injuries..." />
      </UFormGroup>

      <UFormGroup label="Reported Pain / Soreness" name="wellnessPain">
        <UTextarea
          v-model="state.wellnessPain"
          placeholder="Describe any pain or general soreness..."
        />
      </UFormGroup>
    </div>

    <div class="flex justify-end pt-4">
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
