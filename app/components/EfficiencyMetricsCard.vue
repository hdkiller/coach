<template>
  <div
    class="efficiency-metrics-card bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
  >
    <h3
      class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 flex items-center gap-2"
    >
      <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4 text-blue-500" />
      Physiological Efficiency Audit
    </h3>

    <div v-if="hasMetrics" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Variability Index -->
      <div
        v-if="metrics.variabilityIndex !== null && metrics.variabilityIndex !== undefined"
        class="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl p-5 group transition-all hover:border-primary-500/30 cursor-pointer active:scale-[0.98]"
        @click="
          emit('open-metric', {
            key: 'Variability Index',
            value: metrics.variabilityIndex.toFixed(3),
            rating: getVIRating(metrics.variabilityIndex),
            ratingColor: getVIColor(metrics.variabilityIndex)
          })
        "
      >
        <div class="flex items-center justify-between mb-4">
          <UTooltip
            :popper="{ placement: 'top' }"
            :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
            arrow
          >
            <span
              class="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-dashed border-gray-300 dark:border-gray-700 cursor-help"
              >Variability Index</span
            >
            <template #content>
              <div class="text-left text-sm">{{ metricTooltips['Variability Index'] }}</div>
            </template>
          </UTooltip>
          <div class="flex items-center gap-2">
            <UBadge
              :color="getVIColor(metrics.variabilityIndex)"
              variant="soft"
              size="xs"
              class="font-black uppercase tracking-widest text-[9px]"
            >
              {{ getVIRating(metrics.variabilityIndex) }}
            </UBadge>
            <UIcon
              name="i-heroicons-magnifying-glass-circle"
              class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
        <div
          class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
        >
          {{ metrics.variabilityIndex.toFixed(3) }}
        </div>
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
          Steady state variance factor
        </p>
      </div>

      <!-- Efficiency Factor -->
      <div
        v-if="metrics.efficiencyFactor !== null && metrics.efficiencyFactor !== undefined"
        class="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl p-5 group transition-all hover:border-primary-500/30 cursor-pointer active:scale-[0.98]"
        @click="
          emit('open-metric', {
            key: 'Efficiency Factor',
            value: metrics.efficiencyFactor.toFixed(2),
            rating: getEFRating(metrics.efficiencyFactor),
            ratingColor: getEFColor(metrics.efficiencyFactor)
          })
        "
      >
        <div class="flex items-center justify-between mb-4">
          <UTooltip
            :popper="{ placement: 'top' }"
            :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
            arrow
          >
            <span
              class="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-dashed border-gray-300 dark:border-gray-700 cursor-help"
              >Efficiency Factor</span
            >
            <template #content>
              <div class="text-left text-sm">{{ metricTooltips['Efficiency Factor'] }}</div>
            </template>
          </UTooltip>
          <div class="flex items-center gap-2">
            <UBadge
              :color="getEFColor(metrics.efficiencyFactor)"
              variant="soft"
              size="xs"
              class="font-black uppercase tracking-widest text-[9px]"
            >
              {{ getEFRating(metrics.efficiencyFactor) }}
            </UBadge>
            <UIcon
              name="i-heroicons-magnifying-glass-circle"
              class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
        <div
          class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
        >
          {{ metrics.efficiencyFactor.toFixed(2) }}
        </div>
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
          Power relative to heart rate
        </p>
      </div>

      <!-- Decoupling -->
      <div
        v-if="metrics.decoupling !== null && metrics.decoupling !== undefined"
        class="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl p-5 group transition-all hover:border-primary-500/30 cursor-pointer active:scale-[0.98]"
        @click="
          emit('open-metric', {
            key: 'Aerobic Decoupling',
            value: metrics.decoupling.toFixed(1),
            unit: '%',
            rating: getDecouplingRating(metrics.decoupling),
            ratingColor: getDecouplingColor(metrics.decoupling)
          })
        "
      >
        <div class="flex items-center justify-between mb-4">
          <UTooltip
            :popper="{ placement: 'top' }"
            :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
            arrow
          >
            <span
              class="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-dashed border-gray-300 dark:border-gray-700 cursor-help"
              >Aerobic Decoupling</span
            >
            <template #content>
              <div class="text-left text-sm">{{ metricTooltips['Aerobic Decoupling'] }}</div>
            </template>
          </UTooltip>
          <div class="flex items-center gap-2">
            <UBadge
              :color="getDecouplingColor(metrics.decoupling)"
              variant="soft"
              size="xs"
              class="font-black uppercase tracking-widest text-[9px]"
            >
              {{ getDecouplingRating(metrics.decoupling) }}
            </UBadge>
            <UIcon
              name="i-heroicons-magnifying-glass-circle"
              class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
        <div
          class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
        >
          {{ metrics.decoupling.toFixed(1)
          }}<span class="text-xs font-bold text-gray-400 uppercase">%</span>
        </div>
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
          Cardiac drift percentage
        </p>
      </div>

      <!-- Power/HR Ratio -->
      <div
        v-if="metrics.powerHrRatio !== null && metrics.powerHrRatio !== undefined"
        class="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl p-5 group transition-all hover:border-primary-500/30 cursor-pointer active:scale-[0.98]"
        @click="
          emit('open-metric', { key: 'Power/HR Ratio', value: metrics.powerHrRatio.toFixed(2) })
        "
      >
        <div class="flex items-center justify-between mb-4">
          <UTooltip
            :popper="{ placement: 'top' }"
            :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
            arrow
          >
            <span
              class="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-dashed border-gray-300 dark:border-gray-700 cursor-help"
              >Power/HR Ratio</span
            >
            <template #content>
              <div class="text-left text-sm">{{ metricTooltips['Power/HR Ratio'] }}</div>
            </template>
          </UTooltip>
          <UIcon
            name="i-heroicons-magnifying-glass-circle"
            class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <div
          class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
        >
          {{ metrics.powerHrRatio.toFixed(2) }}
        </div>
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
          Watts generated per bpm
        </p>
      </div>

      <!-- Polarization Index -->
      <div
        v-if="metrics.polarizationIndex !== null && metrics.polarizationIndex !== undefined"
        class="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl p-5 group transition-all hover:border-primary-500/30 cursor-pointer active:scale-[0.98]"
        @click="
          emit('open-metric', {
            key: 'Polarization Index',
            value: metrics.polarizationIndex.toFixed(2)
          })
        "
      >
        <div class="flex items-center justify-between mb-4">
          <UTooltip
            :popper="{ placement: 'top' }"
            :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
            arrow
          >
            <span
              class="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-dashed border-gray-300 dark:border-gray-700 cursor-help"
              >Polarization Index</span
            >
            <template #content>
              <div class="text-left text-sm">{{ metricTooltips['Polarization Index'] }}</div>
            </template>
          </UTooltip>
          <UIcon
            name="i-heroicons-magnifying-glass-circle"
            class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <div
          class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
        >
          {{ metrics.polarizationIndex.toFixed(2) }}
        </div>
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
          Distribution profile density
        </p>
      </div>

      <!-- L/R Balance -->
      <div
        v-if="metrics.lrBalance !== null && metrics.lrBalance !== undefined"
        class="bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-xl p-5 group transition-all hover:border-primary-500/30 cursor-pointer active:scale-[0.98]"
        @click="
          emit('open-metric', {
            key: 'L/R Balance',
            value: metrics.lrBalance.toFixed(1),
            unit: '%',
            rating: getLRBalanceRating(metrics.lrBalance),
            ratingColor: getLRBalanceColor(metrics.lrBalance)
          })
        "
      >
        <div class="flex items-center justify-between mb-4">
          <UTooltip
            :popper="{ placement: 'top' }"
            :ui="{ content: 'w-[300px] h-auto whitespace-normal' }"
            arrow
          >
            <span
              class="text-[9px] font-black uppercase tracking-widest text-gray-500 border-b border-dashed border-gray-300 dark:border-gray-700 cursor-help"
              >L/R Balance</span
            >
            <template #content>
              <div class="text-left text-sm">{{ metricTooltips['L/R Balance'] }}</div>
            </template>
          </UTooltip>
          <div class="flex items-center gap-2">
            <UBadge
              :color="getLRBalanceColor(metrics.lrBalance)"
              variant="soft"
              size="xs"
              class="font-black uppercase tracking-widest text-[9px]"
            >
              {{ getLRBalanceRating(metrics.lrBalance) }}
            </UBadge>
            <UIcon
              name="i-heroicons-magnifying-glass-circle"
              class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
        <div
          class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
        >
          {{ metrics.lrBalance.toFixed(1)
          }}<span class="text-xs font-bold text-gray-400 uppercase">%</span>
        </div>
        <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
          Biomechanical symmetry audit
        </p>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <div
        class="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <UIcon name="i-heroicons-cpu-chip" class="w-8 h-8 text-gray-400 opacity-40" />
      </div>
      <p class="text-sm font-black uppercase tracking-widest text-gray-500">
        Efficiency Telemetry Pending
      </p>
      <p class="text-xs text-gray-400 mt-2 max-w-xs mx-auto uppercase font-bold tracking-widest">
        Insufficient synchronized data found to audit physiological metrics.
      </p>
    </div>

    <!-- Info Section -->
    <div
      v-if="hasMetrics"
      class="mt-8 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30"
    >
      <h4
        class="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900 dark:text-blue-300 mb-4"
      >
        Audit Logic & Methodology
      </h4>
      <ul class="text-xs font-medium text-blue-800 dark:text-blue-200 space-y-3">
        <li class="flex gap-2">
          <span class="font-black opacity-40">01</span>
          <span
            ><strong>VI (Variability Index):</strong> Ideal value is 1.0 (steady). Values > 1.05
            indicate variable pacing and increased metabolic cost.</span
          >
        </li>
        <li class="flex gap-2">
          <span class="font-black opacity-40">02</span>
          <span
            ><strong>EF (Efficiency Factor):</strong> Tracks long-term aerobic fitness gains by
            normalizing power output against heart rate cost.</span
          >
        </li>
        <li class="flex gap-2">
          <span class="font-black opacity-40">03</span>
          <span
            ><strong>Decoupling:</strong> Excellent aerobic stability is &lt; 5%. Values &gt; 10%
            signal acute fatigue or systemic metabolic drift.</span
          >
        </li>
        <li class="flex gap-2">
          <span class="font-black opacity-40">04</span>
          <span
            ><strong>L/R Balance:</strong> Optimal biomechanical symmetry is 48-52%. Consistent
            imbalance may require professional fitting.</span
          >
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    metrics: {
      variabilityIndex?: number | null
      efficiencyFactor?: number | null
      decoupling?: number | null
      powerHrRatio?: number | null
      polarizationIndex?: number | null
      lrBalance?: number | null
    }
  }>()

  const emit = defineEmits(['open-metric'])

  const hasMetrics = computed(() => {
    return (
      props.metrics.variabilityIndex !== null ||
      props.metrics.efficiencyFactor !== null ||
      props.metrics.decoupling !== null ||
      props.metrics.powerHrRatio !== null ||
      props.metrics.polarizationIndex !== null ||
      props.metrics.lrBalance !== null
    )
  })

  // Variability Index ratings
  function getVIColor(vi: number | null | undefined): 'success' | 'warning' | 'error' | 'neutral' {
    if (vi == null) return 'neutral'
    if (vi <= 1.05) return 'success'
    if (vi <= 1.1) return 'warning'
    return 'error'
  }

  function getVIRating(vi: number | null | undefined): string {
    if (vi == null) return 'N/A'
    if (vi <= 1.05) return 'Excellent'
    if (vi <= 1.1) return 'Good'
    return 'Variable'
  }

  // Efficiency Factor ratings (rough guidelines)
  function getEFColor(ef: number | null | undefined): 'success' | 'warning' | 'error' | 'neutral' {
    if (ef == null) return 'neutral'
    if (ef >= 2.0) return 'success'
    if (ef >= 1.5) return 'warning'
    return 'error'
  }

  function getEFRating(ef: number | null | undefined): string {
    if (ef == null) return 'N/A'
    if (ef >= 2.0) return 'Excellent'
    if (ef >= 1.5) return 'Good'
    return 'Fair'
  }

  // Decoupling ratings
  function getDecouplingColor(
    dec: number | null | undefined
  ): 'success' | 'warning' | 'error' | 'neutral' {
    if (dec == null) return 'neutral'
    if (dec <= 5) return 'success'
    if (dec <= 10) return 'warning'
    return 'error'
  }

  function getDecouplingRating(dec: number | null | undefined): string {
    if (dec == null) return 'N/A'
    if (dec <= 5) return 'Excellent'
    if (dec <= 10) return 'Good'
    return 'High'
  }

  // L/R Balance ratings
  function getLRBalanceColor(
    balance: number | null | undefined
  ): 'success' | 'warning' | 'error' | 'neutral' {
    if (balance == null) return 'neutral'
    const deviation = Math.abs(balance - 50)
    if (deviation <= 2) return 'success'
    if (deviation <= 4) return 'warning'
    return 'error'
  }

  function getLRBalanceRating(balance: number | null | undefined): string {
    if (balance == null) return 'N/A'
    const deviation = Math.abs(balance - 50)
    if (deviation <= 2) return 'Balanced'
    if (deviation <= 4) return 'Fair'
    return 'Imbalanced'
  }
</script>

<style scoped>
  .efficiency-metrics-card {
    width: 100%;
  }
</style>
