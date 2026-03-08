<template>
  <div
    :id="'workout-' + workout.id"
    class="group cursor-pointer bg-white dark:bg-[#09090B] border-b border-gray-100 dark:border-gray-800 transition-all duration-500 overflow-hidden w-full max-w-full relative min-h-[340px] flex flex-col"
    @click="$emit('click')"
  >
    <!-- GHOST BACKGROUND ROUTE -->
    <UiWorkoutRoutePreview
      v-if="workout.summaryPolyline"
      :polyline="workout.summaryPolyline"
      mode="background"
      class="z-0"
    />

    <!-- HEADER SCRIM FOR TITLE POP -->
    <div
      class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/5 via-black/2 to-transparent dark:from-black/40 dark:via-black/10 dark:to-transparent z-[1] pointer-events-none"
    />

    <!-- HOVER GLOW BORDER -->
    <div
      class="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500 ring-1 ring-inset ring-primary-500/20 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)] z-[5]"
    />

    <!-- CONTENT LAYER -->
    <div class="px-5 sm:px-10 py-8 w-full flex-1 flex flex-col relative z-10">
      <!-- HEADER: METRIC-FIRST BAR -->
      <div
        class="flex flex-wrap items-center gap-x-8 gap-y-5 mb-auto pb-8 border-b border-gray-100/50 dark:border-gray-800/20"
      >
        <!-- Activity Title & Sport Icon -->
        <div class="flex-1 min-w-0 basis-full lg:basis-0">
          <div class="flex items-center gap-5 min-w-0">
            <div
              class="w-14 h-14 rounded-2xl flex items-center justify-center bg-gray-950 dark:bg-black border border-white/10 shrink-0 shadow-2xl group-hover:border-primary-500/30 transition-colors duration-500"
            >
              <UIcon
                :name="getWorkoutIcon(workout.type)"
                class="w-7 h-7"
                :class="getWorkoutColorClass(workout.type)"
              />
            </div>
            <div class="flex flex-col min-w-0">
              <h3
                class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter truncate group-hover:text-primary-500 transition-colors drop-shadow-md"
              >
                {{ workout.title }}
              </h3>
              <div
                class="font-mono text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.25em] flex items-center gap-2 mt-1"
              >
                <span>{{ formatDateTime(workout.date) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Primary Stats Group (HUD Style) -->
        <div class="flex flex-wrap items-center gap-10 ml-auto sm:ml-0">
          <!-- Distance -->
          <div
            v-if="workout.distanceMeters"
            class="flex flex-col items-end sm:items-center gap-1 shrink-0 group/metric"
          >
            <span class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em]"
              >Distance</span
            >
            <div class="flex items-baseline gap-1">
              <span
                class="text-2xl sm:text-4xl font-black tabular-nums transition-all duration-300 group-hover/metric:drop-shadow-[0_0_15px_rgba(34,197,94,0.4)] text-gray-900 dark:text-white"
              >
                {{ (workout.distanceMeters / 1000).toFixed(1) }}
              </span>
              <span class="text-[10px] font-bold text-zinc-500 uppercase opacity-65">km</span>
            </div>
          </div>

          <!-- Time (Duration) -->
          <div class="flex flex-col items-end sm:items-center gap-1 shrink-0">
            <span class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em]"
              >Time</span
            >
            <span
              class="text-2xl sm:text-4xl font-black tabular-nums text-gray-900 dark:text-white drop-shadow-sm"
            >
              {{ formatDuration(workout.durationSec) }}
            </span>
          </div>

          <!-- TSS -->
          <div
            v-if="workout.tss"
            class="flex flex-col items-end sm:items-center gap-1 shrink-0 group/tss"
          >
            <span class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em]"
              >TSS</span
            >
            <div class="flex items-baseline gap-1">
              <span
                class="text-2xl sm:text-4xl font-black tabular-nums transition-all duration-300 group-hover/tss:drop-shadow-[0_0_15px_rgba(0,220,130,0.4)]"
                :class="getIntensityColorClass(workout.intensity, 'text')"
              >
                {{ Math.round(workout.tss) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- CENTERED SECONDARY DATA GRID (Engineering HUD) -->
      <div class="flex items-center justify-center py-12 sm:py-16">
        <div class="grid grid-cols-3 sm:grid-cols-5 gap-x-10 gap-y-14 sm:gap-x-20 max-w-5xl w-full">
          <!-- Avg Power -->
          <div v-if="workout.averageWatts" class="flex flex-col items-center min-w-0">
            <span
              class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-2 truncate"
              >Avg Power</span
            >
            <div class="flex items-baseline gap-1 truncate">
              <span
                class="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 tabular-nums"
                >{{ workout.averageWatts }}</span
              >
              <span class="text-[9px] font-bold text-zinc-500 uppercase opacity-65">W</span>
            </div>
          </div>

          <!-- Max Power -->
          <div v-if="workout.maxWatts" class="flex flex-col items-center min-w-0">
            <span
              class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-2 truncate"
              >Max Power</span
            >
            <div class="flex items-baseline gap-1 truncate">
              <span
                class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tabular-nums"
                >{{ workout.maxWatts }}</span
              >
              <span class="text-[9px] font-bold text-zinc-500 uppercase opacity-65">W</span>
            </div>
          </div>

          <!-- Avg HR -->
          <div v-if="workout.averageHr" class="flex flex-col items-center min-w-0">
            <span
              class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-2 truncate"
              >Heart Rate</span
            >
            <div class="flex items-baseline gap-1 truncate">
              <span
                class="text-xl sm:text-2xl font-black text-pink-600 dark:text-pink-400 tabular-nums"
                >{{ workout.averageHr }}</span
              >
              <span class="text-[9px] font-bold text-zinc-500 uppercase opacity-65">bpm</span>
            </div>
          </div>

          <!-- Elevation -->
          <div v-if="workout.elevationGain" class="flex flex-col items-center min-w-0">
            <span
              class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-2 truncate"
              >Elev Gain</span
            >
            <div class="flex items-baseline gap-1 truncate">
              <span
                class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tabular-nums"
                >{{ workout.elevationGain }}</span
              >
              <span class="text-[9px] font-bold text-zinc-500 uppercase opacity-65">m</span>
            </div>
          </div>

          <!-- Avg Cadence -->
          <div v-if="workout.averageCadence" class="flex flex-col items-center min-w-0">
            <span
              class="font-mono text-[8px] font-black text-zinc-500 uppercase tracking-[0.25em] mb-2 truncate"
              >Cadence</span
            >
            <div class="flex items-baseline gap-1 truncate">
              <span
                class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tabular-nums"
                >{{ workout.averageCadence }}</span
              >
              <span class="text-[9px] font-bold text-zinc-500 uppercase opacity-65">rpm</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER: METADATA & HARDWARE TAGS -->
      <div
        class="flex flex-wrap justify-between items-end gap-6 w-full min-w-0 mt-auto pt-8 border-t border-gray-100/50 dark:border-gray-800/20"
      >
        <div class="flex flex-col gap-3 min-w-0">
          <div
            v-if="workout.deviceName"
            class="font-mono text-[9px] text-gray-400 dark:text-zinc-500 uppercase tracking-[0.15em] flex items-center gap-2"
          >
            <UIcon name="i-heroicons-cpu-chip" class="w-3.5 h-3.5 opacity-40" />
            <span class="truncate">{{ workout.deviceName }}</span>
          </div>

          <!-- Hardware-style Tags -->
          <div class="flex flex-wrap gap-2 items-center">
            <span
              v-for="tag in workout.tags?.slice(0, 3)"
              :key="tag"
              class="text-[9px] font-black px-2.5 py-1 rounded bg-zinc-100 dark:bg-[#121214] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/5 uppercase tracking-[0.2em] shadow-sm"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- Subtle Watermark Attribution -->
        <div
          class="opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 pb-1"
        >
          <UiDataAttribution
            v-if="
              [
                'strava',
                'garmin',
                'zwift',
                'apple_health',
                'whoop',
                'intervals',
                'withings',
                'hevy',
                'wahoo'
              ].includes(workout.source)
            "
            :provider="workout.source"
            mode="minimal"
          />
          <span
            v-else
            class="font-mono text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]"
            >{{ workout.source }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const { formatDateTime } = useFormat()

  const props = defineProps<{
    workout: any
  }>()

  defineEmits<{
    click: []
  }>()

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function getIntensityColorClass(intensity: number | null, type: 'text' | 'bg' = 'text') {
    const val = intensity || 0
    if (val < 0.75) return type === 'text' ? 'text-[#00DC82]' : 'bg-[#00DC82]'
    if (val < 0.85) return type === 'text' ? 'text-yellow-500' : 'bg-yellow-500'
    if (val < 0.95) return type === 'text' ? 'text-orange-500' : 'bg-orange-500'
    return type === 'text' ? 'text-red-500' : 'bg-red-500'
  }
</script>

<style scoped>
  /* Condensed Athletic Font Simulation */
  h3,
  .font-black {
    letter-spacing: -0.03em;
  }

  .drop-shadow-md {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.05));
  }

  .dark .drop-shadow-md {
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6));
  }
</style>
