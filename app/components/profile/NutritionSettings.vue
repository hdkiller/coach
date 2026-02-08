<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              Metabolic Profile
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your physiological baseline for nutrition calculations.
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-6">
        <UFormGroup label="Basal Metabolic Rate (BMR)" name="bmr" help="Calories burned at rest.">
          <UInput
            v-model.number="localSettings.bmr"
            type="number"
            :min="500"
            :max="5000"
            placeholder="1600"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">kcal/day</span>
            </template>
          </UInput>
        </UFormGroup>

        <UFormGroup label="Daily Activity Level" name="activityLevel">
          <USelect
            v-model="localSettings.activityLevel"
            :options="activityLevels"
            option-attribute="label"
          />
        </UFormGroup>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          Fueling Strategy (Gut Training)
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure how aggressive your carb intake should be during training.
        </p>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormGroup
          label="Current Max Carb Intake"
          name="currentCarbMax"
          help="What your gut can currently handle comfortably."
        >
          <UInput v-model.number="localSettings.currentCarbMax" type="number" :min="0" :max="150">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">g/hr</span>
            </template>
          </UInput>
        </UFormGroup>

        <UFormGroup
          label="Target Goal"
          name="ultimateCarbGoal"
          help="Your long-term objective for carb adaptation."
        >
          <UInput v-model.number="localSettings.ultimateCarbGoal" type="number" :min="0" :max="150">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">g/hr</span>
            </template>
          </UInput>
        </UFormGroup>
      </div>

      <div v-if="localSettings.currentCarbMax > localSettings.ultimateCarbGoal" class="mt-4">
        <UAlert
          icon="i-heroicons-exclamation-triangle"
          color="yellow"
          variant="soft"
          title="Goal Configuration Error"
          description="Your current intake exceeds your target goal. Is this intentional?"
        />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          Hydration Precision
        </h3>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormGroup label="Sweat Rate" name="sweatRate">
          <UInput
            v-model.number="localSettings.sweatRate"
            type="number"
            :step="0.1"
            :min="0"
            :max="5.0"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">L/hr</span>
            </template>
          </UInput>
        </UFormGroup>

        <UFormGroup label="Sodium Concentration" name="sodiumTarget">
          <UInput
            v-model.number="localSettings.sodiumTarget"
            type="number"
            :step="50"
            :min="0"
            :max="2000"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">mg/L</span>
            </template>
          </UInput>
        </UFormGroup>
      </div>
    </UCard>

    <div class="flex justify-end pt-4">
      <UButton
        :loading="loading"
        label="Save Nutrition Settings"
        color="primary"
        @click="saveSettings"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    settings?: any
  }>()

  const emit = defineEmits(['update:settings'])

  const localSettings = ref({
    bmr: 1600,
    activityLevel: 'MODERATELY_ACTIVE',
    currentCarbMax: 60,
    ultimateCarbGoal: 90,
    sweatRate: 0.8,
    sodiumTarget: 750,
    ...props.settings
  })

  const loading = ref(false)
  const toast = useToast()

  const activityLevels = [
    { label: 'Sedentary', value: 'SEDENTARY' },
    { label: 'Lightly Active', value: 'LIGHTLY_ACTIVE' },
    { label: 'Moderately Active', value: 'MODERATELY_ACTIVE' },
    { label: 'Very Active', value: 'VERY_ACTIVE' },
    { label: 'Extra Active', value: 'EXTRA_ACTIVE' }
  ]

  watch(
    () => props.settings,
    (newVal) => {
      if (newVal) {
        localSettings.value = { ...localSettings.value, ...newVal }
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
        title: 'Nutrition Settings Saved',
        description: 'Your metabolic profile has been updated.',
        color: 'success'
      })

      emit('update:settings', localSettings.value)
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
