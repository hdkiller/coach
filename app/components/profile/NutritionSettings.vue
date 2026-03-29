<template>
  <div class="space-y-6">
    <UCard>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white">
              {{ t('nutrition_header_enable') }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t('nutrition_desc_enable') }}
            </p>
          </div>
        </div>
        <USwitch
          v-model="localSettings.nutritionTrackingEnabled"
          size="lg"
          @update:model-value="saveSettings"
        />
      </div>
    </UCard>

    <UAlert
      v-if="isProfileDataMissing"
      icon="i-heroicons-exclamation-triangle"
      color="warning"
      variant="soft"
      :title="t('nutrition_alert_missing_data_title')"
      :description="t('nutrition_alert_missing_data_desc')"
      :actions="[
        {
          label: t('nutrition_alert_missing_data_action'),
          color: 'warning',
          variant: 'solid',
          onClick: () => $emit('navigate', 'basic')
        }
      ]"
    />

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              {{ t('nutrition_header_metabolic') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('nutrition_desc_metabolic') }}
            </p>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UFormField
          :label="t('nutrition_form_weight')"
          name="weight"
          :help="t('nutrition_help_weight')"
        >
          <UInput :model-value="displayWeight" type="number" disabled class="w-full">
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                props.profile?.weightUnits === 'Pounds' ? 'lbs' : 'kg'
              }}</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('nutrition_form_bmr')" name="bmr" :help="t('nutrition_help_bmr')">
          <div class="flex gap-2">
            <UInput
              v-model.number="localSettings.bmr"
              type="number"
              :min="500"
              :max="5000"
              placeholder="1600"
              class="flex-1"
            >
              <template #trailing>
                <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                  t('nutrition_unit_kcal_day')
                }}</span>
              </template>
            </UInput>
            <UButton
              icon="i-heroicons-calculator"
              color="neutral"
              variant="subtle"
              @click="calculateBMR"
            >
              {{ t('nutrition_button_set_bmr') }}
            </UButton>
          </div>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_activity_level')"
          name="activityLevel"
          class="md:col-span-1"
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
            :min="800"
            :max="6000"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_kcal_day')
              }}</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_tdee')"
          name="tdee"
          :help="
            localSettings.baseCaloriesMode === 'MANUAL_NON_EXERCISE'
              ? t('nutrition_help_tdee_manual')
              : t('nutrition_help_tdee_auto')
          "
        >
          <UInput
            :model-value="tdee"
            type="number"
            disabled
            class="w-full"
            :ui="{ base: 'bg-gray-50 dark:bg-gray-800' }"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_kcal_day')
              }}</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_metabolic_floor')"
          name="metabolicFloor"
          :help="t('nutrition_help_metabolic_floor')"
        >
          <div class="flex items-center gap-4">
            <UInput
              v-model.number="localSettings.metabolicFloor"
              type="number"
              :step="0.05"
              :min="0.1"
              :max="0.95"
              class="flex-1"
            >
              <template #trailing>
                <span class="text-gray-500 dark:text-gray-400 text-xs"
                  >{{ Math.round(localSettings.metabolicFloor * 100) }}%</span
                >
              </template>
            </UInput>
          </div>
        </UFormField>

        <div class="md:col-span-2 space-y-4">
          <UFormField
            :label="t('nutrition_form_goal_profile')"
            name="goalProfile"
            :help="t('nutrition_help_goal_profile')"
          >
            <USelectMenu
              v-model="localSettings.goalProfile"
              :items="goalProfiles"
              value-key="value"
              class="w-full"
              :ui="{ content: 'w-full min-w-[var(--reka-popper-anchor-width)]' }"
            />
          </UFormField>

          <div
            v-if="localSettings.goalProfile !== 'MAINTAIN'"
            class="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="flex justify-between mb-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
                {{
                  t('nutrition_label_aggressiveness', {
                    pct: `${localSettings.targetAdjustmentPercent > 0 ? '+' : ''}${localSettings.targetAdjustmentPercent}`
                  })
                }}
              </label>
              <span class="text-xs text-gray-500">
                {{
                  localSettings.goalProfile === 'LOSE'
                    ? t('nutrition_badge_deficit')
                    : t('nutrition_badge_surplus')
                }}
              </span>
            </div>
            <USlider
              v-model.number="localSettings.targetAdjustmentPercent"
              :min="adjustmentRange.min"
              :max="adjustmentRange.max"
              :step="adjustmentRange.step"
              :color="localSettings.goalProfile === 'LOSE' ? 'warning' : 'success'"
            />
            <p class="text-xs text-gray-500 mt-2">
              {{
                localSettings.goalProfile === 'LOSE'
                  ? t('nutrition_help_deficit_desc')
                  : t('nutrition_help_surplus_desc')
              }}
            </p>
          </div>
        </div>

        <UFormField
          :label="t('nutrition_form_target_calories')"
          name="targetCalories"
          :help="t('nutrition_help_target_calories')"
        >
          <UInput
            :model-value="targetCalories"
            type="number"
            disabled
            class="w-full"
            :ui="{ base: 'font-bold text-primary-600 dark:text-primary-400' }"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_kcal_day')
              }}</span>
            </template>
          </UInput>
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
              {{ t('nutrition_header_meal_schedule') }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('nutrition_desc_meal_schedule') }}
            </p>
          </div>
          <UButton
            icon="i-heroicons-plus"
            size="xs"
            color="primary"
            variant="soft"
            :label="t('nutrition_button_add_meal')"
            @click="addMeal"
          />
        </div>
      </template>

      <div class="space-y-4">
        <div
          v-for="(meal, index) in localSettings.mealPattern"
          :key="index"
          class="flex items-center gap-4"
        >
          <UInput
            v-model="meal.name"
            :placeholder="t('nutrition_placeholder_meal_name')"
            class="flex-1"
          />
          <UInput v-model="meal.time" type="time" class="w-32" />
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="sm"
            @click="removeMeal(index)"
          />
        </div>
        <p v-if="!localSettings.mealPattern?.length" class="text-sm text-gray-500 italic">
          {{ t('nutrition_empty_meal_schedule') }}
        </p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          {{ t('nutrition_header_constraints') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ t('nutrition_desc_constraints') }}
        </p>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormField
          :label="t('nutrition_form_dietary_profile')"
          name="dietaryProfile"
          :help="t('nutrition_help_dietary_profile')"
        >
          <USelectMenu
            v-model="localSettings.dietaryProfile"
            :items="dietaryOptions"
            multiple
            value-key="value"
            :placeholder="t('nutrition_placeholder_select_patterns')"
            class="w-full"
            size="lg"
          >
            <template #leading>
              <UIcon name="i-heroicons-user-circle" class="w-4 h-4 text-primary-500" />
            </template>
          </USelectMenu>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_food_allergies')"
          name="foodAllergies"
          :help="t('nutrition_help_food_allergies')"
        >
          <USelectMenu
            v-model="localSettings.foodAllergies"
            :items="allergyOptions"
            multiple
            value-key="value"
            :placeholder="t('nutrition_placeholder_select_allergies')"
            class="w-full"
            size="lg"
          >
            <template #leading>
              <UIcon name="i-heroicons-exclamation-circle" class="w-4 h-4 text-error-500" />
            </template>
          </USelectMenu>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_food_intolerances')"
          name="foodIntolerances"
          :help="t('nutrition_help_food_intolerances')"
        >
          <USelectMenu
            v-model="localSettings.foodIntolerances"
            :items="intoleranceOptions"
            multiple
            value-key="value"
            :placeholder="t('nutrition_placeholder_select_intolerances')"
            class="w-full"
            size="lg"
          >
            <template #leading>
              <UIcon name="i-heroicons-no-symbol" class="w-4 h-4 text-warning-500" />
            </template>
          </USelectMenu>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_lifestyle_exclusions')"
          name="lifestyleExclusions"
          :help="t('nutrition_help_lifestyle_exclusions')"
        >
          <USelectMenu
            v-model="localSettings.lifestyleExclusions"
            :items="lifestyleOptions"
            multiple
            value-key="value"
            :placeholder="t('nutrition_placeholder_select_exclusions')"
            class="w-full"
            size="lg"
          >
            <template #leading>
              <UIcon name="i-heroicons-shield-exclamation" class="w-4 h-4 text-neutral-500" />
            </template>
          </USelectMenu>
        </UFormField>
      </div>
    </UCard>

    <UCard class="border-primary-200 dark:border-primary-800 border-2">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3
              class="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center gap-2"
            >
              {{ t('nutrition_header_fuel_calibration') }}
              <UBadge size="xs" color="primary" variant="subtle">{{
                t('nutrition_badge_pro')
              }}</UBadge>
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('nutrition_desc_fuel_calibration') }}
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-8">
        <div
          class="bg-primary-50 dark:bg-primary-950/20 p-4 rounded-lg border border-primary-100 dark:border-primary-900/30"
        >
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-semibold text-primary-900 dark:text-primary-100">
              {{
                t('nutrition_label_fueling_sensitivity', {
                  pct: Math.round(localSettings.fuelingSensitivity * 100)
                })
              }}
            </label>
            <span class="text-xs text-primary-700 dark:text-primary-300 font-medium">
              {{
                localSettings.fuelingSensitivity < 1
                  ? t('nutrition_badge_fat_adapted')
                  : localSettings.fuelingSensitivity > 1
                    ? t('nutrition_badge_sugar_burner')
                    : t('nutrition_badge_standard')
              }}
            </span>
          </div>
          <USlider
            v-model="localSettings.fuelingSensitivity"
            :min="0.8"
            :max="1.2"
            :step="0.05"
            color="primary"
          />
          <p class="text-xs text-gray-500 mt-2">
            {{ t('nutrition_help_fueling_sensitivity') }}
          </p>
        </div>

        <div class="grid grid-cols-1 gap-6">
          <!-- State 1 -->
          <div
            class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="flex items-center gap-2 mb-4">
              <div
                class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm"
              >
                1
              </div>
              <div>
                <h4 class="text-sm font-bold">{{ t('nutrition_state1_title') }}</h4>
                <p class="text-xs text-gray-500">{{ t('nutrition_state1_desc') }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormField :label="t('nutrition_form_trigger_if_lt')" name="fuelState1Trigger">
                <UInput
                  v-model.number="localSettings.fuelState1Trigger"
                  type="number"
                  :step="0.05"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('nutrition_form_min_carbs_gkg')" name="fuelState1Min">
                <UInput
                  v-model.number="localSettings.fuelState1Min"
                  type="number"
                  :step="0.1"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('nutrition_form_max_carbs_gkg')" name="fuelState1Max">
                <UInput
                  v-model.number="localSettings.fuelState1Max"
                  type="number"
                  :step="0.1"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <!-- State 2 -->
          <div
            class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="flex items-center gap-2 mb-4">
              <div
                class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-sm"
              >
                2
              </div>
              <div>
                <h4 class="text-sm font-bold">{{ t('nutrition_state2_title') }}</h4>
                <p class="text-xs text-gray-500">{{ t('nutrition_state2_desc') }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormField :label="t('nutrition_form_trigger_if_lt')" name="fuelState2Trigger">
                <UInput
                  v-model.number="localSettings.fuelState2Trigger"
                  type="number"
                  :step="0.05"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('nutrition_form_min_carbs_gkg')" name="fuelState2Min">
                <UInput
                  v-model.number="localSettings.fuelState2Min"
                  type="number"
                  :step="0.1"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('nutrition_form_max_carbs_gkg')" name="fuelState2Max">
                <UInput
                  v-model.number="localSettings.fuelState2Max"
                  type="number"
                  :step="0.1"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>

          <!-- State 3 -->
          <div
            class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800"
          >
            <div class="flex items-center gap-2 mb-4">
              <div
                class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-700 dark:text-orange-400 font-bold text-sm"
              >
                3
              </div>
              <div>
                <h4 class="text-sm font-bold">{{ t('nutrition_state3_title') }}</h4>
                <p class="text-xs text-gray-500">{{ t('nutrition_state3_desc') }}</p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormField
                :label="t('nutrition_form_trigger_if_gt')"
                name="fuelState2Trigger_repeat"
              >
                <UInput
                  :model-value="localSettings.fuelState2Trigger"
                  disabled
                  type="number"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('nutrition_form_min_carbs_gkg')" name="fuelState3Min">
                <UInput
                  v-model.number="localSettings.fuelState3Min"
                  type="number"
                  :step="0.1"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('nutrition_form_max_carbs_gkg')" name="fuelState3Max">
                <UInput
                  v-model.number="localSettings.fuelState3Max"
                  type="number"
                  :step="0.1"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <UCard class="border-primary-200 dark:border-primary-800 border-2">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3
              class="text-lg font-medium leading-6 text-gray-900 dark:text-white flex items-center gap-2"
            >
              {{ t('nutrition_header_adaptive_engine') }}
              <UBadge size="xs" color="primary" variant="subtle">{{
                t('nutrition_badge_pro')
              }}</UBadge>
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('nutrition_desc_adaptive_engine') }}
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
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_grams_per_hour')
              }}</span>
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
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_grams_per_hour')
              }}</span>
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
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_multiplier')
              }}</span>
            </template>
          </UInput>
        </UFormField>

        <div class="md:col-span-1 space-y-4">
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
              :placeholder="t('nutrition_placeholder_select_supplements')"
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
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_grams_per_kg')
              }}</span>
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
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_grams_per_kg')
              }}</span>
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
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_minutes')
              }}</span>
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
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_minutes')
              }}</span>
            </template>
          </UInput>
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h3 class="text-lg font-medium leading-6 text-gray-900 dark:text-white">
          {{ t('nutrition_header_hydration') }}
        </h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ t('nutrition_desc_hydration') }}
        </p>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UFormField
          :label="t('nutrition_form_sweat_rate')"
          name="sweatRate"
          :help="t('nutrition_help_sweat_rate')"
        >
          <UInput
            v-model.number="localSettings.sweatRate"
            type="number"
            :step="0.1"
            :min="0"
            :max="5.0"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_liters_per_hour')
              }}</span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('nutrition_form_sodium')"
          name="sodiumTarget"
          :help="t('nutrition_help_sodium')"
        >
          <UInput
            v-model.number="localSettings.sodiumTarget"
            type="number"
            :step="50"
            :min="0"
            :max="2000"
            class="w-full"
          >
            <template #trailing>
              <span class="text-gray-500 dark:text-gray-400 text-xs">{{
                t('nutrition_unit_mg_per_liter')
              }}</span>
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
  const tr = (key: string, fallback: string, params?: Record<string, any>) =>
    typeof t.value === 'function' ? t.value(key, params) : fallback

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
      { name: tr('nutrition_meal_breakfast', 'Breakfast'), time: '07:00' },
      { name: tr('nutrition_meal_lunch', 'Lunch'), time: '12:00' },
      { name: tr('nutrition_meal_dinner', 'Dinner'), time: '18:00' },
      { name: tr('nutrition_meal_snack', 'Snack'), time: '15:00' }
    ],
    dietaryProfile: [],
    foodAllergies: [],
    foodIntolerances: [],
    lifestyleExclusions: [],
    ...props.settings
  })

  const loading = ref(false)
  const toast = useToast()

  const activityLevels = computed(() => [
    { label: tr('nutrition_activity_sedentary', 'Sedentary'), value: 'SEDENTARY' },
    { label: tr('nutrition_activity_lightly_active', 'Lightly Active'), value: 'LIGHTLY_ACTIVE' },
    { label: tr('nutrition_activity_active', 'Active'), value: 'ACTIVE' },
    {
      label: tr('nutrition_activity_moderately_active', 'Moderately Active'),
      value: 'MODERATELY_ACTIVE'
    },
    { label: tr('nutrition_activity_very_active', 'Very Active'), value: 'VERY_ACTIVE' },
    { label: tr('nutrition_activity_extra_active', 'Extra Active'), value: 'EXTRA_ACTIVE' }
  ])

  const baseCaloriesModes = computed(() => [
    { label: tr('nutrition_mode_auto', 'Auto (BMR × Activity)'), value: 'AUTO' },
    {
      label: tr('nutrition_mode_manual', 'Manual (No Exercise Baseline)'),
      value: 'MANUAL_NON_EXERCISE'
    }
  ])

  const goalProfiles = computed(() => [
    { label: tr('nutrition_goal_lose', 'Lose Weight (-300 to -500 kcal)'), value: 'LOSE' },
    { label: tr('nutrition_goal_maintain', 'Maintain (Energy Balance)'), value: 'MAINTAIN' },
    { label: tr('nutrition_goal_gain', 'Gain Muscle (+200 to +500 kcal)'), value: 'GAIN' }
  ])

  const dietaryOptions = computed(() => [
    { label: tr('nutrition_diet_vegan', 'Vegan'), value: 'VEGAN' },
    { label: tr('nutrition_diet_vegetarian', 'Vegetarian'), value: 'VEGETARIAN' },
    { label: tr('nutrition_diet_gluten_free', 'Gluten-Free'), value: 'GLUTEN_FREE' },
    { label: tr('nutrition_diet_dairy_free', 'Dairy-Free'), value: 'DAIRY_FREE' },
    { label: tr('nutrition_diet_low_fodmap', 'Low-FODMAP'), value: 'LOW_FODMAP' },
    { label: tr('nutrition_diet_keto', 'Keto'), value: 'KETO' },
    { label: tr('nutrition_diet_paleo', 'Paleo'), value: 'PALEO' },
    { label: tr('nutrition_diet_mediterranean', 'Mediterranean'), value: 'MEDITERRANEAN' },
    { label: tr('nutrition_diet_halal', 'Halal'), value: 'HALAL' },
    { label: tr('nutrition_diet_kosher', 'Kosher'), value: 'KOSHER' }
  ])

  const lifestyleOptions = computed(() => [
    { label: tr('nutrition_lifestyle_no_alcohol', 'No Alcohol'), value: 'NO_ALCOHOL' },
    { label: tr('nutrition_lifestyle_no_caffeine', 'No Caffeine'), value: 'NO_CAFFEINE' },
    {
      label: tr('nutrition_lifestyle_no_refined_sugar', 'No Refined Sugar'),
      value: 'NO_REFINED_SUGAR'
    },
    { label: tr('nutrition_lifestyle_no_seed_oils', 'No Seed Oils'), value: 'NO_SEED_OILS' },
    {
      label: tr('nutrition_lifestyle_no_processed_foods', 'No Processed Foods'),
      value: 'NO_PROCESSED_FOODS'
    },
    {
      label: tr('nutrition_lifestyle_no_sweeteners', 'No Artificial Sweeteners'),
      value: 'NO_SWEETENERS'
    },
    { label: tr('nutrition_lifestyle_no_soda', 'No Carbonated Drinks'), value: 'NO_SODA' },
    { label: tr('nutrition_lifestyle_no_pork', 'No Pork'), value: 'NO_PORK' },
    { label: tr('nutrition_lifestyle_no_red_meat', 'No Red Meat'), value: 'NO_RED_MEAT' }
  ])

  const allergyOptions = computed(() => [
    { label: tr('nutrition_allergy_peanuts', 'Peanuts'), value: 'PEANUTS' },
    {
      label: tr('nutrition_allergy_tree_nuts', 'Tree Nuts (Almonds, Walnuts, etc.)'),
      value: 'TREE_NUTS'
    },
    { label: tr('nutrition_allergy_milk', 'Milk / Dairy'), value: 'MILK' },
    { label: tr('nutrition_allergy_eggs', 'Eggs'), value: 'EGGS' },
    { label: tr('nutrition_allergy_wheat', 'Wheat'), value: 'WHEAT' },
    { label: tr('nutrition_allergy_soy', 'Soy'), value: 'SOY' },
    { label: tr('nutrition_allergy_fish', 'Fish'), value: 'FISH' },
    { label: tr('nutrition_allergy_shellfish', 'Shellfish'), value: 'SHELLFISH' },
    { label: tr('nutrition_allergy_sesame', 'Sesame'), value: 'SESAME' },
    { label: tr('nutrition_allergy_mustard', 'Mustard'), value: 'MUSTARD' },
    { label: tr('nutrition_allergy_celery', 'Celery'), value: 'CELERY' }
  ])

  const intoleranceOptions = computed(() => [
    { label: tr('nutrition_intolerance_lactose', 'Lactose'), value: 'LACTOSE' },
    { label: tr('nutrition_intolerance_fructose', 'Fructose'), value: 'FRUCTOSE' },
    { label: tr('nutrition_intolerance_histamine', 'Histamine'), value: 'HISTAMINE' },
    {
      label: tr('nutrition_intolerance_nightshades', 'Nightshades (Tomatoes, Peppers, etc.)'),
      value: 'NIGHTSHADES'
    },
    { label: tr('nutrition_intolerance_sulfites', 'Sulfites'), value: 'SULFITES' },
    { label: tr('nutrition_intolerance_yeast', 'Yeast'), value: 'YEAST' },
    { label: tr('nutrition_intolerance_legumes', 'Legumes / Beans'), value: 'LEGUMES' },
    {
      label: tr('nutrition_intolerance_sweeteners', 'Artificial Sweeteners'),
      value: 'SWEETENERS'
    }
  ])

  const supplementOptions = computed(() => [
    {
      label: tr('nutrition_supp_caffeine', 'Caffeine'),
      value: 'caffeine',
      description: tr(
        'nutrition_supp_caffeine_desc',
        'Pre-workout stimulant for focus and fatigue reduction'
      )
    },
    {
      label: tr('nutrition_supp_nitrates', 'Nitrates / Beetroot'),
      value: 'nitrates',
      description: tr('nutrition_supp_nitrates_desc', 'Improves blood flow and oxygen delivery')
    },
    {
      label: tr('nutrition_supp_beta_alanine', 'Beta-Alanine'),
      value: 'beta_alanine',
      description: tr(
        'nutrition_supp_beta_alanine_desc',
        'Buffers muscle acidity during high intensity'
      )
    },
    {
      label: tr('nutrition_supp_creatine', 'Creatine'),
      value: 'creatine',
      description: tr('nutrition_supp_creatine_desc', 'Increases power output and recovery')
    },
    {
      label: tr('nutrition_supp_bicarb', 'Sodium Bicarbonate'),
      value: 'sodium_bicarbonate',
      description: tr(
        'nutrition_supp_bicarb_desc',
        'Intracellular buffer for high-intensity efforts'
      )
    },
    {
      label: tr('nutrition_supp_glycerol', 'Glycerol'),
      value: 'glycerol',
      description: tr('nutrition_supp_glycerol_desc', 'Hyperhydration agent for hot conditions')
    },
    {
      label: tr('nutrition_supp_electrolytes', 'Electrolytes'),
      value: 'electrolytes',
      description: tr(
        'nutrition_supp_electrolytes_desc',
        'Crucial for fluid balance and nerve function'
      )
    },
    {
      label: tr('nutrition_supp_omega3', 'Omega-3'),
      value: 'omega_3',
      description: tr('nutrition_supp_omega3_desc', 'Supports heart and joint health')
    },
    {
      label: tr('nutrition_supp_vitamin_d', 'Vitamin D'),
      value: 'vitamin_d',
      description: tr(
        'nutrition_supp_vitamin_d_desc',
        'Essential for bone health and immune function'
      )
    },
    {
      label: tr('nutrition_supp_iron', 'Iron'),
      value: 'iron',
      description: tr('nutrition_supp_iron_desc', 'Oxygen transport (crucial for endurance)')
    },
    {
      label: tr('nutrition_supp_magnesium', 'Magnesium'),
      value: 'magnesium',
      description: tr('nutrition_supp_magnesium_desc', 'Nerve function and muscle relaxation')
    },
    {
      label: tr('nutrition_supp_tart_cherry', 'Tart Cherry'),
      value: 'tart_cherry',
      description: tr('nutrition_supp_tart_cherry_desc', 'Potent antioxidant for muscle recovery')
    },
    {
      label: tr('nutrition_supp_collagen', 'Collagen'),
      value: 'collagen',
      description: tr('nutrition_supp_collagen_desc', 'Supports tendon and ligament integrity')
    },
    {
      label: tr('nutrition_supp_probiotics', 'Probiotics'),
      value: 'probiotics',
      description: tr(
        'nutrition_supp_probiotics_desc',
        'Optimizes gut health and nutrient absorption'
      )
    },
    {
      label: tr('nutrition_supp_coq10', 'CoQ10'),
      value: 'coq10',
      description: tr('nutrition_supp_coq10_desc', 'Supports mitochondrial energy production')
    }
  ])

  const trainingPhases = computed(() => [
    { label: tr('nutrition_phase_base', 'Base Phase (Fat Adapted / Recovery)'), value: 'BASE' },
    { label: tr('nutrition_phase_build', 'Build Phase (High Performance)'), value: 'BUILD' },
    { label: tr('nutrition_phase_race', 'Taper / Race Week (High Carb Loading)'), value: 'RACE' },
    { label: tr('nutrition_phase_custom', 'Custom'), value: 'CUSTOM' }
  ])

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
    localSettings.value.mealPattern.push({
      name: tr('nutrition_meal_new', 'New Meal'),
      time: '08:00'
    })
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
      const response = await $fetch<{ settings?: Record<string, any> }>('/api/profile/nutrition', {
        method: 'POST',
        body: localSettings.value
      })

      if (response?.settings) {
        localSettings.value = {
          ...localSettings.value,
          ...response.settings
        }
      }

      toast.add({
        title: t.value('nutrition_toast_saved_title'),
        description: t.value('nutrition_toast_saved_desc'),
        color: 'success'
      })

      emit('update:settings', response?.settings || localSettings.value)
      emit('saved')
    } catch (err: any) {
      toast.add({
        title: t.value('nutrition_toast_save_failed_title'),
        description: err.data?.message || err.message,
        color: 'error'
      })
    } finally {
      loading.value = false
    }
  }
</script>
