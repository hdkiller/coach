<script setup lang="ts">
  import { motion } from 'motion-v'

  definePageMeta({
    layout: 'home',
    auth: false
  })

  useSeoMeta({
    title: 'Ecosystem & Integrations',
    description: 'Connect your favorite devices and platforms. We handle the data, you handle the training.'
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
      color: '#FC6100'
    },
    {
      name: 'Intervals.icu',
      category: 'platforms',
      src: '/images/logos/intervals.png',
      description: 'Deep-dive power analytics and seasonal planning.',
      status: '2-Key Sync',
      color: '#00DC82'
    },
    {
      name: 'Garmin Connect',
      category: 'hardware',
      src: '/images/logos/Garmin_Connect_app_1024x1024.png',
      description: 'Direct integration for health and activity data.',
      status: 'Instant Sync',
      color: '#007cc3'
    },
    {
      name: 'WHOOP',
      category: 'hardware',
      src: '/images/logos/whoop_square.svg',
      description: 'Incorporate recovery and sleep scores into your training.',
      status: 'Instant Sync',
      color: '#000000'
    },
    {
      name: 'Oura',
      category: 'hardware',
      src: '/images/logos/oura.svg',
      description: 'Monitor readiness and sleep cycles automatically.',
      status: 'Instant Sync',
      color: '#FFFFFF'
    },
    {
      name: 'ROUVY',
      category: 'virtual',
      src: '/images/logos/rouvy-symbol-rgb.svg',
      description: 'Analyze your virtual races with outdoor precision.',
      status: 'Instant Sync',
      color: '#E01E26'
    },
    {
      name: 'Fitbit',
      category: 'hardware',
      src: '/images/logos/fitbit_square.png',
      description: 'Track daily activity, sleep, and nutrition history.',
      status: 'Instant Sync',
      color: '#00B0B9'
    },
    {
      name: 'Polar',
      category: 'hardware',
      src: '/images/logos/polar_logo_square.png',
      description: 'Activities, sleep, and nightly recharge data.',
      status: 'Instant Sync',
      color: '#E31E24'
    },
    {
      name: 'Withings',
      category: 'hardware',
      src: '/images/logos/withings.png',
      description: 'Weight, body composition, and health metrics.',
      status: 'Instant Sync',
      color: '#000000'
    },
    {
      name: 'Yazio',
      category: 'platforms',
      src: '/images/logos/yazio_square.webp',
      description: 'Nutrition tracking and meal planning integration.',
      status: 'Instant Sync',
      color: '#EE5223'
    },
    {
      name: 'Hevy',
      category: 'platforms',
      src: '/images/logos/hevy-icon.png',
      description: 'Strength training and workout logging analysis.',
      status: 'Instant Sync',
      color: '#3069FE'
    },
    {
      name: 'Telegram',
      category: 'platforms',
      src: 'i-simple-icons-telegram',
      isIcon: true,
      description: 'Chat with your AI Coach on the go via Telegram Bot.',
      status: 'Instant Sync',
      color: '#26A5E4'
    }
  ]

  const filteredIntegrations = computed(() => {
    return integrations.filter((item) => {
      const matchesCategory = activeCategory.value === 'all' || item.category === activeCategory.value
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                           item.description.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchesCategory && matchesSearch
    })
  })

  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    const radius = 320 
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
</script>

<template>
  <div class="bg-gray-900 border-t border-gray-800 isolate">
    <!-- 1. Hero Section -->
    <section class="relative min-h-[85vh] flex items-center justify-center overflow-hidden py-20 px-6">
      <!-- Glow Backgrounds -->
      <div class="absolute left-1/4 top-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[120px] -z-10" />
      <div class="absolute right-1/4 bottom-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] -z-10" />

      <UContainer>
        <div class="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          <!-- Text Content -->
          <div class="flex-1 text-center lg:text-left z-10">
            <h1 class="text-5xl sm:text-7xl font-black uppercase tracking-tight text-white mb-8 leading-none">
              The Center of Your <br />
              <span class="text-primary-500">Performance</span> <br />
              Ecosystem.
            </h1>
            <p class="text-xl text-gray-400 max-w-xl mb-12 leading-relaxed">
              Connect your favorite devices and platforms. We handle the data, you handle the training.
            </p>
            <div class="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <UButton size="xl" to="/join" color="primary" class="font-bold px-8">Get Started</UButton>
              <UButton size="xl" variant="link" color="neutral" class="font-bold" to="/documentation">
                View API Docs <UIcon name="i-heroicons-arrow-up-right-20-solid" />
              </UButton>
            </div>
          </div>

          <!-- Hero Hub and Spoke Visual -->
          <div class="hidden lg:flex flex-1 relative items-center justify-center h-[700px]">
            <svg class="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 800 800">
               <g transform="translate(470, 350)">
                <motion.line
                  v-for="(integ, i) in integrations.slice(0, 8)"
                  :key="`line-${i}`"
                  :x1="0" :y1="0"
                  :x2="getPosition(i, 8).x"
                  :y2="getPosition(i, 8).y"
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
              class="relative z-20 w-40 h-40 bg-gray-950 rounded-[2.5rem] border-2 border-primary-500 shadow-[0_0_60px_rgba(34,197,94,0.4)] flex items-center justify-center p-8 translate-x-[70px]"
              :animate="{ scale: [1, 1.05, 1] }"
              :transition="{ duration: 4, repeat: Infinity, ease: 'easeInOut' }"
            >
              <img src="/media/logo_square.webp" alt="Coach Watts" class="w-full h-full object-contain" />
              <div class="absolute inset-0 rounded-[2.5rem] bg-primary-500/10 blur-2xl animate-pulse -z-10" />
            </motion.div>

             <div
              v-for="(integ, i) in integrations.slice(0, 8)"
              :key="integ.name"
              class="absolute left-1/2 top-1/2 translate-x-[20px]"
              :style="{
                transform: `translate(calc(-50% + ${getPosition(i, 8).x + 70}px), calc(-50% + ${getPosition(i, 8).y}px))`
              }"
            >
               <motion.div :variants="floatingVariants" animate="animate">
                  <div class="w-20 h-20 bg-gray-950/80 backdrop-blur-md rounded-2xl border border-gray-800/50 p-4 flex items-center justify-center translate-x-[70px]">
                    <UIcon v-if="integ.isIcon" :name="integ.src" class="w-full h-full object-contain" :style="{ color: integ.color }" />
                    <img v-else :src="integ.src" class="w-full h-full object-contain filter grayscale invert brightness-200 opacity-40 hover:grayscale-0 hover:invert-0 hover:brightness-100 hover:opacity-100 transition-all duration-500" />
                  </div>
               </motion.div>
             </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- 2. Categorized Integration Grid -->
    <section class="py-24 bg-gray-950/50 relative">
      <UContainer>
        <div class="flex flex-col md:flex-row items-end justify-between gap-8 mb-16 px-4">
          <div class="flex-1">
             <h2 class="text-3xl font-black uppercase text-white mb-6 tracking-tight">Our Ecosystem</h2>
             <div class="flex flex-wrap gap-2">
               <button 
                 v-for="cat in categories" 
                 :key="cat.id"
                 @click="activeCategory = cat.id"
                 class="px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 border"
                 :class="[
                   activeCategory === cat.id 
                     ? 'bg-primary-500 border-primary-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                     : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                 ]"
               >
                 {{ cat.label }}
               </button>
             </div>
          </div>
          <div class="w-full md:w-72">
            <UInput 
              v-model="searchQuery" 
              icon="i-heroicons-magnifying-glass" 
              placeholder="Search integrations..." 
              size="lg"
              variant="outline"
              :ui="{ base: 'rounded-2xl' }"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
          <transition-group
            enter-active-class="transition duration-500 ease-out"
            enter-from-class="opacity-0 translate-y-4"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-300 ease-in absolute"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <UCard
              v-for="integ in filteredIntegrations"
              :key="integ.name"
              class="relative group overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl backdrop-blur-md bg-white/5 border border-white/5 cursor-default"
              :ui="{
                root: 'rounded-[32px] overflow-visible',
                body: 'p-8'
              }"
            >
              <div class="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl group-hover:bg-primary-500/10 transition-colors pointer-events-none" />

              <div class="flex flex-col gap-6 relative z-10">
                <div class="flex items-center justify-between">
                  <div class="w-16 h-16 bg-gray-900 rounded-2xl border border-white/10 p-3 flex items-center justify-center">
                    <UIcon v-if="integ.isIcon" :name="integ.src" class="w-full h-full object-contain" :style="{ color: integ.color }" />
                    <img 
                      v-else
                      :src="integ.src" 
                      :alt="integ.name" 
                      class="w-full h-full object-contain filter grayscale invert brightness-150 opacity-50 group-hover:grayscale-0 group-hover:invert-0 group-hover:brightness-100 group-hover:opacity-100 transition-all duration-500" 
                    />
                  </div>
                  <div class="text-right">
                    <span 
                      class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    >
                      {{ integ.status }}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 class="text-xl font-black text-white uppercase tracking-tight mb-2">{{ integ.name }}</h3>
                  <p class="text-sm text-gray-400 leading-relaxed">{{ integ.description }}</p>
                </div>

                <div class="flex items-center gap-2 mt-2">
                  <span class="text-[10px] font-black text-primary-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Learn More</span>
                  <UIcon name="i-heroicons-arrow-right" class="w-3 h-3 text-primary-500 transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                </div>
              </div>
            </UCard>
          </transition-group>
        </div>
      </UContainer>
    </section>

    <!-- 3. Feature Showcase -->
    <section class="py-32 bg-gray-900">
      <UContainer>
        <!-- Feature 1: Biometric Overlay -->
        <div class="flex flex-col lg:flex-row items-center gap-16 mb-40">
           <div class="flex-1 order-2 lg:order-1">
             <div class="relative max-w-lg mx-auto">
                <div class="bg-gray-800/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative z-10">
                  <div class="flex items-center justify-between mb-8">
                    <span class="text-xs font-black text-white/50 uppercase tracking-widest">Training Adaptation</span>
                    <UIcon name="i-heroicons-bolt-solid" class="text-emerald-500 w-5 h-5" />
                  </div>
                  <div class="space-y-6">
                    <div class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div class="flex items-center gap-3">
                        <img src="/images/logos/oura.svg" class="w-6 h-6" />
                        <div>
                          <div class="text-[10px] font-bold text-white/40 uppercase">Readiness Score</div>
                          <div class="text-xl font-black text-white">84 / 100</div>
                        </div>
                      </div>
                      <UIcon name="i-heroicons-arrow-trending-up" class="text-emerald-500" />
                    </div>
                    <div class="p-6 bg-primary-500/10 rounded-2xl border border-primary-500/20">
                      <p class="text-sm text-emerald-400 font-bold mb-2">Coach Insight:</p>
                      <p class="text-sm text-white/80 leading-relaxed">
                        High recovery detected from Oura. Recommended intensity for today increased by +5%.
                      </p>
                    </div>
                  </div>
                </div>
                <div class="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl -z-10" />
                <div class="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-500/20 rounded-full blur-3xl -z-10" />
             </div>
           </div>
           <div class="flex-1 order-1 lg:order-2">
             <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-500 text-[10px] font-black uppercase tracking-widest mb-6">
               Intelligent Synergy
             </div>
             <h2 class="text-4xl sm:text-5xl font-black uppercase text-white mb-8 tracking-tighter leading-none">
               The Biometric <br /> <span class="text-emerald-500">Overlay.</span>
             </h2>
             <p class="text-lg text-gray-400 mb-8 leading-relaxed">
               We don't just import data; we correlate it. By combining your Garmin workout files with sleep and recovery metrics from Oura or WHOOP, our AI adjusts your training recommendations in real-time.
             </p>
             <ul class="space-y-4">
               <li v-for="item in ['Real-time Load Balancing', 'Automatic Intensity Scaling', 'Recovery-Aware Periodization']" :key="item" class="flex items-center gap-3 text-white/80 font-bold">
                 <div class="w-2 h-2 rounded-full bg-emerald-500" /> {{ item }}
               </li>
             </ul>
           </div>
        </div>

        <!-- Feature 2: One-Click Export -->
        <div class="flex flex-col lg:flex-row items-center gap-16">
          <div class="flex-1">
             <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase tracking-widest mb-6">
               Seamless Workflow
             </div>
             <h2 class="text-4xl sm:text-5xl font-black uppercase text-white mb-8 tracking-tighter leading-none">
               One-Click <br /> <span class="text-blue-500">Device Sync.</span>
             </h2>
             <p class="text-lg text-gray-400 mb-8 leading-relaxed">
               Stop manually typing power targets into your bike computer. Our AI models generate structured files that sync directly to your Intervals.icu calendar and compatible head units.
             </p>
          </div>
          <div class="flex-1 flex justify-center">
             <div class="bg-gray-800/80 backdrop-blur-xl rounded-[40px] border border-white/10 p-12 shadow-2xl relative w-full max-w-md">
                <div class="text-center mb-8">
                   <div class="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Finalizing Plan</div>
                   <div class="text-2xl font-black text-white tracking-tight">V02 Max Intervals</div>
                </div>
                <div class="space-y-4 mb-10">
                   <div class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-blue-500/50 transition-all cursor-pointer">
                      <div class="flex items-center gap-4">
                         <div class="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center border border-white/10">
                            <img src="/images/logos/intervals.png" class="w-6 h-6 object-contain" />
                         </div>
                         <span class="text-sm font-bold text-white">Push to Intervals</span>
                      </div>
                      <UIcon name="i-heroicons-cloud-arrow-up" class="text-white/40 group-hover:text-blue-500" />
                   </div>
                   <div class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-blue-500/50 transition-all cursor-pointer">
                      <div class="flex items-center gap-4">
                         <div class="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center border border-white/10">
                            <UIcon name="i-heroicons-bolt" class="text-blue-500" />
                         </div>
                         <span class="text-sm font-bold text-white">Export .FIT File</span>
                      </div>
                      <UIcon name="i-heroicons-arrow-down-tray" class="text-white/40 group-hover:text-blue-500" />
                   </div>
                </div>
                <div class="absolute -z-10 bg-blue-500/20 blur-[100px] w-full h-full inset-0 rounded-full" />
             </div>
          </div>
        </div>
      </UContainer>
    </section>

    <!-- Final CTA -->
    <section class="py-32 relative text-center px-6 overflow-hidden">
       <div class="max-w-3xl mx-auto">
          <h2 class="text-4xl sm:text-6xl font-black uppercase text-white mb-8 tracking-tighter">Ready to <span class="text-primary-500">Upgrade</span> <br />Your Training?</h2>
          <p class="text-xl text-gray-400 mb-12">Join the elite athletes using the most connected AI platform on the market.</p>
          <div class="flex flex-wrap items-center justify-center gap-6">
             <UButton size="xl" to="/join" color="primary" class="font-bold px-10 h-14 rounded-2xl text-lg shadow-[0_0_30px_rgba(34,197,94,0.4)]">Connect Your Apps</UButton>
          </div>
       </div>
    </section>
  </div>
</template>
