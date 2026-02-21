<template>
  <div
    class="bg-white dark:bg-gray-900 rounded-none sm:rounded-xl shadow-none sm:shadow p-6 border-x-0 sm:border-x border-y border-gray-100 dark:border-gray-800"
  >
    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"
      />
      <p class="text-xs font-black uppercase tracking-widest text-gray-500">
        Executing Scientific Audit...
      </p>
    </div>

    <!-- Data Display -->
    <div v-else-if="data && data.advanced" class="space-y-10">
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <!-- 1. Aerobic Decoupling (Drift) & EF Decay -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 cursor-pointer hover:border-primary-500/50 transition-all active:scale-[0.98] group"
          :class="getDriftColor(data.advanced.decoupling)"
          @click="
            emit('open-metric', {
              key: 'Aerobic Decoupling',
              value: data.advanced.decoupling.toFixed(1),
              unit: '%'
            })
          "
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Aerobic Decoupling
            </h3>
            <div class="flex items-center gap-2">
              <UPopover mode="hover">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-4 h-4 text-gray-400 cursor-help"
                />
                <template #content>
                  <div
                    class="p-3 text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-xs"
                  >
                    Measures the drift between Power and Heart Rate. &lt; 5% is optimal aerobic
                    stability. &gt; 5% indicates acute fatigue.
                  </div>
                </template>
              </UPopover>
              <UIcon
                name="i-heroicons-magnifying-glass-circle"
                class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          <div v-if="data.advanced.decoupling !== null">
            <div class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              {{ data.advanced.decoupling.toFixed(1) }}%
            </div>
            <div class="text-[9px] font-black uppercase tracking-widest mt-2">
              <span
                v-if="data.advanced.decoupling < 5"
                class="text-emerald-600 dark:text-emerald-400"
                >High Integrity Finish</span
              >
              <span v-else class="text-amber-600 dark:text-amber-400"
                >Significant Metabolic Drift</span
              >
            </div>

            <!-- EF Decay Chart -->
            <div
              v-if="data.chartData && data.chartData.ef && data.chartData.ef.length > 0"
              class="mt-6 h-24 bg-white/50 dark:bg-black/20 rounded-lg p-2"
            >
              <Line
                :data="getEfChartData()"
                :options="getSparklineOptions('Efficiency Factor', 2)"
                :height="80"
              />
            </div>
          </div>
          <div
            v-else
            class="text-gray-400 text-[10px] uppercase font-black tracking-widest italic py-4"
          >
            Insufficient steady state telemetry.
          </div>
        </div>

        <!-- 2. W' Balance (Anaerobic Battery) -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 border-purple-500 cursor-pointer hover:border-purple-500/50 transition-all active:scale-[0.98] group"
          @click="
            emit('open-metric', {
              key: 'W\' Bal Depletion',
              value: Math.round(data.advanced.wPrime?.minWPrimeBalance / 1000) || 0,
              unit: 'kJ'
            })
          "
        >
          <div class="flex items-center justify-between mb-6">
            <div class="flex flex-col">
              <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Anaerobic Capacity (W')
              </h3>
              <div
                v-if="data.advanced.ftpUsed"
                class="text-[8px] text-purple-500/70 font-black uppercase tracking-widest mt-0.5"
              >
                Model Based on {{ data.advanced.ftpUsed }}W FTP
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UPopover mode="hover">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-4 h-4 text-gray-400 cursor-help"
                />
                <template #content>
                  <div
                    class="p-3 text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-xs"
                  >
                    Your "matchbook". Shows how much anaerobic energy you have left. Drains above
                    FTP, recharges below.
                  </div>
                </template>
              </UPopover>
              <UIcon
                name="i-heroicons-magnifying-glass-circle"
                class="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          <div v-if="data.advanced.wPrime">
            <div
              class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter tabular-nums"
            >
              {{ Math.round(data.advanced.wPrime.minWPrimeBalance / 1000) }}
              <span class="text-xs font-bold text-gray-400 uppercase">kJ</span>
            </div>
            <div class="text-[9px] font-black text-purple-500 uppercase tracking-widest mt-2">
              Peak Depletion Event
            </div>

            <!-- W' Balance Chart -->
            <div
              v-if="data.chartData && data.chartData.wPrime && data.chartData.wPrime.length > 0"
              class="mt-6 h-24 bg-white/50 dark:bg-black/20 rounded-lg p-2"
            >
              <Line
                :data="getWPrimeChartData()"
                :options="getSparklineOptions('W\' Balance (J)', 0)"
                :height="80"
              />
            </div>
          </div>
          <div
            v-else
            class="text-gray-400 text-[10px] uppercase font-black tracking-widest italic py-4"
          >
            Requires Power and FTP telemetry.
          </div>
        </div>

        <!-- 3. Quadrant Analysis (Pedaling Style) -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 border-orange-500 cursor-pointer hover:border-orange-500/50 transition-all active:scale-[0.98] group"
          @click="emit('open-metric', { key: 'Force / Velocity Profile', value: '' })"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Force / Velocity Profile
            </h3>
            <div class="flex items-center gap-2">
              <UPopover mode="hover">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-4 h-4 text-gray-400 cursor-help"
                />
                <template #content>
                  <div
                    class="p-3 text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-xs"
                  >
                    Distribution of pedaling style based on Power and Cadence.
                  </div>
                </template>
              </UPopover>
              <UIcon
                name="i-heroicons-magnifying-glass-circle"
                class="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          <div v-if="data.advanced.quadrants" class="space-y-4">
            <!-- Q1: Sprint -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span class="text-gray-500">Sprint (Hi Force / Hi Vel)</span>
                <span class="text-gray-900 dark:text-white"
                  >{{ data.advanced.quadrants.distribution.q1.toFixed(1) }}%</span
                >
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1">
                <div
                  class="bg-red-500 h-1 rounded-full transition-all duration-1000"
                  :style="{ width: `${data.advanced.quadrants.distribution.q1}%` }"
                />
              </div>
            </div>

            <!-- Q2: Grind -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span class="text-gray-500">Grind (Hi Force / Lo Vel)</span>
                <span class="text-gray-900 dark:text-white"
                  >{{ data.advanced.quadrants.distribution.q2.toFixed(1) }}%</span
                >
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1">
                <div
                  class="bg-orange-500 h-1 rounded-full transition-all duration-1000"
                  :style="{ width: `${data.advanced.quadrants.distribution.q2}%` }"
                />
              </div>
            </div>

            <!-- Q4: Spin -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span class="text-gray-500">Spin (Lo Force / Hi Vel)</span>
                <span class="text-gray-900 dark:text-white"
                  >{{ data.advanced.quadrants.distribution.q4.toFixed(1) }}%</span
                >
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1">
                <div
                  class="bg-yellow-400 h-1 rounded-full transition-all duration-1000"
                  :style="{ width: `${data.advanced.quadrants.distribution.q4}%` }"
                />
              </div>
            </div>
            <!-- Q3: Recovery -->
            <div
              class="text-[9px] font-black text-gray-400 uppercase tracking-widest text-right pt-2"
            >
              Recovery/Coast: {{ data.advanced.quadrants.distribution.q3.toFixed(1) }}%
            </div>
          </div>
          <div
            v-else
            class="text-gray-400 text-[10px] uppercase font-black tracking-widest italic py-4"
          >
            Requires Power and Velocity telemetry.
          </div>
        </div>

        <!-- 4. Coasting Analysis -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 border-blue-500 cursor-pointer hover:border-blue-500/50 transition-all active:scale-[0.98] group"
          @click="
            emit('open-metric', {
              key: 'Coasting Efficiency',
              value: data.advanced.coasting.percentTime.toFixed(1),
              unit: '%'
            })
          "
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Coasting Efficiency
            </h3>
            <div class="flex items-center gap-2">
              <UPopover mode="hover">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-4 h-4 text-gray-400 cursor-help"
                />
                <template #content>
                  <div
                    class="p-3 text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-xs"
                  >
                    Time spent moving but not pedaling. Higher percentages in group rides or
                    descents indicate better energy management.
                  </div>
                </template>
              </UPopover>
              <UIcon
                name="i-heroicons-magnifying-glass-circle"
                class="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          <div v-if="data.advanced.coasting">
            <div class="flex items-baseline gap-2">
              <span
                class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
              >
                {{ formatDuration(data.advanced.coasting.totalTime) }}
              </span>
              <span class="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                ({{ data.advanced.coasting.percentTime.toFixed(1) }}%)
              </span>
            </div>

            <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1 mt-4">
              <div
                class="bg-blue-600 h-1 rounded-full transition-all duration-1000"
                :style="{ width: `${Math.min(100, data.advanced.coasting.percentTime)}%` }"
              />
            </div>

            <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-4">
              {{ data.advanced.coasting.eventCount }} Micro-Rest Events detected
            </div>
          </div>
          <div
            v-else
            class="text-gray-400 text-[10px] uppercase font-black tracking-widest italic py-4"
          >
            No Power or Velocity streams detected.
          </div>
        </div>

        <!-- 5. Matches Burnt -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 border-red-500 cursor-pointer hover:border-red-500/50 transition-all active:scale-[0.98] group"
          @click="
            emit('open-metric', { key: 'Sustained Surges', value: data.advanced.surges.length })
          "
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Sustained Surges (>120% FTP)
            </h3>
            <div class="flex items-center gap-2">
              <UPopover mode="hover">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-4 h-4 text-gray-400 cursor-help"
                />
                <template #content>
                  <div
                    class="p-3 text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-xs"
                  >
                    "Burning a match": Sustained efforts far above threshold that cause
                    disproportionate physiological fatigue.
                  </div>
                </template>
              </UPopover>
              <UIcon
                name="i-heroicons-magnifying-glass-circle"
                class="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          <div v-if="data.advanced.surges">
            <div class="flex items-baseline gap-2">
              <div
                class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
              >
                {{ data.advanced.surges.length }}
              </div>
              <div class="text-[10px] font-black text-red-500 uppercase tracking-widest">
                Matches Burnt
              </div>
            </div>

            <div
              v-if="data.advanced.surges.length > 0"
              class="mt-4 text-[9px] font-black text-gray-400 uppercase tracking-widest"
            >
              Mean Duration:
              <span class="text-gray-900 dark:text-white tabular-nums"
                >{{
                  Math.round(
                    data.advanced.surges.reduce((a: any, b: any) => a + b.duration, 0) /
                      data.advanced.surges.length
                  )
                }}s</span
              >
            </div>
          </div>
          <div
            v-else
            class="text-gray-400 text-[10px] uppercase font-black tracking-widest italic py-4"
          >
            No surge events identified.
          </div>
        </div>

        <!-- 6. Fatigue Sensitivity (Late Fade) -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-5 border border-gray-100 dark:border-gray-800 border-l-4 cursor-pointer hover:border-primary-500/50 transition-all active:scale-[0.98] group"
          :class="getFadeColor(data.advanced.fatigueSensitivity?.decay)"
          @click="
            emit('open-metric', {
              key: 'Durability (Late Fade)',
              value: data.advanced.fatigueSensitivity.decay.toFixed(1),
              unit: '%'
            })
          "
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Durability (Late Fade)
            </h3>
            <div class="flex items-center gap-2">
              <UPopover mode="hover">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-4 h-4 text-gray-400 cursor-help"
                />
                <template #content>
                  <div
                    class="p-3 text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-xs"
                  >
                    Efficiency loss comparing the first 20% vs the last 20% of the session. Lower
                    values indicate better metabolic durability.
                  </div>
                </template>
              </UPopover>
              <UIcon
                name="i-heroicons-magnifying-glass-circle"
                class="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          <div v-if="data.advanced.fatigueSensitivity">
            <div
              class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
            >
              {{ data.advanced.fatigueSensitivity.decay.toFixed(1) }}%
            </div>
            <div class="text-[9px] font-black uppercase tracking-widest mt-2">
              <span
                v-if="data.advanced.fatigueSensitivity.decay < 5"
                class="text-emerald-600 dark:text-emerald-400"
                >Elite Durability Profile</span
              >
              <span
                v-else-if="data.advanced.fatigueSensitivity.decay < 10"
                class="text-amber-600 dark:text-amber-400"
                >Moderate Systemic Fatigue</span
              >
              <span v-else class="text-red-600 dark:text-red-400">Critical Efficiency Loss</span>
            </div>
          </div>
          <div
            v-else
            class="text-gray-400 text-[10px] uppercase font-black tracking-widest italic py-4"
          >
            Requires Power and HR telemetry over 1hr.
          </div>
        </div>
      </div>

      <div
        class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800"
      >
        <!-- 7. Stability Metrics -->
        <div
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-6 border border-gray-100 dark:border-gray-800 border-l-4 border-emerald-500"
        >
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Execution Discipline (Stability)
            </h3>
            <UPopover mode="hover">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-4 h-4 text-gray-400 cursor-help"
              />
              <template #content>
                <div
                  class="p-3 text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-xs"
                >
                  Coefficient of Variation in effort. Lower values indicate more stable and
                  disciplined target adherence.
                </div>
              </template>
            </UPopover>
          </div>

          <div v-if="data.advanced.powerStability || data.advanced.paceStability">
            <div class="flex items-baseline gap-10">
              <div v-if="data.advanced.powerStability">
                <div
                  class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
                >
                  {{ data.advanced.powerStability.overallCoV.toFixed(1) }}%
                </div>
                <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Power Variation
                </div>
              </div>
              <div v-if="data.advanced.paceStability">
                <div
                  class="text-3xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter"
                >
                  {{ data.advanced.paceStability.overallCoV.toFixed(1) }}%
                </div>
                <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                  Pace Variation
                </div>
              </div>
            </div>

            <div class="mt-6 flex gap-1.5 h-10">
              <div
                v-for="i in (
                  data.advanced.powerStability || data.advanced.paceStability
                ).intervalStability.slice(0, 10)"
                :key="i.index"
                class="flex-1 rounded-sm shadow-sm transition-all hover:scale-y-110 cursor-help"
                :class="i.cov < 5 ? 'bg-emerald-500' : i.cov < 10 ? 'bg-amber-500' : 'bg-red-500'"
                :title="`${i.label}: ${i.cov.toFixed(1)}% variation`"
              />
            </div>
            <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-3">
              Work Interval Stability Spectrum
            </div>
          </div>
          <div
            v-else
            class="text-gray-400 text-[10px] uppercase font-black tracking-widest italic py-4"
          >
            Insufficient interval structure data.
          </div>
        </div>

        <!-- 8. Recovery Rate Trend -->
        <div
          v-if="data.advanced.recoveryTrend && data.advanced.recoveryTrend.length > 0"
          class="bg-gray-50 dark:bg-gray-950 rounded-xl p-6 border border-gray-100 dark:border-gray-800 border-l-4 border-emerald-400"
        >
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-[10px] font-black uppercase tracking-widest text-gray-500">
              HR Recovery (60s Post-Interval)
            </h3>
            <UPopover mode="hover">
              <UIcon
                name="i-heroicons-information-circle"
                class="w-4 h-4 text-gray-400 cursor-help"
              />
              <template #content>
                <div
                  class="p-3 text-[10px] uppercase font-bold tracking-widest leading-relaxed max-w-xs"
                >
                  Measures autonomic nervous system reactivity. Consistent or improving drops
                  indicate high systemic fitness.
                </div>
              </template>
            </UPopover>
          </div>

          <div
            class="h-40 bg-white/50 dark:bg-black/20 rounded-xl p-3 border border-gray-100 dark:border-gray-800 shadow-inner"
          >
            <Line
              :data="getRecoveryTrendChartData()"
              :options="getRecoveryChartOptions()"
              :height="140"
            />
          </div>
        </div>
      </div>

      <!-- Detailed Match Analysis Table -->
      <div v-if="data.advanced.surges && data.advanced.surges.length > 0" class="space-y-4">
        <div
          class="flex justify-between items-center group cursor-pointer"
          @click="showMatches = !showMatches"
        >
          <div class="flex items-center gap-2">
            <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              Anaerobic Impact Ledger
            </h3>
            <UIcon
              :name="showMatches ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors"
            />
          </div>
        </div>

        <div
          v-if="showMatches"
          class="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800"
        >
          <table class="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
            <thead class="bg-gray-50 dark:bg-gray-950">
              <tr>
                <th
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Start
                </th>
                <th
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Duration
                </th>
                <th
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Mean Power
                </th>
                <th
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Max Power
                </th>
                <th
                  class="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest"
                >
                  Metabolic Cost
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="(surge, idx) in data.advanced.surges"
                :key="idx"
                class="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors"
              >
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs font-medium text-gray-500 tabular-nums"
                >
                  {{ formatTime(surge.start_time) }}
                </td>
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs font-black text-gray-900 dark:text-white tabular-nums"
                >
                  {{ surge.duration
                  }}<span class="text-[9px] ml-0.5 opacity-50 font-bold uppercase">s</span>
                </td>
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs text-amber-600 font-black tabular-nums"
                >
                  {{ surge.avg_power
                  }}<span class="text-[9px] ml-0.5 opacity-50 font-bold uppercase">W</span>
                </td>
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs text-gray-900 dark:text-white font-black tabular-nums"
                >
                  {{ surge.max_power
                  }}<span class="text-[9px] ml-0.5 opacity-50 font-bold uppercase">W</span>
                </td>
                <td
                  class="px-5 py-4 whitespace-nowrap text-xs text-gray-500 font-medium tabular-nums"
                >
                  {{ surge.cost_avg_power
                  }}<span class="text-[9px] ml-0.5 opacity-50 font-bold uppercase">W</span> avg
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { Line } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } from 'chart.js'

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )

  const props = defineProps<{
    workoutId: string
    publicToken?: string
  }>()

  const emit = defineEmits(['open-metric'])

  const loading = ref(true)
  const data = ref<any>(null)
  const showMatches = ref(false)

  async function fetchData() {
    loading.value = true
    try {
      const endpoint = props.publicToken
        ? `/api/share/workouts/${props.publicToken}/intervals`
        : `/api/workouts/${props.workoutId}/intervals`

      data.value = await $fetch(endpoint)
    } catch (e) {
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  function getDriftColor(val: number | null) {
    if (val === null) return 'border-gray-200 dark:border-gray-700'
    if (val < 5) return 'border-green-500' // Good
    if (val < 10) return 'border-yellow-500' // Moderate
    return 'border-red-500' // High
  }

  function getFadeColor(val: number | null | undefined) {
    if (val === undefined || val === null) return 'border-gray-200 dark:border-gray-700'
    if (val < 5) return 'border-green-500' // Excellent
    if (val < 10) return 'border-amber-500' // Warning
    return 'border-red-500' // Heavy Fade
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}m ${secs}s`
  }

  function formatTime(seconds: number) {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.round(seconds % 60)

    if (hours > 0)
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Chart Helpers
  function getSparklineOptions(label: string, precision: number = 0) {
    const isDark = document.documentElement.classList.contains('dark')

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (ctx: any) => `${label}: ${ctx.parsed.y.toFixed(precision)}`
          }
        }
      },
      scales: {
        x: { display: false },
        y: {
          display: false,
          beginAtZero: false
        }
      },
      elements: {
        point: { radius: 0, hoverRadius: 4 },
        line: { borderWidth: 2 }
      },
      layout: { padding: 0 }
    }
  }

  function getWPrimeChartData() {
    if (!data.value?.chartData?.wPrime) return { labels: [], datasets: [] }

    const values = data.value.chartData.wPrime
    // Ensure we have labels matching the data length (approx)
    // We can just use indices for sparklines as X axis is hidden
    const labels = values.map((_: any, i: number) => i)

    return {
      labels,
      datasets: [
        {
          label: "W' Balance",
          data: values,
          borderColor: 'rgb(168, 85, 247)', // Purple
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: true,
          tension: 0.1
        }
      ]
    }
  }

  function getEfChartData() {
    if (!data.value?.chartData?.ef) return { labels: [], datasets: [] }

    const values = data.value.chartData.ef
    const labels = values.map((_: any, i: number) => i)

    return {
      labels,
      datasets: [
        {
          label: 'Efficiency Factor',
          data: values,
          borderColor: 'rgb(34, 197, 94)', // Green
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    }
  }

  function getRecoveryTrendChartData() {
    if (!data.value?.advanced?.recoveryTrend) return { labels: [], datasets: [] }

    const trends = data.value.advanced.recoveryTrend
    const labels = trends.map((t: any) => `Interval ${t.intervalIndex + 1}`)
    const drops = trends.map((t: any) => t.drop60s)

    return {
      labels,
      datasets: [
        {
          label: 'HR Drop (60s)',
          data: drops,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    }
  }

  function getRecoveryChartOptions() {
    const isDark = document.documentElement.classList.contains('dark')

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `Recovery: -${ctx.parsed.y} bpm`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: isDark ? '#9CA3AF' : '#4B5563' },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: isDark ? '#9CA3AF' : '#4B5563' },
          grid: { color: isDark ? 'rgba(75, 85, 99, 0.2)' : 'rgba(209, 213, 219, 0.4)' },
          title: {
            display: true,
            text: 'BPM Drop',
            color: isDark ? '#9CA3AF' : '#4B5563'
          }
        }
      }
    }
  }

  onMounted(() => {
    fetchData()
  })
</script>
