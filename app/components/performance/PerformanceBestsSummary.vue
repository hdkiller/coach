<template>
  <div
    v-if="summaryItems.length > 0"
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start"
  >
    <UCard
      v-for="cat in summaryItems"
      :key="cat.id"
      class="floating-card-base grain-overlay rounded-[24px] cursor-pointer group relative min-h-[132px] !bg-white dark:!bg-[#111111] !border-gray-200 dark:!border-white/5"
      :ui="{
        root: 'overflow-visible',
        body: 'p-4 flex flex-col gap-2'
      }"
      @click="navigateTo('/performance/bests')"
    >
      <div
        class="absolute top-4 right-4 flex flex-col items-end gap-1 opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
      >
        <span class="text-[10px] font-black text-primary-500 uppercase tracking-widest text-right"
          >Hall of Fame</span
        >
        <div
          class="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20"
        >
          <UIcon
            name="i-heroicons-arrow-right"
            class="w-3.5 h-3.5"
          />
        </div>
      </div>

      <div v-if="cat.pb" class="space-y-1">
        <div class="flex items-center gap-2">
          <div
            class="text-[10px] font-black text-gray-500 dark:text-gray-600 uppercase tracking-[0.28em]"
          >
            {{ formatType(cat.pb.type) }}
          </div>
          <div
            v-if="isRecent(cat.pb.date)"
            class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.8)]"
          />
        </div>
        <div class="flex items-baseline gap-2 min-w-0 pr-14">
          <span
            class="text-4xl font-black text-gray-900 dark:text-white tabular-nums italic tracking-tighter leading-none"
          >
            {{ formatValue(cat.pb) }}
          </span>
          <span
            v-if="cat.pb.unit !== 's'"
            class="text-sm font-black text-gray-500 dark:text-gray-600 uppercase italic"
            >{{ cat.pb.unit }}</span
          >
          <span
            v-else
            class="text-[10px] font-black text-gray-500 dark:text-gray-600 uppercase tracking-widest italic"
            >pace</span
          >
        </div>
      </div>
    </UCard>

    <!-- Link Card to Full Trophy Case -->
    <UCard
      class="floating-card-base grain-overlay rounded-[24px] border-dashed group hover:border-primary-500/50 transition-all duration-500 cursor-pointer text-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] min-h-[132px] !bg-white dark:!bg-[#111111] !border-gray-200 dark:!border-white/10"
      :ui="{ root: 'overflow-visible', body: 'p-4 h-full flex items-center gap-3' }"
      @click="navigateTo('/performance/bests')"
    >
      <div
        class="w-10 h-10 rounded-[14px] bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-primary-500/30 transition-all duration-500"
      >
        <UIcon
          name="i-heroicons-trophy"
          class="w-5 h-5 text-gray-500 dark:text-gray-600 group-hover:text-primary-500 transition-colors"
        />
      </div>
      <div class="min-w-0 text-left">
        <div class="text-[10px] font-black text-gray-500 dark:text-gray-600 uppercase tracking-[0.28em]">
          Explore
        </div>
        <span
          class="block text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.2em]"
          >Full Trophy Case</span
        >
      </div>
      <UIcon
        name="i-heroicons-arrow-right"
        class="w-4 h-4 text-primary-500 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform duration-300"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    personalBests: any[]
  }>()

  const categories = [
    {
      id: 'RUN',
      label: 'Running'
    },
    {
      id: 'CYCLE',
      label: 'Cycling'
    },
    {
      id: 'SWIM',
      label: 'Swimming'
    }
  ]

  const summaryItems = computed(() => {
    if (!props.personalBests?.length) return []

    return categories
      .map((cat) => {
        const pbs = props.personalBests.filter((pb) => pb.category === cat.id)
        if (!pbs.length) return null

        let bestPb = null
        if (cat.id === 'RUN') {
          bestPb =
            pbs.find((p) => p.type === 'RUN_5K') || pbs.find((p) => p.type === 'RUN_1K') || pbs[0]
        } else if (cat.id === 'CYCLE') {
          bestPb =
            pbs.find((p) => p.type === 'POWER_20M') ||
            pbs.find((p) => p.type === 'POWER_60M') ||
            pbs[0]
        } else {
          bestPb = pbs[0]
        }

        return {
          ...cat,
          pb: bestPb
        }
      })
      .filter(Boolean) as any[]
  })

  function isRecent(date: string | Date) {
    const d = new Date(date)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return d > thirtyDaysAgo
  }

  function formatValue(pb: any) {
    if (pb.unit === 's') {
      const mins = Math.floor(pb.value / 60)
      const secs = Math.floor(pb.value % 60)
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${Math.round(pb.value)}`
  }

  function formatType(type: string) {
    return type
      .replace(/_/g, ' ')
      .replace('RUN ', '')
      .replace('POWER ', 'Peak ')
      .replace('ELEVATION GAIN', 'Max Climb')
  }
</script>
