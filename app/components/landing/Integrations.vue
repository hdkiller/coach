<script setup lang="ts">
  import { motion } from 'motion-v'
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('integrations')

  const integrations = [
    {
      name: 'Garmin',
      src: '/images/logos/Garmin_Connect_app_1024x1024.png',
      status: 'Auto-Import',
      color: '#007cc3'
    },
    {
      name: 'Strava',
      src: '/images/logos/strava.svg',
      status: '2-Way Sync',
      color: '#FC6100'
    },
    {
      name: 'Rouvy',
      src: '/images/logos/rouvy-symbol-rgb.svg',
      status: '2-Way Sync',
      color: '#E01E26'
    },
    {
      name: 'Intervals.icu',
      src: '/images/logos/intervals.png',
      status: '2-Way Sync',
      color: '#00DC82'
    },
    {
      name: 'WHOOP',
      src: '/images/logos/whoop_square.svg',
      status: '2-Way Sync',
      color: '#000000'
    },
    {
      name: 'Oura',
      src: '/images/logos/oura.svg',
      status: '2-Way Sync',
      color: '#FFFFFF'
    }
  ]

  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    const radius = 260 // Slightly smaller radius for better fit
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    }
  }

  // Cast to any to bypass strict motion-v variant typing issues in template
  const floatingVariants: any = {
    animate: {
      y: [0, -8, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: [0.45, 0.05, 0.55, 0.95]
      }
    }
  }
</script>

<template>
  <section class="relative py-24 sm:py-32 overflow-hidden bg-gray-900 isolate">
    <UContainer>
      <!-- Targeted Focal Glimmer -->
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-500/15 rounded-full blur-[80px] -z-10 pointer-events-none opacity-40"
      />

      <div class="text-center mb-16 relative z-10">
        <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-primary-500 mb-4">
          {{ t('label') }}
        </h2>
        <h3
          class="text-5xl sm:text-6xl font-black uppercase tracking-tight text-white mb-8 font-athletic italic leading-[0.85]"
        >
          Your Data, <span class="text-primary-500 tracking-[0.02em]">Unified.</span>
        </h3>
        <p class="max-w-2xl mx-auto text-xl text-gray-400 font-medium leading-relaxed">
          We sync seamlessly with the tools you already use. Stop jumping between apps and start
          seeing the full picture of your performance.
        </p>
      </div>

      <!-- Desktop: Hub and Spoke -->
      <div class="hidden lg:flex relative h-[650px] items-center justify-center">
        <!-- Connecting Lines SVG (Fixed size container for centering) -->
        <svg
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none overflow-visible"
          viewBox="0 0 800 800"
        >
          <g transform="translate(400, 400)">
            <motion.line
              v-for="(integ, i) in integrations"
              :key="`line-${i}`"
              :x1="0"
              :y1="0"
              :x2="getPosition(i, integrations.length).x"
              :y2="getPosition(i, integrations.length).y"
              stroke="currentColor"
              class="text-primary-500/10"
              stroke-width="1.5"
              stroke-dasharray="8 8"
              :initial="{ pathLength: 0, opacity: 0 }"
              :animate="{ pathLength: 1, opacity: 0.5 }"
              :transition="{ duration: 1.5, delay: i * 0.15, ease: 'easeOut' }"
            />
          </g>
        </svg>

        <!-- Central Hub -->
        <motion.div
          layout
          class="relative z-20 w-32 h-32 bg-black rounded-3xl shadow-[0_0_50px_rgba(34,197,94,0.2)] flex items-center justify-center p-6 bg-black/95 backdrop-blur-[12px] border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
          :animate="{ scale: [1, 1.03, 1] }"
          :transition="{ duration: 4, repeat: Infinity, ease: 'easeInOut' }"
        >
          <!-- 1px Gradient Border -->
          <div class="absolute inset-0 rounded-3xl p-px pointer-events-none z-50">
            <div
              class="w-full h-full rounded-3xl border border-white/10"
              style="
                border-image: linear-gradient(
                    to bottom right,
                    rgba(255, 255, 255, 0.15),
                    rgba(0, 220, 130, 0.4)
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
          <div class="absolute inset-0 rounded-3xl bg-primary-500/10 blur-xl animate-pulse -z-10" />
        </motion.div>

        <!-- Partner Logos -->
        <div
          v-for="(integ, i) in integrations"
          :key="integ.name"
          class="absolute left-1/2 top-1/2"
          :style="{
            transform: `translate(calc(-50% + ${getPosition(i, integrations.length).x}px), calc(-50% + ${getPosition(i, integrations.length).y}px))`
          }"
        >
          <motion.div
            :variants="floatingVariants"
            animate="animate"
            class="group relative flex flex-col items-center"
          >
            <!-- Logo Card -->
            <div
              class="relative w-24 h-24 bg-black/80 backdrop-blur-[12px] rounded-2xl p-5 transition-all duration-500 group-hover:bg-[#0c0e12] group-hover:shadow-[0_0_40px_rgba(34,197,94,0.15)] cursor-default flex items-center justify-center grain-overlay shadow-xl border-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
            >
              <!-- 1px Gradient Border Overlay -->
              <div class="absolute inset-0 rounded-2xl p-px pointer-events-none z-50">
                <div
                  class="w-full h-full rounded-2xl border border-white/10"
                  style="
                    border-image: linear-gradient(
                        to bottom right,
                        rgba(255, 255, 255, 0.1),
                        rgba(0, 220, 130, 0.3)
                      )
                      1;
                  "
                />
              </div>
              <img
                :src="integ.src"
                :alt="integ.name"
                class="w-full h-full object-contain filter grayscale opacity-30 transition-all duration-500 group-hover:grayscale-0 group-hover:invert-0 group-hover:brightness-100 group-hover:opacity-100 group-hover:scale-110"
                :class="{ 'invert brightness-200': integ.color === '#000000' || !integ.color }"
              />
            </div>

            <!-- Status Pill Area (Always present to avoid layout shift) -->
            <div class="h-6 mt-3 flex justify-center">
              <div
                class="px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/30 text-[9px] font-black uppercase tracking-widest text-primary-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 whitespace-nowrap"
              >
                {{ integ.status }}
              </div>
            </div>

            <!-- Label -->
            <span
              class="mt-1 text-xs font-black text-slate-500 group-hover:text-white transition-colors uppercase tracking-[0.2em]"
              >{{ integ.name }}</span
            >
          </motion.div>
        </div>
      </div>

      <!-- Mobile/Tablet Layout: Grid -->
      <div class="lg:hidden">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
          <motion.div
            v-for="(integ, i) in integrations"
            :key="`mobile-${integ.name}`"
            :initial="{ opacity: 0, y: 20 }"
            :while-in-view="{ opacity: 1, y: 0 }"
            :viewport="{ once: true }"
            :transition="{ delay: i * 0.1 }"
            class="group flex flex-col items-center p-8 bg-gray-950/40 rounded-3xl border border-white/5 hover:border-primary-500/30 transition-all duration-300 backdrop-blur-sm grain-overlay"
          >
            <div class="w-16 h-16 mb-4 flex items-center justify-center">
              <img
                :src="integ.src"
                :alt="integ.name"
                class="w-full h-full object-contain filter grayscale opacity-50 group-hover:grayscale-0 group-hover:invert-0 group-hover:brightness-100 group-hover:opacity-100 transition-all duration-500"
                :class="{ 'invert brightness-200': integ.color === '#000000' || !integ.color }"
              />
            </div>
            <div class="text-center">
              <p class="text-sm font-bold text-white mb-2 uppercase tracking-wide">
                {{ integ.name }}
              </p>
              <span class="text-[9px] font-black uppercase tracking-[0.15em] text-primary-500/90">{{
                integ.status
              }}</span>
            </div>
          </motion.div>
        </div>
      </div>

      <!-- CTA Link -->
      <div class="mt-20 text-center">
        <UButton
          to="/works-with"
          color="primary"
          variant="link"
          size="xl"
          class="font-black uppercase tracking-[0.2em] group"
        >
          Explore all 20+ integrations
          <UIcon
            name="i-heroicons-arrow-right-20-solid"
            class="w-5 h-5 transition-transform group-hover:translate-x-2"
          />
        </UButton>
      </div>
    </UContainer>
  </section>
</template>

<style scoped>
  /* No special styles needed but keeping block for consistent structure */
</style>
