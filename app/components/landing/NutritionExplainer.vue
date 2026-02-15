<template>
  <section id="nutrition-intelligence" class="relative overflow-hidden bg-gray-950 py-24 sm:py-32">
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.1),transparent_40%)]"
    />

    <div class="relative mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-3xl text-center">
        <h2 class="text-base font-semibold leading-7 text-emerald-400 font-mono">
          NUTRITION INTELLIGENCE
        </h2>
        <p class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Stop counting calories. Start fueling for the work ahead.
        </p>
        <p class="mt-6 text-lg leading-8 text-gray-300">
          Coach Watts combines your training load, meal logs, and planned sessions to estimate fuel
          availability and tell you what to eat, when to eat, and why it matters for performance.
        </p>
      </div>

      <div class="mt-16 grid gap-6 lg:grid-cols-3">
        <article class="rounded-2xl border border-emerald-500/20 bg-gray-900/80 p-6 backdrop-blur">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
              <UIcon name="i-heroicons-battery-100" class="h-5 w-5" />
            </div>
            <h3 class="text-lg font-semibold text-white">Fuel Tank</h3>
          </div>
          <p class="mt-4 text-sm leading-6 text-gray-300">
            A live glycogen estimate for your current day. Use it to understand your readiness for
            high-intensity work and avoid under-fueling before key sessions.
          </p>
          <p class="mt-3 text-xs text-gray-400">
            What you get: current level, trend, and next action.
          </p>
        </article>

        <article class="rounded-2xl border border-blue-500/20 bg-gray-900/80 p-6 backdrop-blur">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-blue-500/20 p-2 text-blue-400">
              <UIcon name="i-heroicons-chart-bar-square" class="h-5 w-5" />
            </div>
            <h3 class="text-lg font-semibold text-white">Metabolic Horizon</h3>
          </div>
          <p class="mt-4 text-sm leading-6 text-gray-300">
            A rolling projection across upcoming days. It highlights when your plan may accumulate
            fatigue so you can correct fueling before performance drops.
          </p>
          <p class="mt-3 text-xs text-gray-400">
            What you get: trendline, risk windows, and confidence cues.
          </p>
        </article>

        <article class="rounded-2xl border border-amber-500/20 bg-gray-900/80 p-6 backdrop-blur">
          <div class="flex items-center gap-3">
            <div class="rounded-lg bg-amber-500/20 p-2 text-amber-400">
              <UIcon name="i-heroicons-clock" class="h-5 w-5" />
            </div>
            <h3 class="text-lg font-semibold text-white">Fueling Windows</h3>
          </div>
          <p class="mt-4 text-sm leading-6 text-gray-300">
            Pre, intra, and post-workout targets for carbs, hydration, and sodium based on your
            planned training and current state.
          </p>
          <p class="mt-3 text-xs text-gray-400">
            What you get: practical targets you can execute without guesswork.
          </p>
        </article>
      </div>

      <div class="mt-16 grid gap-6 lg:grid-cols-5">
        <div class="rounded-3xl border border-gray-800 bg-gray-900/80 p-6 lg:col-span-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-white">Live Fuel Demo</p>
              <p class="text-xs text-gray-400">
                Example timeline: same workout, different fueling strategies.
              </p>
            </div>
            <UBadge color="neutral" variant="subtle" size="sm">
              Scenario: {{ activeScenario.name }}
            </UBadge>
          </div>

          <div class="mt-5 flex flex-wrap gap-2">
            <UButton
              v-for="scenario in scenarios"
              :key="scenario.id"
              size="sm"
              :color="selectedScenarioId === scenario.id ? 'primary' : 'neutral'"
              :variant="selectedScenarioId === scenario.id ? 'solid' : 'outline'"
              @click="selectedScenarioId = scenario.id"
            >
              {{ scenario.name }}
            </UButton>
          </div>

          <div class="mt-6 rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
            <svg viewBox="0 0 100 46" class="h-48 w-full" preserveAspectRatio="none">
              <line
                x1="4"
                y1="30"
                x2="96"
                y2="30"
                stroke="rgba(244,63,94,0.45)"
                stroke-dasharray="2 2"
              />
              <polyline
                :points="polylinePoints"
                fill="none"
                stroke="url(#fuel-gradient)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                v-for="point in chartPoints"
                :key="point.x"
                :cx="point.x"
                :cy="point.y"
                r="1.25"
                fill="#34d399"
              />

              <line
                v-for="marker in eventMarkers"
                :key="marker.label"
                :x1="marker.x"
                :x2="marker.x"
                y1="5"
                y2="41"
                stroke="rgba(148,163,184,0.35)"
                stroke-dasharray="1.5 2"
              />

              <defs>
                <linearGradient id="fuel-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#f43f5e" />
                  <stop offset="45%" stop-color="#f59e0b" />
                  <stop offset="100%" stop-color="#10b981" />
                </linearGradient>
              </defs>
            </svg>

            <div class="mt-2 grid grid-cols-3 gap-2 text-[11px] text-gray-400 sm:grid-cols-6">
              <span v-for="label in timelineLabels" :key="label" class="text-center">{{
                label
              }}</span>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-3 text-xs text-gray-300">
            <span class="rounded-full border border-gray-700 bg-gray-900/80 px-2.5 py-1"
              >Threshold line: 35%</span
            >
            <span
              v-for="marker in eventMarkers"
              :key="`${marker.label}-legend`"
              class="rounded-full border border-gray-700 bg-gray-900/80 px-2.5 py-1"
            >
              {{ marker.label }}
            </span>
          </div>
        </div>

        <div class="rounded-3xl border border-gray-800 bg-gray-900/80 p-6 lg:col-span-2">
          <p class="text-sm font-semibold text-white">Projected Session Outcome</p>
          <p class="mt-1 text-xs text-gray-400">Based on the selected fueling strategy.</p>

          <div class="mt-6 space-y-3">
            <div class="rounded-xl border border-gray-800 bg-gray-950/80 p-4">
              <p class="text-xs uppercase tracking-wide text-gray-400">Start Workout At</p>
              <p class="mt-1 text-2xl font-bold text-white">{{ activeScenario.startWorkout }}%</p>
            </div>
            <div class="rounded-xl border border-gray-800 bg-gray-950/80 p-4">
              <p class="text-xs uppercase tracking-wide text-gray-400">End Workout At</p>
              <p class="mt-1 text-2xl font-bold text-white">{{ activeScenario.endWorkout }}%</p>
            </div>
            <div class="rounded-xl border border-gray-800 bg-gray-950/80 p-4">
              <p class="text-xs uppercase tracking-wide text-gray-400">Expected Session Quality</p>
              <p class="mt-1 text-lg font-semibold text-emerald-300">
                {{ activeScenario.quality }}
              </p>
            </div>
          </div>

          <p class="mt-5 text-sm leading-6 text-gray-300">
            {{ activeScenario.note }}
          </p>

          <div class="mt-6 flex flex-wrap gap-3">
            <UButton to="/join" color="primary" size="lg">Build My Fueling Plan</UButton>
            <UButton to="#how-it-works" color="neutral" variant="ghost" size="lg">
              See Full Coaching Flow
            </UButton>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <p class="text-xs text-gray-400">
          Fuel estimates are model-based and improve with consistent logs and completed sessions.
          They are not direct lab measurements.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  type Scenario = {
    id: string
    name: string
    points: number[]
    startWorkout: number
    endWorkout: number
    quality: string
    note: string
  }

  const scenarios: Scenario[] = [
    {
      id: 'no-fuel',
      name: 'No Pre-Fuel',
      points: [54, 46, 39, 33, 27, 22],
      startWorkout: 33,
      endWorkout: 22,
      quality: 'Low and unstable',
      note: 'Without targeted carbs before the session, you enter the workout near the low-fuel zone and fade early.'
    },
    {
      id: 'pre-60',
      name: '+60g Pre',
      points: [54, 52, 58, 52, 45, 41],
      startWorkout: 58,
      endWorkout: 41,
      quality: 'Stable execution',
      note: 'A pre-session carb hit lifts your starting fuel and helps sustain quality through the main set.'
    },
    {
      id: 'pre-plus-intra',
      name: '+60g Pre +30g Intra',
      points: [54, 53, 61, 60, 57, 55],
      startWorkout: 61,
      endWorkout: 55,
      quality: 'High quality throughout',
      note: 'Combining pre and intra fueling gives the smoothest curve and the strongest finish for hard work.'
    }
  ]

  const selectedScenarioId = ref(scenarios[1]?.id ?? 'pre-60')

  const activeScenario = computed(() => {
    return scenarios.find((scenario) => scenario.id === selectedScenarioId.value) ?? scenarios[0]
  })

  const timelineLabels = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00']

  const chartPoints = computed(() => {
    const values = activeScenario.value.points
    const min = 10
    const max = 100
    const left = 4
    const right = 96
    const top = 5
    const bottom = 41

    return values.map((value, index) => {
      const x = left + (index * (right - left)) / (values.length - 1)
      const normalized = (value - min) / (max - min)
      const y = bottom - normalized * (bottom - top)
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
        value
      }
    })
  })

  const polylinePoints = computed(() => {
    return chartPoints.value.map((point) => `${point.x},${point.y}`).join(' ')
  })

  const eventMarkers = computed(() => {
    const points = chartPoints.value
    return [
      { label: 'Pre-Workout Window', x: points[2]?.x ?? 40 },
      { label: 'Workout Start', x: points[3]?.x ?? 58 },
      { label: 'Workout End', x: points[5]?.x ?? 96 }
    ]
  })
</script>
