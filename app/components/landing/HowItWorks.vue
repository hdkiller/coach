<template>
  <div
    id="how-it-works"
    ref="sectionRef"
    class="py-24 sm:py-32 bg-gray-900 relative overflow-hidden"
    :style="{ '--flow-progress': `${Math.round(flowProgress * 100)}%` }"
  >
    <!-- Matrix Background Effect -->
    <div
      class="absolute inset-0 opacity-5 bg-[url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbm95MXY4Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0Z3Y0/U3qYN8S0j3bpK/giphy.gif')] bg-cover mix-blend-screen pointer-events-none"
    />

    <div class="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-base font-semibold leading-7 text-primary-400 font-mono">THE PROCESS</h2>
        <p class="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          From Raw Data to Gold Medal Strategy
        </p>
        <p class="mt-6 text-lg leading-8 text-gray-400">
          We don't just show you charts. We ingest your entire digital physiology, analyze the
          hidden patterns, and build a coaching strategy that includes training and fueling.
        </p>
      </div>

      <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
        <dl
          class="relative grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-y-10"
        >
          <div
            class="pointer-events-none absolute left-11 right-11 top-8 hidden lg:block border-t border-dashed border-gray-700/90"
          />
          <div
            class="flow-line-fill pointer-events-none absolute left-11 right-11 top-8 hidden lg:block h-px"
          />

          <!-- Step 1: Ingest -->
          <div
            class="group relative flex flex-col rounded-2xl border border-transparent p-3 transition-all duration-300 hover:border-primary-500/25 hover:bg-gray-800/20"
          >
            <div
              class="icon-shell mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gray-800/80 ring-1 ring-gray-700/90 transition-all duration-300 group-hover:bg-primary-500/12 group-hover:ring-primary-500/70"
            >
              <UIcon
                name="i-heroicons-arrow-down-tray"
                class="h-6 w-6 text-white transition-all duration-300 group-hover:scale-110 group-hover:text-[#00DC82]"
              />
            </div>
            <dt
              class="flex items-center gap-x-3 text-base font-semibold leading-7 text-white transition-colors duration-300 group-hover:text-white"
            >
              <span class="font-mono text-xl font-black text-primary-500">01_</span>
              Connect Data
            </dt>
            <dd
              class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400 transition-colors duration-300 group-hover:text-gray-300"
            >
              <p class="flex-auto">
                Connect your training and nutrition apps. We combine Strava, Whoop, Garmin, Yazio,
                and more into one performance timeline.
              </p>

              <!-- Visual Hint -->
              <div class="meta-row mt-5 flex -space-x-2 overflow-hidden">
                <div class="inline-block h-6 w-6 rounded-full bg-orange-500 ring-2 ring-gray-900" />
                <!-- Strava color -->
                <div
                  class="inline-block h-6 w-6 rounded-full bg-black ring-2 ring-gray-900 border border-white/20"
                />
                <!-- Whoop color -->
                <div class="inline-block h-6 w-6 rounded-full bg-blue-500 ring-2 ring-gray-900" />
                <!-- Icons for more -->
                <div
                  class="inline-block h-6 w-6 rounded-full bg-gray-700 ring-2 ring-gray-900 flex items-center justify-center text-[10px] text-white font-bold"
                >
                  +
                </div>
              </div>
            </dd>
          </div>

          <!-- Step 2: Analyze -->
          <div
            class="group relative flex flex-col rounded-2xl border border-transparent p-3 transition-all duration-300 hover:border-primary-500/25 hover:bg-gray-800/20"
          >
            <div
              class="icon-shell mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gray-800/80 ring-1 ring-gray-700/90 transition-all duration-300 group-hover:bg-primary-500/12 group-hover:ring-primary-500/70"
            >
              <UIcon
                name="i-heroicons-cpu-chip"
                class="h-6 w-6 text-white transition-all duration-300 group-hover:scale-110 group-hover:text-[#00DC82]"
              />
            </div>
            <dt
              class="flex items-center gap-x-3 text-base font-semibold leading-7 text-white transition-colors duration-300 group-hover:text-white"
            >
              <span class="font-mono text-xl font-black text-primary-500">02_</span>
              Model Readiness
            </dt>
            <dd
              class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400 transition-colors duration-300 group-hover:text-gray-300"
            >
              <p class="flex-auto">
                Our AI models fatigue, recovery, and fuel availability so you can see what standard
                charts miss.
              </p>
              <div class="meta-row mt-5 flex items-center gap-2">
                <span class="relative flex h-3 w-3">
                  <span
                    class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75"
                  />
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-[#ef4444]" />
                </span>
                <span class="status-pill status-pill-red">Status: Deep Fatigue Detected</span>
              </div>
            </dd>
          </div>

          <!-- Step 3: Profile -->
          <div
            class="group relative flex flex-col rounded-2xl border border-transparent p-3 transition-all duration-300 hover:border-primary-500/25 hover:bg-gray-800/20"
          >
            <div
              class="icon-shell mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gray-800/80 ring-1 ring-gray-700/90 transition-all duration-300 group-hover:bg-primary-500/12 group-hover:ring-primary-500/70"
            >
              <UIcon
                name="i-heroicons-user-circle"
                class="h-6 w-6 text-white transition-all duration-300 group-hover:scale-110 group-hover:text-[#00DC82]"
              />
            </div>
            <dt
              class="flex items-center gap-x-3 text-base font-semibold leading-7 text-white transition-colors duration-300 group-hover:text-white"
            >
              <span class="font-mono text-xl font-black text-primary-500">03_</span>
              Plan Fueling
            </dt>
            <dd
              class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400 transition-colors duration-300 group-hover:text-gray-300"
            >
              <p class="flex-auto">
                Get pre, intra, and post-workout fueling targets with carbs, fluids, and sodium
                based on your actual training load.
              </p>
              <!-- Score Hint -->
              <div class="meta-row mt-5 flex flex-wrap gap-2">
                <span class="status-pill status-pill-green">Fuel: Optimized</span>
                <span class="status-pill status-pill-yellow">Recovery: Balanced</span>
              </div>
            </dd>
          </div>

          <!-- Step 4: Coach -->
          <div
            class="group relative flex flex-col rounded-2xl border border-transparent p-3 transition-all duration-300 hover:border-primary-500/25 hover:bg-gray-800/20"
          >
            <div
              class="icon-shell mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gray-800/80 ring-1 ring-gray-700/90 transition-all duration-300 group-hover:bg-primary-500/12 group-hover:ring-primary-500/70"
            >
              <UIcon
                name="i-heroicons-chat-bubble-bottom-center-text"
                class="h-6 w-6 text-white transition-all duration-300 group-hover:scale-110 group-hover:text-[#00DC82]"
              />
            </div>
            <dt
              class="flex items-center gap-x-3 text-base font-semibold leading-7 text-white transition-colors duration-300 group-hover:text-white"
            >
              <span class="font-mono text-xl font-black text-primary-500">04_</span>
              Execute Daily
            </dt>
            <dd
              class="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400 transition-colors duration-300 group-hover:text-gray-300"
            >
              <p class="flex-auto">
                Receive specific actions for training and nutrition. Know whether to push, recover,
                or refuel before your next key session.
              </p>

              <div
                class="meta-row ai-quote mt-5 flex items-center gap-3 rounded-lg border-l-2 border-primary-500 bg-gray-800 p-3 text-xs italic text-gray-300"
              >
                <UIcon name="i-heroicons-cpu-chip" class="w-5 h-5 text-primary-500 shrink-0" />
                <span class="typing-quote"
                  >"Fuel low for threshold work. Add 60g carbs 90min pre-ride."</span
                >
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  const sectionRef = ref<HTMLElement | null>(null)
  const flowProgress = ref(0)

  const updateFlowProgress = () => {
    if (!sectionRef.value || import.meta.server) return

    const rect = sectionRef.value.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const travel = rect.height + viewportHeight * 0.6
    const passed = viewportHeight * 0.75 - rect.top
    const raw = passed / travel

    flowProgress.value = Math.min(1, Math.max(0, raw))
  }

  onMounted(() => {
    updateFlowProgress()
    window.addEventListener('scroll', updateFlowProgress, { passive: true })
    window.addEventListener('resize', updateFlowProgress, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateFlowProgress)
    window.removeEventListener('resize', updateFlowProgress)
  })
</script>

<style scoped>
  .icon-shell {
    box-shadow:
      0 0 0 1px rgba(0, 220, 130, 0.08),
      0 0 24px rgba(0, 220, 130, 0.08);
  }

  .group:hover .icon-shell {
    animation: icon-bounce 0.42s ease;
    box-shadow:
      0 0 0 1px rgba(0, 220, 130, 0.36),
      0 0 30px rgba(0, 220, 130, 0.24);
  }

  .meta-row {
    min-height: 2.6rem;
    align-items: center;
  }

  .status-pill {
    display: inline-flex;
    min-height: 1.75rem;
    align-items: center;
    border-radius: 9999px;
    border-width: 1px;
    padding: 0.25rem 0.7rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .status-pill-red {
    border-color: rgba(239, 68, 68, 0.38);
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }

  .status-pill-green {
    border-color: rgba(0, 220, 130, 0.34);
    background: rgba(0, 220, 130, 0.12);
    color: #00dc82;
  }

  .status-pill-yellow {
    border-color: rgba(250, 204, 21, 0.32);
    background: rgba(250, 204, 21, 0.12);
    color: #facc15;
  }

  .flow-line-fill {
    width: var(--flow-progress);
    background: linear-gradient(90deg, rgba(0, 220, 130, 0.45), #00dc82, rgba(0, 220, 130, 0.72));
    box-shadow: 0 0 16px rgba(0, 220, 130, 0.3);
    transition: width 0.2s ease-out;
  }

  .ai-quote {
    animation: ai-pulse 2.2s ease-in-out infinite;
  }

  .typing-quote {
    display: inline-block;
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    border-right: 2px solid rgba(0, 220, 130, 0.6);
    animation:
      quote-type 4.4s steps(64, end) 0.35s forwards,
      cursor-blink 0.8s steps(1, end) infinite;
  }

  @keyframes icon-bounce {
    0% {
      transform: scale(1) translateY(0);
    }
    50% {
      transform: scale(1.08) translateY(-2px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes ai-pulse {
    0%,
    100% {
      box-shadow: 0 0 0 rgba(0, 220, 130, 0);
    }
    50% {
      box-shadow: 0 0 20px rgba(0, 220, 130, 0.14);
    }
  }

  @keyframes quote-type {
    to {
      max-width: 36ch;
    }
  }

  @keyframes cursor-blink {
    0%,
    49% {
      border-right-color: rgba(0, 220, 130, 0.6);
    }
    50%,
    100% {
      border-right-color: transparent;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flow-line-fill,
    .group:hover .icon-shell,
    .ai-quote,
    .typing-quote {
      animation: none;
      transition: none;
    }

    .typing-quote {
      max-width: 100%;
      border-right: none;
      white-space: normal;
    }
  }
</style>
