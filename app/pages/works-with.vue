<script setup lang="ts">
  import { motion } from 'motion-v'
  import { useMediaQuery } from '@vueuse/core'

  definePageMeta({
    layout: 'home',
    auth: false
  })

  useSeoMeta({
    title: 'Ecosystem & Integrations',
    description:
      'Connect your favorite devices and platforms. We handle the data, you handle the training.'
  })

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'platforms', label: 'Platforms' },
    { id: 'hardware', label: 'Wearables' },
    { id: 'virtual', label: 'Virtual' }
  ]

  const activeCategory = ref('all')
  const searchQuery = ref('')

  const integrations = [
    {
      name: 'Strava',
      category: 'platforms',
      src: '/images/logos/strava.svg',
      description: 'Auto-upload activities and sync your segments.',
      status: 'Instant Sync',
      color: '#FC6100',
      weight: 1.2
    },
    {
      name: 'Intervals.icu',
      category: 'platforms',
      src: '/images/logos/intervals.png',
      description: 'Deep-dive power analytics and seasonal planning.',
      status: '2-Key Sync',
      color: '#00DC82',
      weight: 1.0
    },
    {
      name: 'Garmin Connect',
      category: 'hardware',
      src: '/images/logos/Garmin_Connect_app_1024x1024.png',
      description: 'Direct integration for health and activity data.',
      status: 'Instant Sync',
      color: '#007cc3',
      weight: 0.9
    },
    {
      name: 'Wahoo Cloud',
      category: 'hardware',
      src: '/images/logos/wahoo_logo_square.jpeg',
      description: 'Sync activities and training plans with your ELEMNT.',
      status: 'Instant Sync',
      color: '#000000',
      weight: 1.0
    },
    {
      name: 'WHOOP',
      category: 'hardware',
      src: '/images/logos/whoop_square.svg',
      description: 'Incorporate recovery and sleep scores into your training.',
      status: 'Instant Sync',
      color: '#000000',
      weight: 0.8
    },
    {
      name: 'Oura',
      category: 'hardware',
      src: '/images/logos/oura.svg',
      description: 'Monitor readiness and sleep cycles automatically.',
      status: 'Instant Sync',
      color: '#FFFFFF',
      weight: 1.1
    },
    {
      name: 'ROUVY',
      category: 'virtual',
      src: '/images/logos/rouvy-symbol-rgb.svg',
      description: 'Analyze your virtual races with outdoor precision.',
      status: 'Instant Sync',
      color: '#E01E26',
      weight: 1.0
    },
    {
      name: 'Fitbit',
      category: 'hardware',
      src: '/images/logos/fitbit_square.png',
      description: 'Track daily activity, sleep, and nutrition history.',
      status: 'Instant Sync',
      color: '#00B0B9',
      weight: 1.0
    },
    {
      name: 'Polar',
      category: 'hardware',
      src: '/images/logos/polar_logo_square.png',
      description: 'Activities, sleep, and nightly recharge data.',
      status: 'Instant Sync',
      color: '#E31E24',
      weight: 1.0
    },
    {
      name: 'Withings',
      category: 'hardware',
      src: '/images/logos/withings.png',
      description: 'Weight, body composition, and health metrics.',
      status: 'Instant Sync',
      color: '#000000',
      weight: 1.0
    },
    {
      name: 'Yazio',
      category: 'platforms',
      src: '/images/logos/yazio_square.webp',
      description: 'Nutrition tracking and meal planning integration.',
      status: 'Instant Sync',
      color: '#EE5223',
      weight: 0.9
    },
    {
      name: 'Hevy',
      category: 'platforms',
      src: '/images/logos/hevy-icon.png',
      description: 'Strength training and workout logging analysis.',
      status: 'Instant Sync',
      color: '#3069FE',
      weight: 0.9
    },
    {
      name: 'Telegram',
      category: 'platforms',
      src: 'i-simple-icons-telegram',
      isIcon: true,
      description: 'Chat with your AI Coach on the go via Telegram Bot.',
      status: 'Instant Sync',
      color: '#26A5E4',
      weight: 1.0
    }
  ]

  const filteredIntegrations = computed(() => {
    return integrations.filter((item) => {
      const matchesCategory =
        activeCategory.value === 'all' || item.category === activeCategory.value
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchesCategory && matchesSearch
    })
  })

  const getPosition = (index: number, total: number, radius = 320) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    }
  }

  const floatingVariants: any = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: [0.45, 0.05, 0.55, 0.95]
      }
    }
  }

  const scrollVariants: any = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-10% 0px' },
    transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }
  }
  const isMobile = useMediaQuery('(max-width: 1024px)')
</script>

<template>
  <div class="bg-gray-900 border-t border-gray-800 isolate">
    <!-- 1. Hero Section -->
    <section
      class="relative min-h-[90vh] flex items-center justify-center overflow-hidden py-10 lg:py-20 px-6"
    >
      <!-- Targeted Focal Glimmers -->
      <div
        class="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-600/15 rounded-full blur-[80px] -z-10 pointer-events-none opacity-40"
      />
      <div
        class="absolute right-1/4 bottom-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/15 rounded-full blur-[80px] -z-10 pointer-events-none opacity-40"
      />

      <UContainer>
        <div class="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <!-- Text Content -->
          <motion.div v-bind="scrollVariants" class="flex-1 text-center lg:text-left z-10">
            <h1
              class="text-3xl sm:text-6xl lg:text-8xl font-black uppercase tracking-tight text-white mb-6 lg:mb-8 leading-[0.9]"
            >
              The Center <br class="hidden sm:block" />
              of Your <br class="hidden sm:block" />
              <span class="text-primary-500">Performance</span> <br class="hidden sm:block" />
              Ecosystem.
            </h1>
            <p class="text-xl text-gray-400 max-w-xl mb-12 leading-relaxed font-medium">
              Connect your favorite devices and platforms. We handle the data, you handle the
              training.
            </p>
            <div
              class="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <UButton
                size="xl"
                to="/join"
                color="primary"
                class="w-full sm:w-auto font-black px-10 h-16 rounded-2xl text-lg shadow-[0_0_40px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95 transition-all"
                >Get Started</UButton
              >
              <UButton
                size="xl"
                variant="link"
                color="neutral"
                class="font-bold text-gray-400 hover:text-white"
                to="/documentation"
              >
                View API Docs <UIcon name="i-heroicons-arrow-up-right-20-solid" />
              </UButton>
            </div>
          </motion.div>

          <!-- Hero Hub and Spoke Visual -->
          <ClientOnly>
            <div
              class="flex lg:flex-1 relative items-center justify-center h-[400px] sm:h-[500px] lg:h-[700px] overflow-visible"
            >
              <svg
                class="absolute inset-0 w-full h-full pointer-events-none overflow-visible hidden lg:block"
                viewBox="0 0 800 800"
              >
                <g transform="translate(470, 350)">
                  <motion.line
                    v-for="(integ, i) in integrations.slice(0, 8)"
                    :key="`line-${i}`"
                    :x1="0"
                    :y1="0"
                    :x2="getPosition(i, 8, 320).x"
                    :y2="getPosition(i, 8, 320).y"
                    stroke="currentColor"
                    class="text-primary-500/20"
                    stroke-width="2"
                    stroke-dasharray="8 8"
                    :initial="{ pathLength: 0, opacity: 0 }"
                    :animate="{ pathLength: 1, opacity: 0.4 }"
                    :transition="{ duration: 2, delay: 0.5 + i * 0.1 }"
                  />
                </g>
              </svg>

              <!-- Central Hub -->
              <motion.div
                class="relative z-30 w-28 h-28 sm:w-32 sm:h-32 lg:w-44 lg:h-44 bg-gray-950 rounded-3xl sm:rounded-[2.5rem] lg:rounded-[3rem] shadow-[0_0_80px_rgba(34,197,94,0.3)] flex items-center justify-center p-8 sm:p-8 lg:p-10 lg:translate-x-[70px] animate-breathing-pulse border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                :animate="{ scale: [1, 1.05, 1] }"
                :transition="{ duration: 5, repeat: Infinity, ease: 'easeInOut' }"
              >
                <!-- 1px Gradient Border -->
                <div
                  class="absolute inset-0 rounded-2xl sm:rounded-[2.5rem] lg:rounded-[3rem] p-px pointer-events-none z-50"
                >
                  <div
                    class="w-full h-full rounded-2xl sm:rounded-[2.5rem] lg:rounded-[3rem] border border-white/10"
                    style="
                      border-image: linear-gradient(
                          to bottom right,
                          rgba(255, 255, 255, 0.2),
                          rgba(0, 220, 130, 0.5)
                        )
                        1;
                    "
                  />
                </div>
                <img
                  src="/media/logo_square.webp"
                  alt="Coach Watts"
                  class="w-full h-full object-contain"
                />
                <div
                  class="absolute inset-0 rounded-2xl sm:rounded-[2.5rem] lg:rounded-[3rem] bg-primary-500/10 blur-2xl animate-pulse -z-10"
                />
              </motion.div>

              <div
                v-for="(integ, i) in integrations.slice(0, 8)"
                :key="integ.name"
                class="absolute left-1/2 top-1/2"
                :style="{
                  transform: `translate(calc(-50% + ${isMobile ? getPosition(i, 8, 125).x : getPosition(i, 8, 320).x + 70}px), calc(-50% + ${isMobile ? getPosition(i, 8, 125).y : getPosition(i, 8, 320).y}px))`
                }"
              >
                <motion.div :variants="floatingVariants" animate="animate">
                  <div
                    class="w-12 h-12 lg:w-20 lg:h-20 bg-gray-950/80 backdrop-blur-md rounded-xl lg:rounded-2xl border border-white/5 p-2 lg:p-4 flex items-center justify-center lg:translate-x-[70px] shadow-2xl"
                  >
                    <UIcon
                      v-if="integ.isIcon"
                      :name="integ.src"
                      class="w-full h-full object-contain"
                      :style="{ color: integ.color }"
                    />
                    <img
                      v-else
                      :src="integ.src"
                      class="w-full h-full object-contain filter grayscale-0 brightness-100 opacity-80 sm:grayscale sm:invert sm:brightness-200 sm:opacity-40 hover:grayscale-0 hover:invert-0 hover:brightness-100 hover:opacity-100 transition-all duration-500"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
            <template #fallback>
              <div
                class="flex lg:flex-1 relative items-center justify-center h-[400px] sm:h-[500px] lg:h-[700px]"
              >
                <div
                  class="w-28 h-28 sm:w-32 sm:h-32 lg:w-44 lg:h-44 bg-gray-950 rounded-3xl border border-white/10 animate-pulse"
                />
              </div>
            </template>
          </ClientOnly>
        </div>
      </UContainer>
    </section>

    <!-- 2. Categorized Integration Grid -->
    <section class="py-10 lg:py-32 bg-gray-950/50 relative border-y border-white/5">
      <UContainer>
        <motion.div v-bind="scrollVariants" class="flex flex-col gap-8 mb-12 sm:mb-20">
          <div class="px-4">
            <h2
              class="text-4xl sm:text-5xl font-black uppercase text-white mb-4 tracking-tight italic"
            >
              Our Ecosystem
            </h2>
            <p class="text-sm text-gray-400 font-medium mb-8 max-w-sm lg:hidden">
              Filter by category to find your performance tools.
            </p>
          </div>

          <!-- Sticky Category Bar -->
          <div
            class="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-white/10 py-3 shadow-2xl lg:static lg:bg-transparent lg:border-none lg:py-0"
          >
            <UContainer class="!px-0 sm:!px-4">
              <div class="flex items-center justify-between gap-4 px-4 sm:px-0">
                <div class="flex-1 overflow-x-auto scrollbar-hide no-scrollbar">
                  <div class="flex gap-2">
                    <button
                      v-for="cat in categories"
                      :key="cat.id"
                      class="whitespace-nowrap px-5 py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 border shrink-0"
                      :class="[
                        activeCategory === cat.id
                          ? 'bg-primary-500 border-primary-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30 hover:text-white'
                      ]"
                      @click="activeCategory = cat.id"
                    >
                      {{ cat.label }}
                    </button>
                  </div>
                </div>

                <!-- Inline Search (Desktop only or icon on mobile?) -->
                <div class="hidden lg:block w-72">
                  <UInput
                    v-model="searchQuery"
                    icon="i-heroicons-magnifying-glass"
                    placeholder="Search..."
                    variant="outline"
                    :ui="{ base: 'rounded-xl bg-white/5 border-white/10' }"
                  />
                </div>
              </div>
            </UContainer>
          </div>

          <!-- Mobile Search Bar (Below Sticky) -->
          <div class="px-4 lg:hidden">
            <UInput
              v-model="searchQuery"
              icon="i-heroicons-magnifying-glass"
              placeholder="Search integrations..."
              size="xl"
              variant="outline"
              :ui="{
                base: 'rounded-2xl bg-white/5 border-white/10 hover:border-primary-500/50 transition-colors'
              }"
            />
          </div>
        </motion.div>

        <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 px-0 sm:px-4">
          <transition-group
            enter-active-class="transition duration-700 ease-out"
            enter-from-class="opacity-0 translate-y-8 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition duration-300 ease-in absolute"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-for="integ in filteredIntegrations"
              :key="integ.name"
              class="relative floating-card-base grain-overlay group p-5 sm:p-10 rounded-3xl sm:rounded-[40px] flex flex-col gap-4 sm:gap-8 h-full border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
              <!-- 1px Gradient Border Overlay -->
              <div
                class="absolute inset-0 rounded-3xl sm:rounded-[40px] p-px pointer-events-none z-50"
              >
                <div
                  class="w-full h-full rounded-3xl sm:rounded-[40px] border border-white/10"
                  style="
                    border-image: linear-gradient(
                        to bottom right,
                        rgba(255, 255, 255, 0.1),
                        rgba(0, 220, 130, 0.2)
                      )
                      1;
                  "
                />
              </div>
              <div class="flex items-start justify-between sm:justify-between lg:justify-between">
                <div
                  class="w-12 h-12 sm:w-20 sm:h-20 bg-gray-950 rounded-2xl border border-white/5 p-2 sm:p-5 flex items-center justify-center transition-all duration-500 group-hover:border-primary-500/50 group-hover:scale-105 mx-auto sm:mx-0"
                >
                  <UIcon
                    v-if="integ.isIcon"
                    :name="integ.src"
                    class="w-full h-full object-contain"
                    :style="{ color: integ.color, transform: `scale(${integ.weight || 1})` }"
                  />
                  <img
                    v-else
                    :src="integ.src"
                    :alt="integ.name"
                    class="w-full h-full object-contain filter grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    :class="{ 'invert brightness-150': integ.color === '#000000' || !integ.color }"
                    :style="{ transform: `scale(${integ.weight || 1})` }"
                  />
                </div>
                <div
                  class="absolute top-4 right-4 sm:static text-right flex flex-col items-end gap-2"
                >
                  <span
                    class="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] px-2 sm:px-4 py-1 sm:py-2 rounded-full border border-primary-500/20 bg-primary-500/10 text-primary-400 whitespace-nowrap"
                  >
                    {{ integ.status }}
                  </span>
                </div>
              </div>

              <div class="space-y-1 sm:space-y-3 text-center sm:text-left">
                <h3
                  class="text-sm sm:text-2xl font-black text-white uppercase tracking-tight italic"
                >
                  {{ integ.name }}
                </h3>
                <p class="hidden sm:block text-base text-gray-400 leading-relaxed font-medium">
                  {{ integ.description }}
                </p>
              </div>

              <div class="hidden sm:flex items-center gap-2 mt-auto">
                <span
                  class="text-[10px] font-black text-primary-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-2 group-hover:translate-x-0"
                  >Learn More</span
                >
                <UIcon
                  name="i-heroicons-arrow-right"
                  class="w-4 h-4 text-primary-500 transform -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500"
                />
              </div>
            </div>
          </transition-group>
        </div>
      </UContainer>
    </section>

    <!-- 3. Feature Showcase -->
    <section class="py-10 lg:py-40 bg-gray-900 space-y-16 lg:space-y-40 overflow-hidden">
      <UContainer>
        <!-- Feature 1: Biometric Overlay -->
        <motion.div v-bind="scrollVariants" class="flex flex-col lg:flex-row items-center gap-20">
          <div class="w-full lg:flex-1 order-1 lg:order-1 px-4 sm:px-0">
            <div class="relative max-w-lg mx-auto lg:mx-0">
              <!-- Mock UI -->
              <div
                class="relative floating-card-base grain-overlay rounded-3xl sm:rounded-[48px] p-6 sm:p-10 h-auto sm:h-[520px] flex items-center justify-center group border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
              >
                <!-- 1px Gradient Border Overlay -->
                <div
                  class="absolute inset-0 rounded-3xl sm:rounded-[48px] p-px pointer-events-none z-50"
                >
                  <div
                    class="w-full h-full rounded-3xl sm:rounded-[48px] border border-white/10"
                    style="
                      border-image: linear-gradient(
                          to bottom right,
                          rgba(255, 255, 255, 0.1),
                          rgba(0, 220, 130, 0.2)
                        )
                        1;
                    "
                  />
                </div>
                <div class="w-full space-y-6 sm:space-y-10 relative">
                  <div class="flex items-center justify-between">
                    <div>
                      <div
                        class="text-[8px] sm:text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1"
                      >
                        Today's Readiness
                      </div>
                      <div class="text-4xl sm:text-6xl font-black text-white italic font-athletic">
                        94<span class="text-sm sm:text-xl text-primary-500 ml-2 sm:ml-3"
                          >Optimal</span
                        >
                      </div>
                    </div>
                    <div
                      class="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 group-hover:border-primary-500/50 transition-colors"
                    >
                      <UIcon
                        name="i-heroicons-bolt-solid"
                        class="text-primary-500 w-6 h-6 sm:w-8 sm:h-8 animate-pulse"
                      />
                    </div>
                  </div>

                  <!-- Recovery Bar -->
                  <div class="space-y-3 sm:space-y-4">
                    <div
                      class="flex justify-between text-[9px] sm:text-[11px] font-black text-gray-600 uppercase tracking-widest"
                    >
                      <span>Recovery State</span>
                      <span class="text-primary-400">Deep Sleep</span>
                    </div>
                    <div
                      class="h-3 sm:h-4 bg-gray-950 rounded-full overflow-hidden border border-white/5 shadow-inner"
                    >
                      <div
                        class="h-full w-[94%] bg-gradient-to-r from-red-500 via-amber-400 to-primary-500 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-1000 ease-out"
                      />
                    </div>
                  </div>

                  <!-- AI Insight Note (Midnight Charcoal) -->
                  <div
                    class="p-5 sm:p-8 rounded-2xl sm:rounded-[32px] bg-[#0c0e12] border border-white/5 shadow-2xl relative overflow-hidden group/insight transition-all duration-500 hover:border-primary-500/20 w-full"
                  >
                    <div
                      class="absolute top-0 right-0 p-4 opacity-10 group-hover/insight:opacity-30 group-hover/insight:scale-110 transition-all duration-700"
                    >
                      <UIcon
                        name="i-heroicons-sparkles"
                        class="w-12 h-12 sm:w-20 sm:h-20 text-primary-500"
                      />
                    </div>
                    <div
                      class="text-[9px] sm:text-[11px] text-primary-500 font-black uppercase tracking-[0.3em] mb-2 sm:mb-3"
                    >
                      Coach Insight
                    </div>
                    <p class="text-sm sm:text-base text-gray-300 font-medium leading-relaxed">
                      High recovery detected from Oura. Recommended intensity increased by
                      <span class="text-primary-400 font-black">+5%</span>.
                    </p>
                  </div>
                </div>
              </div>
              <!-- Accent decorations -->
              <div
                class="absolute -top-10 -left-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] -z-10"
              />
              <div
                class="absolute -bottom-10 -right-10 w-48 h-48 bg-primary-500/10 rounded-full blur-[80px] -z-10"
              />
            </div>
          </div>
          <div class="flex-1 order-2 lg:order-2 px-4 sm:px-0">
            <div
              class="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8"
            >
              Intelligent Synergy
            </div>
            <h2
              class="text-5xl sm:text-7xl font-black uppercase text-white mb-10 tracking-tighter leading-[0.9]"
            >
              The Biometric <br />
              <span class="text-emerald-500">Overlay.</span>
            </h2>
            <p class="text-xl text-gray-400 mb-10 leading-relaxed font-medium">
              We don't just import data; we correlate it. By combining your Garmin workout files
              with sleep and recovery metrics from Oura or WHOOP, our AI adjusts your training
              recommendations in real-time.
            </p>
            <ul class="space-y-6">
              <li
                v-for="item in [
                  'Real-time Load Balancing',
                  'Automatic Intensity Scaling',
                  'Recovery-Aware Periodization'
                ]"
                :key="item"
                class="flex items-center gap-4 text-white font-black uppercase tracking-tight"
              >
                <div
                  class="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(34,197,94,0.8)]"
                />
                {{ item }}
              </li>
            </ul>
          </div>
        </motion.div>
      </UContainer>

      <UContainer>
        <!-- Feature 2: One-Click Export -->
        <motion.div v-bind="scrollVariants" class="flex flex-col lg:flex-row items-center gap-20">
          <div class="flex-1 order-2 lg:order-1 px-4 sm:px-0">
            <div
              class="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8"
            >
              Seamless Workflow
            </div>
            <h2
              class="text-4xl sm:text-7xl font-black uppercase text-white mb-8 tracking-tighter leading-[0.9]"
            >
              One-Click <br />
              <span class="text-blue-500">Device Sync.</span>
            </h2>
            <p class="text-lg sm:text-xl text-gray-400 mb-10 leading-relaxed font-medium">
              Stop manually typing power targets into your bike computer. Our AI models generates
              structured files that sync directly to your Intervals.icu calendar.
            </p>
            <div class="flex flex-wrap gap-4">
              <UButton
                size="xl"
                color="neutral"
                class="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-black border border-white/10 uppercase tracking-widest px-8 rounded-2xl h-14"
              >
                Explore File Formats
              </UButton>
            </div>
          </div>
          <div class="w-full lg:flex-1 flex justify-center order-1 lg:order-2 px-4 sm:px-0">
            <div
              class="bg-gray-800/80 backdrop-blur-xl rounded-3xl sm:rounded-[48px] border border-white/10 p-8 sm:p-14 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] relative w-full"
            >
              <div class="text-center mb-12">
                <div class="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">
                  Finalizing Plan
                </div>
                <div class="text-3xl font-black text-white tracking-tight italic">
                  V02 Max Intervals
                </div>
              </div>
              <div class="space-y-5 mb-12">
                <div
                  class="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 group hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-500 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div class="flex items-center gap-5">
                    <div
                      class="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-blue-500/30"
                    >
                      <img src="/images/logos/intervals.png" class="w-10 h-10 object-contain" />
                    </div>
                    <span class="text-lg font-black text-white uppercase tracking-tight"
                      >Push to Intervals</span
                    >
                  </div>
                  <UIcon
                    name="i-heroicons-cloud-arrow-up"
                    class="w-6 h-6 text-white/40 group-hover:text-blue-500 transition-colors"
                  />
                </div>
                <div
                  class="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 group hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-500 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div class="flex items-center gap-5">
                    <div
                      class="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-blue-500/30"
                    >
                      <UIcon name="i-heroicons-bolt" class="w-8 h-8 text-blue-500" />
                    </div>
                    <span class="text-lg font-black text-white uppercase tracking-tight"
                      >Export .FIT File</span
                    >
                  </div>
                  <UIcon
                    name="i-heroicons-arrow-down-tray"
                    class="w-6 h-6 text-white/40 group-hover:text-blue-500 transition-colors"
                  />
                </div>
              </div>
              <div
                class="absolute -z-10 bg-blue-500/10 blur-[100px] w-full h-full inset-0 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </UContainer>
    </section>

    <!-- Final CTA -->
    <section
      class="py-20 lg:py-48 relative text-center px-6 overflow-hidden border-t border-white/5"
    >
      <motion.div v-bind="scrollVariants" class="max-w-4xl mx-auto">
        <h2
          class="text-4xl sm:text-6xl lg:text-9xl font-black uppercase text-white mb-8 leading-[0.8] tracking-tighter"
        >
          Ready to <br />
          <span class="text-primary-500">Upgrade</span> <br />
          Your Training?
        </h2>
        <p class="text-lg sm:text-2xl text-gray-400 mb-12 font-medium max-w-2xl mx-auto">
          Join the elite athletes using the most connected AI platform on the market.
        </p>
        <div class="flex items-center justify-center">
          <UButton
            size="xl"
            to="/join"
            color="primary"
            class="w-full sm:w-auto font-black px-12 h-20 rounded-3xl text-xl sm:text-2xl shadow-[0_0_50px_rgba(34,197,94,0.4)] hover:scale-105 active:scale-95 transition-all"
            >Connect Your Apps</UButton
          >
        </div>
      </motion.div>
    </section>
  </div>
</template>

<style scoped>
  /* Premium layout rhythm helpers */
  section {
    position: relative;
    z-index: 1;
  }
  @keyframes breathing-pulse {
    0%,
    100% {
      opacity: 0.8;
      box-shadow: 0 0 60px rgba(34, 197, 94, 0.2);
    }
    50% {
      opacity: 1;
      box-shadow: 0 0 100px rgba(34, 197, 94, 0.4);
    }
  }

  .animate-breathing-pulse {
    animation: breathing-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
</style>
