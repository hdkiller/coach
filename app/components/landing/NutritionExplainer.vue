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

      <div class="mt-16 rounded-3xl border border-gray-800 bg-gray-900/70 p-8">
        <h3 class="text-xl font-semibold text-white">Quick Answers</h3>
        <div class="mt-6 grid gap-4 lg:grid-cols-3">
          <article class="rounded-xl border border-gray-800 bg-gray-950/80 p-5">
            <h4 class="text-sm font-semibold text-white">Why can my tank look low when I ate?</h4>
            <p class="mt-2 text-sm leading-6 text-gray-300">
              Meals replenish over time, while training and baseline metabolism keep drawing fuel.
              Timing, carb amount, and workout demand all affect the displayed level.
            </p>
          </article>

          <article class="rounded-xl border border-gray-800 bg-gray-950/80 p-5">
            <h4 class="text-sm font-semibold text-white">How long until predictions stabilize?</h4>
            <p class="mt-2 text-sm leading-6 text-gray-300">
              Usually within about a week of consistent logs and completed training. Early days are
              marked as calibrating because the model has less anchored history.
            </p>
          </article>

          <article class="rounded-xl border border-gray-800 bg-gray-950/80 p-5">
            <h4 class="text-sm font-semibold text-white">Does this replace my nutrition app?</h4>
            <p class="mt-2 text-sm leading-6 text-gray-300">
              No. Yazio/MyFitnessPal remain your logging tools. Coach Watts translates those logs
              into performance-focused fueling decisions.
            </p>
          </article>
        </div>

        <p class="mt-6 text-xs text-gray-400">
          Fuel estimates are model-based and improve with consistency. They are not direct lab
          measurements.
        </p>
      </div>
    </div>
  </section>
</template>
