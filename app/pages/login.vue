<template>
  <div
    class="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-0 lg:p-6 relative overflow-hidden selection:bg-primary-500/30"
  >
    <!-- Starfield/Atmosphere Background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,220,130,0.03)_0%,transparent_70%)]"
      />
      <div class="stars-container absolute inset-0 opacity-30 animate-slow-rotate">
        <div v-for="(style, index) in starStyles" :key="index" class="star" :style="style" />
      </div>
    </div>

    <!-- Main Container -->
    <UContainer class="w-full max-w-7xl relative z-10 my-0 lg:my-12 px-0 lg:px-6">
      <div
        class="grid lg:grid-cols-12 rounded-none lg:rounded-[3.5rem] floating-card-base grain-overlay overflow-hidden border-white/10 shadow-2xl min-h-screen lg:min-h-[720px]"
      >
        <!-- Left: Digital Twin Sidecar (Neural Mesh) -->
        <div
          class="hidden lg:flex lg:col-span-5 relative bg-black/40 p-10 sm:p-14 flex flex-col justify-between overflow-hidden border-t lg:border-t-0 lg:border-r border-white/5 min-h-[600px] lg:min-h-[720px] lg:aspect-[5/6] order-2 lg:order-1"
        >
          <div class="relative z-10 h-full flex flex-col">
            <h2
              class="text-3xl sm:text-4xl font-black italic font-athletic uppercase leading-[0.9] mb-4 tracking-tight text-white mb-8 mt-4"
            >
              YOUR DIGITAL <br />
              <span class="text-primary-500">TWIN AWAITS</span>
            </h2>

            <!-- Neural Mesh Visualization -->
            <div class="flex-grow flex flex-col justify-center -mt-12 relative">
              <div
                class="relative h-64 w-full transition-all duration-1000 ease-out"
                :class="isHovering ? 'scale-110' : 'scale-100'"
              >
                <svg class="w-full h-full overflow-visible" viewBox="0 0 400 300">
                  <!-- Connection Lines -->
                  <g class="mesh-lines opacity-20" :class="{ 'opacity-40': isHovering }">
                    <line
                      v-for="(line, i) in meshConnections"
                      :key="`l-${i}`"
                      :x1="meshNodes[line.from]?.x ?? 0"
                      :y1="meshNodes[line.from]?.y ?? 0"
                      :x2="meshNodes[line.to]?.x ?? 0"
                      :y2="meshNodes[line.to]?.y ?? 0"
                      class="stroke-primary-500/30 transition-all duration-700"
                      stroke-width="0.5"
                    />
                  </g>

                  <!-- Data Packets (Traveling Pulses) -->
                  <g class="active-pulses">
                    <circle
                      v-for="(pulse, i) in activePulses"
                      :key="`p-${i}`"
                      r="1.2"
                      class="fill-primary-500 shadow-[0_0_10px_rgba(0,193,106,0.8)]"
                      :style="{
                        animation: `mesh-travel ${pulse.duration}s linear infinite`,
                        animationDelay: `${pulse.delay}s`,
                        offsetPath:
                          meshNodes[pulse.from] && meshNodes[pulse.to]
                            ? `path('M ${meshNodes[pulse.from]?.x} ${meshNodes[pulse.from]?.y} L ${meshNodes[pulse.to]?.x} ${meshNodes[pulse.to]?.y}')`
                            : 'none'
                      }"
                    />
                  </g>

                  <!-- Nodes -->
                  <g
                    v-for="(node, i) in meshNodes"
                    :key="`n-${i}`"
                    class="mesh-node-group transition-transform duration-[3s]"
                    :style="{ transform: `translate(${node.dx}px, ${node.dy}px)` }"
                  >
                    <circle
                      :cx="node.x"
                      :cy="node.y"
                      r="2"
                      class="fill-white/20 transition-all duration-500"
                      :class="{ 'fill-primary-500/80 r-3': isHovering }"
                    />
                    <circle
                      v-if="i % 3 === 0"
                      :cx="node.x"
                      :cy="node.y"
                      r="4"
                      class="fill-primary-500/20 animate-ping opacity-40"
                      :style="{ animationDuration: '4s', animationDelay: `${i * 0.5}s` }"
                    />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: The Login Container -->
        <div
          class="lg:col-span-7 flex flex-col justify-center p-8 sm:p-14 lg:p-24 bg-black relative order-1 lg:order-2"
        >
          <!-- Inner Glow -->
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(0,220,130,0.02)_0%,transparent_70%)]"
          />

          <div class="max-w-md mx-auto w-full relative z-10">
            <div class="mb-10 text-center lg:text-left">
              <h1
                class="text-4xl sm:text-6xl font-black italic font-athletic uppercase text-white leading-[0.85] mb-6 tracking-tighter"
              >
                Welcome <br class="hidden sm:block" />
                <span class="text-primary-500">Back</span>
              </h1>
              <p class="text-zinc-400 text-sm sm:text-lg max-w-md mx-auto lg:mx-0 font-medium pb-2">
                Re-initialize your evolution.
              </p>
            </div>

            <div class="space-y-4">
              <!-- Magnetic Google Button -->
              <div
                v-if="googleEnabled"
                class="relative transition-transform duration-200"
                :style="{ transform: `translate(${buttonX}px, ${buttonY}px)` }"
                @mousemove="handleMouseMove"
                @mouseleave="resetPosition"
                @mouseenter="isHovering = true"
                @mouseout="isHovering = false"
              >
                <UButton
                  block
                  size="xl"
                  icon="i-simple-icons-google"
                  color="primary"
                  variant="solid"
                  class="relative overflow-hidden group shadow-[0_0_30px_rgba(0,220,130,0.1)] py-5 rounded-2xl h-14 min-w-full"
                  :loading="loading || isInitializing"
                  @click="handleGoogleLogin"
                >
                  <span class="relative z-10 font-black uppercase tracking-[0.2em] text-[11px]">{{
                    isInitializing ? 'CONNECTING...' : t('login.google')
                  }}</span>
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"
                  />
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shine pointer-events-none"
                  />
                </UButton>
              </div>

              <!-- Strava Button -->
              <UButton
                v-if="stravaEnabled"
                block
                size="xl"
                color="neutral"
                variant="outline"
                class="relative overflow-hidden group border-white/10 hover:border-white/20 py-5 rounded-2xl h-14 min-w-full hover:shadow-[0_0_20px_rgba(252,76,2,0.1)] transition-all duration-300"
                :loading="loadingStrava || isInitializing"
                @click="handleStravaLogin"
                @mouseenter="isHovering = true"
                @mouseleave="isHovering = false"
              >
                <template #leading>
                  <UIcon
                    name="i-simple-icons-strava"
                    class="w-5 h-5 text-[#FC4C02] group-hover:scale-110 transition-transform"
                  />
                </template>
                <span
                  class="relative z-10 font-black uppercase tracking-[0.2em] text-[11px] text-white"
                >
                  {{ isInitializing ? 'CONNECTING...' : t('login.strava') }}
                </span>
                <div
                  class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shine [animation-delay:1s] pointer-events-none"
                />
              </UButton>

              <!-- Intervals.icu Button -->
              <UButton
                v-if="intervalsEnabled"
                block
                size="xl"
                color="neutral"
                variant="outline"
                class="relative overflow-hidden group border-white/10 hover:border-white/20 py-5 rounded-2xl h-14 min-w-full hover:shadow-[0_0_20px_rgba(0,220,130,0.1)] transition-all duration-300"
                :loading="loadingIntervals || isInitializing"
                @click="handleIntervalsLogin"
                @mouseenter="isHovering = true"
                @mouseleave="isHovering = false"
              >
                <template #leading>
                  <img
                    src="/images/logos/intervals.png"
                    alt="Intervals.icu Logo"
                    class="w-5 h-5 group-hover:scale-110 transition-transform"
                  />
                </template>
                <span
                  class="relative z-10 font-black uppercase tracking-[0.2em] text-[11px] text-white"
                >
                  {{ isInitializing ? 'CONNECTING...' : t('login.intervals') }}
                </span>
                <div
                  class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shine [animation-delay:2s] pointer-events-none"
                />
              </UButton>

              <UButton
                v-if="oidcProviderEnabled"
                block
                size="xl"
                color="neutral"
                variant="outline"
                class="relative overflow-hidden group border-white/10 hover:border-white/20 py-5 rounded-2xl h-14 min-w-full hover:shadow-[0_0_20px_rgba(255,255,255,0.08)] transition-all duration-300"
                :loading="loadingOidc || isInitializing"
                @click="handleOidcLogin"
                @mouseenter="isHovering = true"
                @mouseleave="isHovering = false"
              >
                <template #leading>
                  <UIcon
                    name="i-heroicons-building-office-2"
                    class="w-5 h-5 text-white/70 group-hover:scale-110 transition-transform"
                  />
                </template>
                <span
                  class="relative z-10 font-black uppercase tracking-[0.2em] text-[11px] text-white"
                >
                  {{ isInitializing ? 'CONNECTING...' : `Continue with ${oidcProviderName}` }}
                </span>
                <div
                  class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shine [animation-delay:3s] pointer-events-none"
                />
              </UButton>

              <div class="relative py-4">
                <div class="absolute inset-0 flex items-center">
                  <span class="w-full border-t border-white/5" />
                </div>
                <div class="relative flex justify-center text-[10px]">
                  <span
                    class="bg-black px-4 font-black uppercase tracking-[0.4em] text-zinc-600 flex items-center gap-2"
                  >
                    <UIcon name="i-heroicons-lock-closed-solid" class="w-3 h-3" />
                    Secure OAuth Login
                  </span>
                </div>
              </div>

              <!-- Trust Signals -->
              <div class="flex flex-col items-center gap-6 pt-2">
                <div
                  class="flex items-center gap-6 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 scale-90 sm:scale-100"
                >
                  <div class="flex items-center gap-1.5">
                    <UIcon
                      name="i-heroicons-shield-check-solid"
                      class="w-3.5 h-3.5 text-emerald-500"
                    />
                    <span class="text-[8px] font-black uppercase tracking-widest text-zinc-500"
                      >SSL Encrypted</span
                    >
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon name="i-heroicons-key-solid" class="w-3.5 h-3.5 text-emerald-500" />
                    <span class="text-[8px] font-black uppercase tracking-widest text-zinc-500"
                      >256-bit AES</span
                    >
                  </div>
                </div>

                <div class="text-center space-y-6">
                  <p class="text-xs text-zinc-500 font-medium">
                    {{ t('login.new_athlete') }}
                    <NuxtLink
                      to="/join"
                      class="text-primary-500 hover:text-primary-400 transition-colors font-black uppercase tracking-widest text-[10px] ml-2"
                      >{{ t('login.create_account') }}
                    </NuxtLink>
                  </p>

                  <p
                    class="text-[9px] text-zinc-500/60 leading-relaxed font-medium max-w-[300px] mx-auto"
                  >
                    {{ t('login.terms_agree') }}
                    <NuxtLink
                      to="/terms"
                      class="text-zinc-500 hover:text-white transition-colors border-b border-white/10"
                      >{{ t('login.terms') }}</NuxtLink
                    >
                    {{ t('login.and') }}
                    <NuxtLink
                      to="/privacy"
                      class="text-zinc-500 hover:text-white transition-colors border-b border-white/10"
                      >{{ t('login.privacy') }} </NuxtLink
                    >.
                  </p>
                </div>
              </div>
            </div>

            <!-- Initialization Overlay -->
            <transition
              enter-active-class="transition duration-1000 ease-out"
              enter-from-class="opacity-0 backdrop-blur-0"
              enter-to-class="opacity-100 backdrop-blur-2xl"
              leave-active-class="transition duration-500 ease-in"
              leave-from-class="opacity-100 backdrop-blur-2xl"
              leave-to-class="opacity-0 backdrop-blur-0"
            >
              <div
                v-if="isInitializing"
                class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl"
              >
                <div class="text-center space-y-8 p-12 max-w-sm">
                  <div class="relative w-24 h-24 mx-auto mb-12">
                    <div
                      class="absolute inset-0 rounded-3xl bg-primary-500/20 animate-ping opacity-20"
                    />
                    <div
                      class="absolute inset-0 rounded-3xl border-2 border-primary-500/50 flex items-center justify-center"
                    >
                      <UIcon
                        name="i-heroicons-cpu-chip"
                        class="w-12 h-12 text-primary-500 animate-pulse"
                      />
                    </div>
                  </div>
                  <div class="space-y-4">
                    <h3
                      class="text-2xl font-black italic font-athletic uppercase text-white tracking-widest"
                    >
                      Re-initializing <br />
                      <span class="text-primary-500">Digital Twin</span>
                    </h3>
                    <div class="flex items-center justify-center gap-1">
                      <div
                        v-for="i in 3"
                        :key="i"
                        class="w-1.5 h-1.5 rounded-full bg-primary-500 animate-bounce"
                        :style="{ animationDelay: `${i * 0.15}s` }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  const { t } = useTranslate('auth')
  const { signIn } = useAuth()
  const route = useRoute()
  const toast = useToast()
  const { trackLogin } = useAnalytics()
  const runtimeConfig = useRuntimeConfig()

  definePageMeta({
    layout: 'home',
    middleware: ['guest'],
    auth: false
  })

  const callbackUrl = (route.query.callbackUrl as string) || '/dashboard'
  const allowedProviders = computed(() => runtimeConfig.public.authAllowedProviders || [])
  const isProviderAllowed = (providerId: string) => {
    return allowedProviders.value.length === 0 || allowedProviders.value.includes(providerId)
  }
  const googleEnabled = computed(() => isProviderAllowed('google'))
  const stravaEnabled = computed(
    () => runtimeConfig.public.stravaEnabled && isProviderAllowed('strava')
  )
  const intervalsEnabled = computed(() => isProviderAllowed('intervals'))
  const oidcProviderEnabled = computed(
    () => runtimeConfig.public.authOidcEnabled && isProviderAllowed(oidcProviderId.value)
  )
  const oidcProviderId = computed(() => runtimeConfig.public.authOidcProviderId || 'oidc')
  const oidcProviderName = computed(
    () => runtimeConfig.public.authOidcProviderName || oidcProviderId.value
  )

  useSeoMeta({
    title: 'Welcome Back | Coach Watts',
    ogTitle: 'Login - Coach Watts AI Endurance Coaching',
    description:
      'Re-initialize your digital twin and access your personalized AI training dashboard.',
    ogDescription:
      'Re-initialize your digital twin and access your personalized AI training dashboard.',
    ogImage: '/images/og-image.png',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Login - Coach Watts AI Endurance Coaching',
    twitterDescription:
      'Re-initialize your digital twin and access your personalized AI training dashboard.',
    twitterImage: '/images/og-image.png'
  })

  const loading = ref(false)
  const loadingStrava = ref(false)
  const loadingIntervals = ref(false)
  const loadingOidc = ref(false)
  const isInitializing = ref(false)
  const isHovering = ref(false)
  const starStyles = ref<any[]>([])

  // Mesh Visualization Data
  const meshNodes = ref([
    { x: 100, y: 100, dx: 0, dy: 0 },
    { x: 250, y: 50, dx: 0, dy: 0 },
    { x: 350, y: 120, dx: 0, dy: 0 },
    { x: 300, y: 250, dx: 0, dy: 0 },
    { x: 150, y: 280, dx: 0, dy: 0 },
    { x: 50, y: 200, dx: 0, dy: 0 },
    { x: 200, y: 150, dx: 0, dy: 0 },
    { x: 220, y: 220, dx: 0, dy: 0 },
    { x: 80, y: 50, dx: 0, dy: 0 },
    { x: 380, y: 40, dx: 0, dy: 0 }
  ])

  const meshConnections = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 5 },
    { from: 5, to: 0 },
    { from: 6, to: 0 },
    { from: 6, to: 1 },
    { from: 6, to: 2 },
    { from: 7, to: 3 },
    { from: 7, to: 4 },
    { from: 7, to: 6 },
    { from: 8, to: 0 },
    { from: 8, to: 1 },
    { from: 9, to: 2 }
  ]

  const activePulses = ref<any[]>([])

  onMounted(() => {
    // Generate star styles
    starStyles.value = Array.from({ length: 30 }).map(() => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.7 + 0.3,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${Math.random() * 3 + 2}s`
    }))

    // Generate randomized pulses
    activePulses.value = Array.from({ length: 6 }).map(() => {
      const conn = meshConnections[Math.floor(Math.random() * meshConnections.length)]
      return {
        ...conn,
        duration: Math.random() * 2 + 2,
        delay: Math.random() * 3
      }
    })

    // Start mesh drift animation
    setInterval(() => {
      meshNodes.value.forEach((node) => {
        node.dx = (Math.random() - 0.5) * 15
        node.dy = (Math.random() - 0.5) * 15
      })

      // Randomize pulses again
      activePulses.value = activePulses.value.map(() => {
        const conn = meshConnections[Math.floor(Math.random() * meshConnections.length)]
        return {
          ...conn,
          duration: Math.random() * 2 + 2,
          delay: Math.random() * 3
        }
      })
    }, 4000)
  })

  // Magnetic Button Logic
  const buttonX = ref(0)
  const buttonY = ref(0)
  const handleMouseMove = (e: MouseEvent) => {
    const btn = e.currentTarget as HTMLElement
    const rect = btn.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    buttonX.value = x * 0.2
    buttonY.value = y * 0.2
  }
  const resetPosition = () => {
    buttonX.value = 0
    buttonY.value = 0
  }

  async function handleGoogleLogin() {
    trackLogin('google')
    isInitializing.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await signIn('google', { callbackUrl })
    } catch (error: any) {
      toast.add({
        title: 'Login Failed',
        description: error.message || 'Could not initiate Google login.',
        color: 'error'
      })
      isInitializing.value = false
    }
  }

  async function handleStravaLogin() {
    trackLogin('strava')
    isInitializing.value = true
    loadingStrava.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await signIn('strava', { callbackUrl })
    } catch (error: any) {
      toast.add({
        title: 'Login Failed',
        description: error.message || 'Could not initiate Strava login.',
        color: 'error'
      })
      isInitializing.value = false
      loadingStrava.value = false
    }
  }

  async function handleIntervalsLogin() {
    trackLogin('intervals')
    isInitializing.value = true
    loadingIntervals.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await signIn('intervals', { callbackUrl })
    } catch (error: any) {
      toast.add({
        title: 'Login Failed',
        description: error.message || 'Could not initiate Intervals login.',
        color: 'error'
      })
      isInitializing.value = false
      loadingIntervals.value = false
    }
  }

  async function handleOidcLogin() {
    trackLogin(oidcProviderId.value)
    isInitializing.value = true
    loadingOidc.value = true
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await signIn(oidcProviderId.value, { callbackUrl })
    } catch (error: any) {
      toast.add({
        title: 'Login Failed',
        description: error.message || `Could not initiate ${oidcProviderName.value} login.`,
        color: 'error'
      })
      isInitializing.value = false
      loadingOidc.value = false
    }
  }
</script>

<style scoped>
  .stars-container {
    position: absolute;
    inset: 0;
  }
  .star {
    position: absolute;
    width: 2px;
    height: 2px;
    background-color: white;
    border-radius: 50%;
    animation: twinkle linear infinite;
  }
  @keyframes twinkle {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.5);
    }
  }
  @keyframes slowRotate {
    0% {
      transform: rotate(0deg) scale(1.2);
    }
    100% {
      transform: rotate(360deg) scale(1.2);
    }
  }
  .animate-slow-rotate {
    animation: slowRotate 240s linear infinite;
  }
  .animate-pulse-slow {
    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.1;
      transform: scale(0.8);
    }
    50% {
      opacity: 0.4;
      transform: scale(1.2);
    }
  }
  @keyframes shine {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(200%);
    }
  }
  .animate-shine {
    animation: shine 5s infinite;
  }

  /* Mesh Animations */
  @keyframes mesh-travel {
    0% {
      offset-distance: 0%;
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      offset-distance: 100%;
      opacity: 0;
    }
  }
</style>
