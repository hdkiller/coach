<template>
  <div class="space-y-6 animate-fade-in pb-24">
    <!-- Metabolic Profile -->
    <UCard>
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              {{ t('nutrition_header_metabolic') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('nutrition_desc_metabolic') }}
            </p>
          </div>
          <UButton
            icon="i-heroicons-calculator"
            size="sm"
            variant="soft"
            color="primary"
            :label="t('nutrition_button_calculate_bmr')"
            @click="calculateBMR"
          />
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormField :label="t('nutrition_form_bmr')" name="bmr" :help="t('nutrition_help_bmr')">
          <UInput v-model.number="localSettings.bmr" type="number" class="w-full">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">kcal/day</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_activity_level')"
          name="activityLevel"
          :help="t('nutrition_help_activity_level')"
        >
          <USelectMenu
            v-model="localSettings.activityLevel"
            :items="activityLevels"
            value-key="value"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>

        <UFormField
          :label="t('nutrition_form_calories_mode')"
          name="baseCaloriesMode"
          :help="t('nutrition_help_calories_mode')"
        >
          <USelectMenu
            v-model="localSettings.baseCaloriesMode"
            :items="baseCaloriesModes"
            value-key="value"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          />
        </UFormField>

        <UFormField
          v-if="localSettings.baseCaloriesMode === 'MANUAL_NON_EXERCISE'"
          :label="t('nutrition_form_manual_calories')"
          name="nonExerciseBaseCalories"
          :help="t('nutrition_help_manual_calories')"
        >
          <UInput
            v-model.number="localSettings.nonExerciseBaseCalories"
            type="number"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">kcal</span>
            </template>
          </UInput>
        </UFormField>
      </div>

      <!-- Resulting TDEE Info -->
      <div
        class="mt-8 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-800 flex flex-col sm:flex-row justify-around items-center text-center gap-6"
      >
        <div class="space-y-1">
          <p
            class="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest"
          >
            {{ t('nutrition_summary_tdee') }}
          </p>
          <p class="text-3xl font-black text-primary-700 dark:text-primary-300">
            {{ tdee }} <span class="text-sm font-bold opacity-70">kcal</span>
          </p>
        </div>
        <div class="h-12 w-px bg-primary-200 dark:bg-primary-800 hidden sm:block" />
        <div class="space-y-1">
          <p
            class="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest"
          >
            {{ t('nutrition_summary_target') }}
          </p>
          <p class="text-3xl font-black text-primary-700 dark:text-primary-300">
            {{ targetCalories }} <span class="text-sm font-bold opacity-70">kcal</span>
          </p>
        </div>
      </div>
    </UCard>

    <!-- Fueling Strategy -->
    <UCard>
      <template #header>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              {{ t('nutrition_header_periodization') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('nutrition_desc_periodization') }}
            </p>
          </div>
        </div>
      </template>

      <div
        class="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
      >
        <UFormField
          :label="t('nutrition_form_training_phase')"
          name="trainingPhase"
          :help="t('nutrition_help_training_phase')"
        >
          <USelectMenu
            v-model="selectedPhase"
            :items="trainingPhases"
            value-key="value"
            class="w-full"
            :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
          >
            <template #leading>
              <UIcon
                :name="
                  selectedPhase === 'RACE'
                    ? 'i-heroicons-trophy'
                    : selectedPhase === 'BUILD'
                      ? 'i-heroicons-bolt'
                      : 'i-heroicons-calendar'
                "
                class="w-4 h-4 text-primary-500"
              />
            </template>
          </USelectMenu>
        </UFormField>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormField
          :label="t('nutrition_form_carb_limit')"
          name="currentCarbMax"
          :help="t('nutrition_help_carb_limit')"
        >
          <UInput
            v-model.number="localSettings.currentCarbMax"
            type="number"
            :min="0"
            :max="150"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">g/hr</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_carb_goal')"
          name="ultimateCarbGoal"
          :help="t('nutrition_help_carb_goal')"
        >
          <UInput
            v-model.number="localSettings.ultimateCarbGoal"
            type="number"
            :min="0"
            :max="150"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">g/hr</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_carb_slope')"
          name="carbScalingFactor"
          :help="t('nutrition_help_carb_slope')"
        >
          <UInput
            v-model.number="localSettings.carbScalingFactor"
            type="number"
            :step="0.05"
            :min="0.5"
            :max="2.0"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">x</span>
            </template>
          </UInput>
        </UFormField>

        <div class="md:col-span-2 space-y-4">
          <UFormField
            :label="t('nutrition_form_supplements')"
            name="enabledSupplements"
            :help="t('nutrition_help_supplements')"
          >
            <USelectMenu
              v-model="localSettings.enabledSupplements"
              :items="supplementOptions"
              multiple
              value-key="value"
              placeholder="Select supplements..."
              class="w-full"
              size="lg"
            >
              <template #leading>
                <UIcon name="i-heroicons-beaker" class="w-4 h-4 text-primary-500" />
              </template>
            </USelectMenu>
          </UFormField>
        </div>
      </div>

      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800"
      >
        <UFormField
          :label="t('nutrition_form_protein')"
          name="baseProteinPerKg"
          :help="t('nutrition_help_protein')"
        >
          <UInput
            v-model.number="localSettings.baseProteinPerKg"
            type="number"
            :step="0.1"
            :min="1.0"
            :max="3.0"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">g/kg</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_fat')"
          name="baseFatPerKg"
          :help="t('nutrition_help_fat')"
        >
          <UInput
            v-model.number="localSettings.baseFatPerKg"
            type="number"
            :step="0.1"
            :min="0.5"
            :max="2.0"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">g/kg</span>
            </template>
          </UInput>
        </UFormField>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <UFormField
          :label="t('nutrition_form_pre_window')"
          name="preWorkoutWindow"
          :help="t('nutrition_help_pre_window')"
        >
          <UInput
            v-model.number="localSettings.preWorkoutWindow"
            type="number"
            :step="15"
            :min="30"
            :max="180"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">min</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_post_window')"
          name="postWorkoutWindow"
          :help="t('nutrition_help_post_window')"
        >
          <UInput
            v-model.number="localSettings.postWorkoutWindow"
            type="number"
            :step="15"
            :min="30"
            :max="240"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">min</span>
            </template>
          </UInput>
        </UFormField>
      </div>
    </UCard>

    <div class="flex justify-end pt-4">
      <UButton
        :loading="loading"
        :label="t('nutrition_button_save')"
        color="primary"
        @click="saveSettings"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'
  import { ftInToCm, cmToFtIn, LBS_TO_KG } from '~/utils/metrics'

  const { t } = useTranslate('profile')

  const props = defineProps<{
    settings?: any
    profile?: any
  }>()

  const emit = defineEmits(['update:settings', 'navigate', 'saved'])

  const localSettings = ref({
    nutritionTrackingEnabled: props.profile?.nutritionTrackingEnabled ?? true,
    bmr: 1600,
    activityLevel: 'MODERATELY_ACTIVE',
    baseCaloriesMode: 'AUTO',
    nonExerciseBaseCalories: null as number | null,
    currentCarbMax: 60,
    ultimateCarbGoal: 90,
    sweatRate: 0.8,
    sodiumTarget: 750,
    carbScalingFactor: 1.0,
    fuelingSensitivity: 1.0,
    fuelState1Trigger: 0.6,
    fuelState1Min: 3.0,
    fuelState1Max: 4.5,
    fuelState2Trigger: 0.85,
    fuelState2Min: 5.0,
    fuelState2Max: 7.5,
    fuelState3Min: 8.0,
    fuelState3Max: 12.0,
    metabolicFloor: 0.6,
    enabledSupplements: [],
    baseProteinPerKg: 1.6,
    baseFatPerKg: 1.0,
    preWorkoutWindow: 120,
    postWorkoutWindow: 60,
    goalProfile: 'MAINTAIN',
    targetAdjustmentPercent: 0.0,
    mealPattern: [
      { name: 'Breakfast', time: '07:00' },
      { name: 'Lunch', time: '12:00' },
      { name: 'Dinner', time: '18:00' },
      { name: 'Snack', time: '15:00' }
    ],
    dietaryProfile: [],
    foodAllergies: [],
    foodIntolerances: [],
    lifestyleExclusions: [],
    ...props.settings
  })

  const loading = ref(false)
  const toast = useToast()

  const activityLevels = [
    { label: 'Sedentary', value: 'SEDENTARY' },
    { label: 'Lightly Active', value: 'LIGHTLY_ACTIVE' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Moderately Active', value: 'MODERATELY_ACTIVE' },
    { label: 'Very Active', value: 'VERY_ACTIVE' },
    { label: 'Extra Active', value: 'EXTRA_ACTIVE' }
  ]

  const baseCaloriesModes = [
    { label: 'Auto (BMR × Activity)', value: 'AUTO' },
    { label: 'Manual (No Exercise Baseline)', value: 'MANUAL_NON_EXERCISE' }
  ]

  const goalProfiles = [
    { label: 'Lose Weight (-300 to -500 kcal)', value: 'LOSE' },
    { label: 'Maintain (Energy Balance)', value: 'MAINTAIN' },
    { label: 'Gain Muscle (+200 to +500 kcal)', value: 'GAIN' }
  ]

  const dietaryOptions = [
    { label: 'Vegan', value: 'VEGAN' },
    { label: 'Vegetarian', value: 'VEGETARIAN' },
    { label: 'Gluten-Free', value: 'GLUTEN_FREE' },
    { label: 'Dairy-Free', value: 'DAIRY_FREE' },
    { label: 'Low-FODMAP', value: 'LOW_FODMAP' },
    { label: 'Keto', value: 'KETO' },
    { label: 'Paleo', value: 'PALEO' },
    { label: 'Mediterranean', value: 'MEDITERRANEAN' },
    { label: 'Halal', value: 'HALAL' },
    { label: 'Kosher', value: 'KOSHER' }
  ]

  const lifestyleOptions = [
    { label: 'No Alcohol', value: 'NO_ALCOHOL' },
    { label: 'No Caffeine', value: 'NO_CAFFEINE' },
    { label: 'No Refined Sugar', value: 'NO_REFINED_SUGAR' },
    { label: 'No Seed Oils', value: 'NO_SEED_OILS' },
    { label: 'No Processed Foods', value: 'NO_PROCESSED_FOODS' },
    { label: 'No Artificial Sweeteners', value: 'NO_SWEETENERS' },
    { label: 'No Carbonated Drinks', value: 'NO_SODA' },
    { label: 'No Pork', value: 'NO_PORK' },
    { label: 'No Red Meat', value: 'NO_RED_MEAT' }
  ]

  const allergyOptions = [
    { label: 'Peanuts', value: 'PEANUTS' },
    { label: 'Tree Nuts (Almonds, Walnuts, etc.)', value: 'TREE_NUTS' },
    { label: 'Milk / Dairy', value: 'MILK' },
    { label: 'Eggs', value: 'EGGS' },
    { label: 'Wheat', value: 'WHEAT' },
    { label: 'Soy', value: 'SOY' },
    { label: 'Fish', value: 'FISH' },
    { label: 'Shellfish', value: 'SHELLFISH' },
    { label: 'Sesame', value: 'SESAME' },
    { label: 'Mustard', value: 'MUSTARD' },
    { label: 'Celery', value: 'CELERY' }
  ]

  const intoleranceOptions = [
    { label: 'Lactose', value: 'LACTOSE' },
    { label: 'Fructose', value: 'FRUCTOSE' },
    { label: 'Histamine', value: 'HISTAMINE' },
    { label: 'Nightshades (Tomatoes, Peppers, etc.)', value: 'NIGHTSHADES' },
    { label: 'Sulfites', value: 'SULFITES' },
    { label: 'Yeast', value: 'YEAST' },
    { label: 'Legumes / Beans', value: 'LEGUMES' },
    { label: 'Artificial Sweeteners', value: 'SWEETENERS' }
  ]

  const supplementOptions = [
    {
      label: 'Caffeine',
      value: 'caffeine',
      description: 'Pre-workout stimulant for focus and fatigue reduction'
    },
    {
      label: 'Nitrates / Beetroot',
      value: 'nitrates',
      description: 'Improves blood flow and oxygen delivery'
    },
    {
      label: 'Beta-Alanine',
      value: 'beta_alanine',
      description: 'Buffers muscle acidity during high intensity'
    },
    { label: 'Creatine', value: 'creatine', description: 'Increases power output and recovery' },
    {
      label: 'Sodium Bicarbonate',
      value: 'sodium_bicarbonate',
      description: 'Intracellular buffer for high-intensity efforts'
    },
    {
      label: 'Glycerol',
      value: 'glycerol',
      description: 'Hyperhydration agent for hot conditions'
    },
    {
      label: 'Electrolytes',
      value: 'electrolytes',
      description: 'Crucial for fluid balance and nerve function'
    },
    { label: 'Omega-3', value: 'omega_3', description: 'Supports heart and joint health' },
    {
      label: 'Vitamin D',
      value: 'vitamin_d',
      description: 'Essential for bone health and immune function'
    },
    { label: 'Iron', value: 'iron', description: 'Oxygen transport (crucial for endurance)' },
    { label: 'Magnesium', value: 'magnesium', description: 'Nerve function and muscle relaxation' },
    {
      label: 'Tart Cherry',
      value: 'tart_cherry',
      description: 'Potent antioxidant for muscle recovery'
    },
    { label: 'Collagen', value: 'collagen', description: 'Supports tendon and ligament integrity' },
    {
      label: 'Probiotics',
      value: 'probiotics',
      description: 'Optimizes gut health and nutrient absorption'
    },
    { label: 'CoQ10', value: 'coq10', description: 'Supports mitochondrial energy production' }
  ]

  const trainingPhases = [
    { label: 'Base Phase (Fat Adapted / Recovery)', value: 'BASE' },
    { label: 'Build Phase (High Performance)', value: 'BUILD' },
    { label: 'Taper / Race Week (High Carb Loading)', value: 'RACE' },
    { label: 'Custom', value: 'CUSTOM' }
  ]

  const phasePresets: Record<string, any> = {
    BASE: { baseProteinPerKg: 1.8, baseFatPerKg: 1.2, carbScalingFactor: 0.8 },
    BUILD: { baseProteinPerKg: 1.6, baseFatPerKg: 0.9, carbScalingFactor: 1.1 },
    RACE: { baseProteinPerKg: 1.4, baseFatPerKg: 0.6, carbScalingFactor: 1.4 }
  }

  const selectedPhase = ref('CUSTOM')

  watch(selectedPhase, (newPhase) => {
    if (newPhase && phasePresets[newPhase]) {
      const preset = phasePresets[newPhase]
      localSettings.value.baseProteinPerKg = preset.baseProteinPerKg
      localSettings.value.baseFatPerKg = preset.baseFatPerKg
      localSettings.value.carbScalingFactor = preset.carbScalingFactor
    }
  })

  const palMultipliers: Record<string, number> = {
    SEDENTARY: 1.2,
    LIGHTLY_ACTIVE: 1.375,
    MODERATELY_ACTIVE: 1.55,
    VERY_ACTIVE: 1.725,
    EXTRA_ACTIVE: 1.9
  }

  const isProfileDataMissing = computed(() => {
    const p = props.profile
    return !p?.weight || !p?.height || !p?.dob || !p?.sex
  })

  const displayWeight = computed(() => {
    const weightKg = props.profile?.weight
    if (weightKg === undefined || weightKg === null) return undefined
    if (props.profile?.weightUnits === 'Pounds') {
      return Number((weightKg / LBS_TO_KG).toFixed(1))
    }
    return weightKg
  })

  const tdee = computed(() => {
    if (localSettings.value.baseCaloriesMode === 'MANUAL_NON_EXERCISE') {
      return Math.round(localSettings.value.nonExerciseBaseCalories || 0)
    }
    const pal = palMultipliers[localSettings.value.activityLevel] || 1.2
    return Math.round(localSettings.value.bmr * pal)
  })

  const targetCalories = computed(() => {
    const adjustment = localSettings.value.targetAdjustmentPercent || 0
    return Math.round(tdee.value * (1 + adjustment / 100))
  })

  const adjustmentRange = computed(() => {
    switch (localSettings.value.goalProfile) {
      case 'LOSE':
        return { min: -30, max: -5, step: 1 }
      case 'GAIN':
        return { min: 5, max: 20, step: 1 }
      default:
        return { min: 0, max: 0, step: 0 } // MAINTAIN
    }
  })

  // Reset adjustment when profile changes
  watch(
    () => localSettings.value.goalProfile,
    (newProfile) => {
      if (newProfile === 'MAINTAIN') {
        localSettings.value.targetAdjustmentPercent = 0
      } else if (newProfile === 'LOSE') {
        localSettings.value.targetAdjustmentPercent = -15
      } else if (newProfile === 'GAIN') {
        localSettings.value.targetAdjustmentPercent = 10
      }
    }
  )

  watch(
    () => localSettings.value.baseCaloriesMode,
    (mode) => {
      if (mode === 'MANUAL_NON_EXERCISE' && !localSettings.value.nonExerciseBaseCalories) {
        const pal = palMultipliers[localSettings.value.activityLevel] || 1.2
        localSettings.value.nonExerciseBaseCalories = Math.round(localSettings.value.bmr * pal)
      }
    }
  )

  function addMeal() {
    if (!localSettings.value.mealPattern) {
      localSettings.value.mealPattern = []
    }
    localSettings.value.mealPattern.push({ name: 'New Meal', time: '08:00' })
  }

  function removeMeal(index: number | string) {
    const idx = typeof index === 'string' ? parseInt(index, 10) : index
    if (Array.isArray(localSettings.value.mealPattern)) {
      localSettings.value.mealPattern.splice(idx, 1)
    }
  }

  function calculateBMR() {
    if (isProfileDataMissing.value) {
      toast.add({
        title: t.value('nutrition_toast_missing_data_title'),
        description: t.value('nutrition_toast_missing_data_desc'),
        color: 'warning'
      })
      return
    }

    const p = props.profile
    // Use weight directly in kilograms as standardized in DB and provided by API
    const weightKg = p.weight

    // Height is already in cm in the profile (as per heightUnits="cm" default)
    const heightCm = p.height

    // Calculate age
    const birthDate = new Date(p.dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    // Mifflin-St Jeor
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age
    if (p.sex?.toLowerCase() === 'male' || p.sex === 'M') {
      bmr += 5
    } else {
      bmr -= 161
    }

    localSettings.value.bmr = Math.round(bmr)

    toast.add({
      title: t.value('nutrition_toast_bmr_calc_title'),
      description: t.value('nutrition_toast_bmr_calc_desc', { bmr: localSettings.value.bmr }),
      color: 'success'
    })
  }

  watch(
    () => props.profile,
    (newVal) => {
      if (newVal) {
        localSettings.value.nutritionTrackingEnabled = newVal.nutritionTrackingEnabled
      }
    },
    { immediate: true }
  )

  watch(
    () => props.settings,
    (newVal) => {
      if (!newVal) return

      // Update local state if it differs from prop (e.g. data loaded from server)
      // We check key by key to avoid resetting everything if only one field changes
      for (const key in newVal) {
        if (Object.prototype.hasOwnProperty.call(newVal, key)) {
          const propVal = JSON.stringify(newVal[key])
          const localVal = JSON.stringify(
            localSettings.value[key as keyof typeof localSettings.value]
          )

          if (propVal !== localVal) {
            localSettings.value[key as keyof typeof localSettings.value] = JSON.parse(propVal)
          }
        }
      }
    },
    { deep: true, immediate: true }
  )

  async function saveSettings() {
    loading.value = true
    try {
      await $fetch('/api/profile/nutrition', {
        method: 'POST',
        body: localSettings.value
      })

      toast.add({
        title: t.value('nutrition_toast_saved_title'),
        description: t.value('nutrition_toast_saved_desc'),
        color: 'success'
      })

      emit('update:settings', localSettings.value)
      emit('saved')
    } catch (err: any) {
      toast.add({
        title: 'Save Failed',
        description: err.data?.message || err.message,
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }
</script>
