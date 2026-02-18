<template>
  <UCard
    :ui="{
      root: 'rounded-none sm:rounded-lg shadow-none sm:shadow',
      body: 'p-4 sm:p-6'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Relative Effort (8w)
        </h3>
        <div class="flex items-center gap-2">
          <div class="w-32">
            <USelect
              v-model="bandPreset"
              :items="bandOptions"
              size="xs"
              color="neutral"
              variant="outline"
            />
          </div>
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="$emit('settings')"
          />
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div class="sm:max-w-[65%]">
          <p class="text-xl sm:text-2xl font-black" :class="statusClass">
            {{ statusTitle }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {{ statusMessage }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:w-[270px] shrink-0">
          <div
            class="rounded border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/70 dark:bg-gray-800/40 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            role="button"
            tabindex="0"
            @click="$emit('explain', 'week')"
          >
            <p class="text-[10px] uppercase tracking-wider text-gray-500">This Week</p>
            <p class="text-lg font-black text-gray-900 dark:text-white">
              {{ currentScore }}
            </p>
          </div>
          <div
            class="rounded border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50/70 dark:bg-gray-800/40 cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            role="button"
            tabindex="0"
            @click="$emit('explain', 'range')"
          >
            <p class="text-[10px] uppercase tracking-wider text-gray-500">Expected</p>
            <p class="text-lg font-black text-gray-900 dark:text-white">
              {{ rangeLabel }}
            </p>
            <p class="text-[10px] text-gray-500 mt-0.5">{{ bandLabel }}</p>
          </div>
        </div>
      </div>

      <div class="h-[220px]">
        <ClientOnly>
          <Line
            :key="`relative-effort-${settings?.yScale}`"
            :data="chartData"
            :options="chartOptions"
            :plugins="plugins"
            :height="220"
          />
        </ClientOnly>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
  import { Line } from 'vue-chartjs'

  const props = defineProps<{
    chartData: any
    chartOptions: any
    settings: any
    plugins: any[]
    statusClass: string
    statusTitle: string
    statusMessage: string
    currentScore: number
    rangeLabel: string
    bandLabel: string
    bandOptions: any[]
  }>()

  const bandPreset = defineModel<string>('bandPreset')

  defineEmits(['settings', 'explain'])
</script>
