<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon :name="macroInfo.icon" class="w-6 h-6" :class="macroInfo.iconColor" />
            <h3 class="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">
              {{ label }} Analysis
            </h3>
          </div>
          <div class="text-2xl font-black" :class="macroInfo.iconColor">
            {{ Math.round(actual) }}{{ unit }}
          </div>
        </div>

        <!-- Target Summary -->
        <div
          class="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800"
        >
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest"
              >Total Daily Target</span
            >
            <span class="text-sm font-black text-gray-900 dark:text-white"
              >{{ Math.round(target) }}{{ unit }}</span
            >
          </div>
          <div class="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
            <div
              class="h-full bg-primary-500 rounded-full"
              :style="{ width: `${Math.min((actual / target) * 100, 100)}%` }"
            />
          </div>
        </div>

        <!-- Logic Breakdown -->
        <div class="space-y-4">
          <h4
            class="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-1"
          >
            <UIcon name="i-heroicons-cpu-chip" class="w-3.5 h-3.5" />
            Calculation logic
          </h4>

          <div
            v-for="item in breakdown"
            :key="item.label"
            class="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
          >
            <div class="space-y-0.5">
              <div class="text-sm font-bold text-gray-700 dark:text-gray-200">{{ item.label }}</div>
              <div class="text-[10px] text-gray-400 font-medium leading-tight max-w-[220px]">
                {{ item.description }}
              </div>
            </div>
            <div class="text-sm font-black text-gray-900 dark:text-white whitespace-nowrap">
              {{ item.value }}
            </div>
          </div>
        </div>

        <!-- Coach Tip -->
        <div
          class="bg-primary-50 dark:bg-primary-950/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900"
        >
          <p
            class="text-sm font-bold text-primary-700 dark:text-primary-300 flex items-center gap-2"
          >
            <UIcon name="i-heroicons-light-bulb" class="w-4 h-4" />
            Coach Insight
          </p>
          <p class="text-xs text-primary-600 dark:text-primary-400 mt-1 leading-relaxed italic">
            {{ coachTip }}
          </p>
        </div>

        <UButton
          color="neutral"
          variant="soft"
          block
          class="font-bold uppercase tracking-tight text-xs"
          @click="isOpen = false"
        >
          Close
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  const props = defineProps<{
    modelValue: boolean
    label: string
    actual: number
    target: number
    unit: string
    fuelState: number
    settings: any
    weight: number
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
  }>()

  const isOpen = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const macroInfo = computed(() => {
    switch (props.label) {
      case 'Carbs':
        return { icon: 'i-tabler-bread', iconColor: 'text-yellow-500' }
      case 'Protein':
        return { icon: 'i-tabler-egg', iconColor: 'text-blue-500' }
      case 'Fat':
        return { icon: 'i-tabler-droplet', iconColor: 'text-green-500' }
      default:
        return { icon: 'i-tabler-flame', iconColor: 'text-orange-500' }
    }
  })

  const breakdown = computed(() => {
    const items = []
    const s = props.settings || {}
    const w = props.weight || 75

    if (props.label === 'Carbs') {
      const base =
        props.fuelState === 3
          ? (s.fuelState3Min + s.fuelState3Max) / 2
          : props.fuelState === 2
            ? (s.fuelState2Min + s.fuelState2Max) / 2
            : (s.fuelState1Min + s.fuelState1Max) / 2

      items.push({
        label: 'Metabolic Baseline',
        description: `Based on your Fuel State ${props.fuelState} activity intensity.`,
        value: `${base.toFixed(1)} g/kg`
      })
      items.push({
        label: 'Sensitivity Factor',
        description: 'Global multiplier applied to your carb ranges.',
        value: `x${s.fuelingSensitivity || 1.0}`
      })
      if (s.targetAdjustmentPercent !== 0) {
        items.push({
          label: 'Goal Adjustment',
          description: `Scaled for your current profile goal (${s.goalProfile}).`,
          value: `${s.targetAdjustmentPercent > 0 ? '+' : ''}${s.targetAdjustmentPercent}%`
        })
      }
    } else if (props.label === 'Protein') {
      items.push({
        label: 'Muscle Maintenance',
        description: 'Standard recommendation for endurance athletes to support repair.',
        value: `${s.baseProteinPerKg || 1.6} g/kg`
      })
      items.push({
        label: 'Athlete Weight',
        description: 'Your current weight used for scale-based calculation.',
        value: `${w} kg`
      })
    } else if (props.label === 'Fat') {
      items.push({
        label: 'Hormonal Baseline',
        description: 'Essential fats for hormonal health and vitamin absorption.',
        value: `${s.baseFatPerKg || 1.0} g/kg`
      })
    } else if (props.label === 'Calories') {
      items.push({
        label: 'BMR + Activity',
        description:
          'Combined energy requirement including your resting metabolic rate and planned training volume.',
        value: `${Math.round(props.target)} kcal`
      })
      if (s.targetAdjustmentPercent !== 0) {
        items.push({
          label: 'Daily Deficit/Surplus',
          description: `Adjustment applied to support your ${s.goalProfile} target.`,
          value: `${s.targetAdjustmentPercent > 0 ? '+' : ''}${Math.round(props.target * (s.targetAdjustmentPercent / 100))} kcal`
        })
      }
    }

    return items
  })

  const coachTip = computed(() => {
    if (props.label === 'Carbs') {
      return props.fuelState === 3
        ? "Today is a high-output day. Your carb target is aggressive to ensure you don't 'bonk' and recover fast."
        : 'Lower intensity today means we prioritize fat oxidation while keeping enough carbs for metabolic health.'
    }
    if (props.label === 'Protein') {
      return 'Consistency is key. Aim to spread this protein across 4-5 servings to maximize muscle protein synthesis.'
    }
    if (props.label === 'Fat') {
      return 'Focus on quality: avocados, nuts, and olive oil. Avoid heavy fats right before your interval sessions.'
    }
    return 'These targets are dynamic. They adjust automatically whenever your training plan or intensity changes.'
  })
</script>
