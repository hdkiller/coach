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

  // State for toggling descriptions
  const showDescriptions = reactive<Record<string, boolean>>({})

  const toggleDescription = (id: string) => {
    showDescriptions[id] = !showDescriptions[id]
  }

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
      slot: 'training',
      description: 'Evaluate your physical exertion, difficulty, and recovery over the past week.'
    },
    {
      label: 'Wellness',
      icon: 'i-heroicons-heart',
      slot: 'wellness',
      description:
        'Monitor your overall physical and mental well-being, including sleep, stress, and pain levels.'
    },
    {
      label: 'Personal',
      icon: 'i-heroicons-user',
      slot: 'context',
      description:
        'Provide additional context, highlight wins, and outline goals or challenges for the upcoming week.'
    }
  ]
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
    <UAccordion :items="accordionItems" multiple>
      <!-- Custom Header Template to include Description Toggle -->
      <template #default="{ item, open }">
        <UButton
          color="gray"
          variant="ghost"
          class="w-full text-lg font-bold py-4 border-b border-gray-100 dark:border-gray-800 rounded-none flex items-center justify-between"
          :ui="{ rounded: 'rounded-none', padding: { sm: 'p-4' } }"
        >
          <div className="flex items-center gap-3">
            <UIcon :name="item.icon" class="w-6 h-6 text-primary-500" />
            <span class="truncate">{{ item.label }}</span>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-information-circle"
              size="xs"
              class="text-gray-400 hover:text-primary-500"
              @click.stop="toggleDescription(item.label)"
            />
            <UIcon
              name="i-heroicons-chevron-right-20-solid"
              class="w-5 h-5 transform transition-transform duration-200"
              :class="[open && 'rotate-90']"
            />
          </div>
        </UButton>
        <div
          v-if="showDescriptions[item.label]"
          class="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400 italic"
        >
          {{ item.description }}
        </div>
      </template>

      <!-- Training Section (Blue theme) -->
      <template #training>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
          <div class="space-y-2">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300"
                >Training Intensity</label
              >
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('trainingDifficulty')"
              />
            </div>
            <p
              v-if="showDescriptions['trainingDifficulty']"
              class="text-xs text-gray-500 italic mb-2"
            >
              How physically demanding was this week of training compared to your expectation? (1:
              Too Easy, 10: Maximum Limit)
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingDifficulty }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.trainingDifficulty"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300"
                >Training Load</label
              >
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('trainingLoad')"
              />
            </div>
            <p v-if="showDescriptions['trainingLoad']" class="text-xs text-gray-500 italic mb-2">
              How manageable was the training load considering your motivation, recovery, and
              energy? (1: Impossible, 10: Perfect Flow)
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingLoad }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.trainingLoad"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300">Recovery</label>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('trainingRecovery')"
              />
            </div>
            <p
              v-if="showDescriptions['trainingRecovery']"
              class="text-xs text-gray-500 italic mb-2"
            >
              How would you rate your overall recovery between workouts this week? (1. Poor. 10.
              Optimal.)
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingRecovery }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.trainingRecovery"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300">Nutrition</label>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('trainingNutrition')"
              />
            </div>
            <p
              v-if="showDescriptions['trainingNutrition']"
              class="text-xs text-gray-500 italic mb-2"
            >
              Did you have good nutrition/fuel strategies for your workouts? (1. Terrible; 10.
              Perfect!)
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingNutrition }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.trainingNutrition"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300">Hydration</label>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('trainingHydration')"
              />
            </div>
            <p
              v-if="showDescriptions['trainingHydration']"
              class="text-xs text-gray-500 italic mb-2"
            >
              Did you have good hydration strategies for your workouts? (1. Terrible; 10. Perfect!)
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                [ {{ state.trainingHydration }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.trainingHydration"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      </template>

      <!-- Wellness Section (Orange theme) -->
      <template #wellness>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
          <div class="space-y-2">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300">Sleep</label>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('wellnessSleep')"
              />
            </div>
            <p v-if="showDescriptions['wellnessSleep']" class="text-xs text-gray-500 italic mb-2">
              How would you rate the duration and restorative quality of your sleep?
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
                [ {{ state.wellnessSleep }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.wellnessSleep"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300">Stress</label>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('wellnessStress')"
              />
            </div>
            <p v-if="showDescriptions['wellnessStress']" class="text-xs text-gray-500 italic mb-2">
              Have you had any issues with stress or stress management balancing training and life
              this week? (1. No Stress; 10. Overwhelming Stress)
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
                [ {{ state.wellnessStress }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.wellnessStress"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300">Pain Score</label>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('wellnessPainScore')"
              />
            </div>
            <p
              v-if="showDescriptions['wellnessPainScore']"
              class="text-xs text-gray-500 italic mb-2"
            >
              If injured please specify pain/discomfort level 1-10
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
                [ {{ state.wellnessPainScore }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.wellnessPainScore"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>
      </template>

      <!-- Personal Section -->
      <template #context>
        <div class="space-y-6 p-4">
          <div class="space-y-2 mb-4">
            <div class="flex justify-between items-center mb-1">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300">Energy</label>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('personalFatigue')"
              />
            </div>
            <p v-if="showDescriptions['personalFatigue']" class="text-xs text-gray-500 italic mb-2">
              In general, how is your energy and motivation towards life and training this week? (1.
              Zero Motivation; 10. Exhilirated!)
            </p>
            <div class="flex justify-between items-center mb-2 text-xs font-bold text-gray-500">
              <span>LOW</span>
              <span class="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded">
                [ {{ state.personalFatigue }} / 10 ]
              </span>
              <span>HIGH</span>
            </div>
            <input
              v-model.number="state.personalFatigue"
              type="range"
              min="1"
              max="10"
              class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>

          <div class="space-y-1">
            <div class="flex justify-between items-center">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300"
                >Hardest part of the week</label
              >
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('personalChallenges')"
              />
            </div>
            <p
              v-if="showDescriptions['personalChallenges']"
              class="text-xs text-gray-500 italic mb-1"
            >
              What was the hardest part of the week? (e.g., missed a session due to work, felt
              sluggish on the run, gear issues)
            </p>
            <UTextarea v-model="state.personalChallenges" placeholder="Your answer..." :rows="3" />
          </div>

          <div class="space-y-1">
            <div class="flex justify-between items-center">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300"
                >Best session or breakthrough</label
              >
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('personalHighlights')"
              />
            </div>
            <p
              v-if="showDescriptions['personalHighlights']"
              class="text-xs text-gray-500 italic mb-1"
            >
              What was your best session or biggest breakthrough this week? (e.g., nailed a pace,
              felt strong on the hills, executed good nutrition)
            </p>
            <UTextarea v-model="state.personalHighlights" placeholder="Your answer..." :rows="3" />
          </div>

          <div class="space-y-1">
            <div class="flex justify-between items-center">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300">Goal Updates</label>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('personalGoals')"
              />
            </div>
            <p v-if="showDescriptions['personalGoals']" class="text-xs text-gray-500 italic mb-1">
              Do you have any updates on current goals, new, or other personal goals you'd like to
              share?
            </p>
            <UTextarea v-model="state.personalGoals" placeholder="Your answer..." :rows="3" />
          </div>

          <div class="space-y-1">
            <div class="flex justify-between items-center">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300"
                >Additional Notes</label
              >
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('personalNotes')"
              />
            </div>
            <p v-if="showDescriptions['personalNotes']" class="text-xs text-gray-500 italic mb-1">
              Are there any additional notes or modifications you need made for the upcoming
              training phases?
            </p>
            <UTextarea v-model="state.personalNotes" placeholder="Your answer..." :rows="3" />
          </div>

          <div class="space-y-1">
            <div class="flex justify-between items-center">
              <label class="text-sm font-bold text-gray-700 dark:text-gray-300"
                >Aches / Pains</label
              >
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-chevron-down"
                size="2xs"
                @click="toggleDescription('wellnessInjury')"
              />
            </div>
            <p v-if="showDescriptions['wellnessInjury']" class="text-xs text-gray-500 italic mb-1">
              Do you have any new aches, pains, or "niggles" that are concerning you? If yes, please
              indicate where/what.
            </p>
            <UTextarea v-model="state.wellnessInjury" placeholder="Your answer..." :rows="3" />
          </div>
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
