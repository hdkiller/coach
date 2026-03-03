<template>
  <div
    class="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary-500/30"
  >
    <!-- Starfield/Atmosphere Background -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,220,130,0.03)_0%,transparent_70%)]"
      />
      <div class="stars-container absolute inset-0 opacity-30 animate-slow-rotate">
        <div v-for="n in 30" :key="n" class="star" :style="generateStarStyle(n)" />
      </div>
    </div>

    <!-- Main Container -->
    <UContainer class="w-full max-w-7xl relative z-10 my-12">
      <div
        class="grid lg:grid-cols-12 rounded-[3.5rem] floating-card-base grain-overlay overflow-hidden border-white/10 shadow-2xl min-h-[720px]"
      >
        <!-- Left: Digital Twin Sidecar -->
        <div
          class="lg:col-span-5 relative bg-black/40 p-10 sm:p-14 flex flex-col justify-between overflow-hidden border-r border-white/5 min-h-[600px] lg:min-h-[720px] lg:aspect-[5/6]"
        >
          <!-- Dynamic Content -->
          <div class="relative z-10 h-full flex flex-col">
            <div class="mb-8 flex items-center gap-3">
              <div
                class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 shadow-[0_0_30px_rgba(0,0,0,0.2)] backdrop-blur-xl"
              >
                <div
                  class="w-8 h-8 rounded-xl bg-primary-500/15 flex items-center justify-center border border-primary-500/20"
                >
                  <UIcon name="i-heroicons-sparkles-solid" class="w-4 h-4 text-primary-500" />
                </div>
                <span class="text-[11px] font-black uppercase tracking-[0.28em] text-white/85"
                  >Coach Watts</span
                >
                <span
                  class="rounded-full border border-[#00C16A]/40 bg-[#00C16A]/15 px-2.5 py-1 text-[9px] font-black uppercase italic tracking-[0.32em] text-[#00C16A] shadow-[0_0_20px_rgba(0,193,106,0.2)]"
                >
                  Free
                </span>
              </div>
            </div>

            <h2
              class="text-3xl sm:text-4xl font-black italic font-athletic uppercase leading-[0.9] mb-4 tracking-tight text-white mb-8 mt-4"
            >
              {{ joinTitle }} <br />
              <span class="text-primary-500">{{ joinSubtitle }}</span>
            </h2>

            <p
              class="text-zinc-500 text-xs font-black uppercase tracking-[0.4em] mb-12 flex items-center gap-2"
            >
              <span class="w-8 h-px bg-white/10" />
              {{ joinTagline }}
            </p>

            <!-- Chat Simulation -->
            <div
              class="space-y-6 flex-grow overflow-y-auto min-h-[360px] max-h-[400px] scrollbar-hide py-4 flex flex-col justify-start"
            >
              <!-- User Message -->
              <motion.div
                :initial="{ opacity: 0, y: 10 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ delay: 0.2, duration: 0.6 }"
                class="flex justify-end"
              >
                <div
                  class="bg-white/[0.03] backdrop-blur-xl rounded-2xl rounded-tr-sm px-5 py-3 text-sm text-zinc-300 max-w-[85%] border border-white/5 shadow-2xl italic font-medium"
                >
                  "{{ userInquiry }}"
                </div>
              </motion.div>

              <!-- AI Response -->
              <motion.div
                :initial="{ opacity: 0, y: 10 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ delay: 0.8, duration: 0.6 }"
                class="flex justify-start items-end gap-4 mt-8"
              >
                <div
                  class="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0 border border-primary-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)] relative group"
                >
                  <UIcon
                    name="i-heroicons-sparkles-solid"
                    class="w-5 h-5 text-primary-500 relative z-10"
                  />
                  <!-- Breathing Glow Effect -->
                  <div
                    class="absolute inset-0 rounded-xl bg-primary-500/40 animate-pulse-slow blur-md opacity-30"
                  />
                  <div
                    class="absolute -inset-1 rounded-xl border border-primary-500/20 animate-ping-slow opacity-20"
                  />
                </div>

                <div class="flex flex-col gap-2 max-w-[85%]">
                  <!-- Muted Coach Label Above Bubble -->
                  <div
                    class="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500/50 ml-1"
                  >
                    Coach Watts System // Verified Output
                  </div>

                  <div
                    class="bg-white/5 backdrop-blur-[24px] rounded-2xl rounded-tl-sm px-6 py-5 text-sm text-white border border-white/10 shadow-2xl relative min-w-[200px] min-h-[148px] sm:min-h-[164px]"
                  >
                    <!-- Skeleton/Ghost State -->
                    <div v-if="isTyping" class="space-y-3 pt-1 animate-pulse">
                      <div
                        class="h-3 w-24 rounded-full bg-[#00C16A]/20 shadow-[0_0_20px_rgba(0,193,106,0.08)]"
                      />
                      <div class="h-3 w-full rounded-full bg-white/5" />
                      <div class="h-3 w-[92%] rounded-full bg-white/5" />
                      <div class="h-3 w-[68%] rounded-full bg-white/5" />
                      <!-- Typing dots inside skeleton -->
                      <div class="flex items-center gap-1.5 mt-4">
                        <div
                          class="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.3s]"
                        />
                        <div
                          class="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.15s]"
                        />
                        <div class="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" />
                      </div>
                    </div>

                    <!-- Content State -->
                    <div v-else class="animate-in fade-in slide-in-from-bottom-2 duration-1000">
                      <div class="relative z-10 leading-relaxed font-medium">
                        <p class="mb-3 text-zinc-200">
                          <span v-html="aiGreeting" />
                        </p>
                        <p class="text-white" v-html="aiAdvice" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <!-- Social Proof -->
            <div class="mt-auto pt-12 pb-2">
              <div
                class="p-6 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-sm relative overflow-hidden group"
              >
                <div class="flex items-center gap-4 mb-3">
                  <div class="flex -space-x-3">
                    <UAvatar
                      v-for="i in 3"
                      :key="i"
                      :src="`https://i.pravatar.cc/100?u=${i + 20}`"
                      size="2xs"
                      class="ring-2 ring-black border border-white/10"
                    />
                  </div>
                  <div class="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    <span class="text-primary-500 inline-flex items-center gap-1.5">
                      <span class="relative flex h-2 w-2">
                        <span
                          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"
                        />
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                      </span>
                      2,412
                    </span>
                    Athletes
                    <span class="group-hover:text-primary-500 transition-colors">Active Today</span>
                  </div>
                </div>
                <p
                  class="text-[10px] text-zinc-400 font-medium italic border-l border-primary-500/20 pl-4"
                >
                  "Coach Watts just saved my week. The digital twin identified my overtraining
                  before I even felt it."
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. The Signup Container -->
        <div
          class="lg:col-span-7 flex flex-col justify-center p-6 sm:p-12 lg:p-24 bg-black relative order-1 lg:order-2"
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
                Initialize Your <br class="hidden sm:block" />
                <span class="text-primary-500">Digital Twin</span>
              </h1>
              <p class="text-zinc-400 text-sm sm:text-lg max-w-md mx-auto lg:mx-0 font-medium pb-2">
                Start your evolution for free. No credit card, no commitment.
              </p>
            </div>

            <div class="space-y-8">
              <!-- Magnetic Google Button -->
              <div
                class="relative transition-transform duration-200"
                :style="{ transform: `translate(${buttonX}px, ${buttonY}px)` }"
                @mousemove="handleMouseMove"
                @mouseleave="resetPosition"
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
                    isInitializing ? 'CALIBRATING...' : joinGoogle
                  }}</span>
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"
                  />
                </UButton>
              </div>

              <p
                class="text-center lg:text-left text-[11px] font-black italic uppercase tracking-[0.18em] text-[#00C16A]"
              >
                {{ joinFreeForeverNote }}
              </p>

              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <span class="w-full border-t border-white/5" />
                </div>
                <div class="relative flex justify-center text-[10px]">
                  <span
                    class="bg-[#09090B] px-4 font-black uppercase tracking-[0.4em] text-zinc-600"
                    >{{ joinOnlyGoogle }}</span
                  >
                </div>
              </div>

              <!-- Trust Signals -->
              <div class="flex flex-col items-center gap-6 pt-4">
                <div
                  class="flex items-center gap-6 opacity-30 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-500 scale-90 sm:scale-100"
                >
                  <div class="flex items-center gap-1.5">
                    <UIcon
                      name="i-heroicons-shield-check-solid"
                      class="w-3.5 h-3.5 text-emerald-500"
                    />
                    <span class="text-[8px] font-black uppercase tracking-widest text-zinc-500"
                      >Secure 256-bit AES</span
                    >
                  </div>
                  <div class="flex items-center gap-1.5">
                    <UIcon
                      name="i-heroicons-lock-closed-solid"
                      class="w-3.5 h-3.5 text-emerald-500"
                    />
                    <span class="text-[8px] font-black uppercase tracking-widest text-zinc-500"
                      >Privacy Guaranteed</span
                    >
                  </div>
                </div>

                <div class="text-center space-y-6">
                  <p class="text-xs text-zinc-500 font-medium">
                    {{ joinAlreadyAccount }}
                    <NuxtLink
                      to="/login"
                      class="text-primary-500 hover:text-primary-400 transition-colors font-black uppercase tracking-widest text-[10px] ml-2"
                      >{{ joinLogin }}
                    </NuxtLink>
                  </p>

                  <p
                    class="text-[9px] text-zinc-500/60 leading-relaxed font-medium max-w-[300px] mx-auto"
                  >
                    {{ joinTermsAgree }}
                    <NuxtLink
                      to="/terms"
                      class="text-zinc-500 hover:text-white transition-colors border-b border-white/10"
                      >{{ joinTerms }}</NuxtLink
                    >
                    {{ joinAnd }}
                    <NuxtLink
                      to="/privacy"
                      class="text-zinc-500 hover:text-white transition-colors border-b border-white/10"
                      >{{ joinPrivacy }} </NuxtLink
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
                      Initializing <br />
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
                    <p class="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mt-6">
                      Syncing Biometric Nodes...
                    </p>
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
  import { motion } from 'motion-v'

  const { t } = useTranslate('auth')
  const { signIn } = useAuth()
  const route = useRoute()
  const toast = useToast()
  const { trackSignUp } = useAnalytics()

  definePageMeta({
    layout: 'home',
    middleware: ['guest'],
    auth: false
  })

  const callbackUrl = (route.query.callbackUrl as string) || '/dashboard'

  useSeoMeta({
    title: 'Initialize Your Digital Twin',
    ogTitle: 'Join Coach Watts - AI Endurance Coaching',
    description:
      'Start your evolution today. Create your Coach Watts account and access personalized AI training, recovery analytics, and daily coaching insights.',
    ogDescription:
      'Start your evolution today. Create your Coach Watts account and access personalized AI training, recovery analytics, and daily coaching insights.',
    ogImage: '/images/og-image.png',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Join Coach Watts - AI Endurance Coaching',
    twitterDescription:
      'Start your evolution today. Create your Coach Watts account and access personalized AI training, recovery analytics, and daily coaching insights.',
    twitterImage: '/images/og-image.png'
  })

  const loading = ref(false)
  const isInitializing = ref(false)
  const isTyping = ref(true)

  const translateOrFallback = (key: string, fallback: string, invalidValues: string[] = []) =>
    computed(() => {
      const translated = t.value(key)
      return translated === key || invalidValues.includes(translated) ? fallback : translated
    })

  const joinTitle = translateOrFallback('join.title', 'Initialize Your')
  const joinSubtitle = translateOrFallback('join.subtitle', 'Digital Twin')
  const joinTagline = translateOrFallback('join.tagline', 'Start your evolution today')
  const joinFormTitle = translateOrFallback('join.form_title', 'Get Started')
  const joinFormSubtitle = translateOrFallback(
    'join.form_subtitle',
    'Start your evolution for free. No credit card, no commitment.',
    ['Create your Coach Watts account. No credit card required.']
  )
  const joinGoogle = translateOrFallback('join.google', 'Create Account with Google')
  const joinFreeForeverNote = translateOrFallback(
    'join.free_forever_note',
    'Free forever with optional upgrades when you need more.'
  )
  const joinOnlyGoogle = translateOrFallback('join.only_google', 'Only Google Login supported')
  const joinAlreadyAccount = translateOrFallback('join.already_account', 'Already have an account?')
  const joinLogin = translateOrFallback('join.login', 'Log in')
  const joinTermsAgree = translateOrFallback('join.terms_agree', 'By continuing, you agree to our')
  const joinTerms = translateOrFallback('join.terms', 'Terms of Service')
  const joinAnd = translateOrFallback('join.and', 'and')
  const joinPrivacy = translateOrFallback('join.privacy', 'Privacy Policy')

  // Dynamic Chat Content
  const referral = computed(() => (route.query.ref as string) || '')

  const userInquiry = computed(() => {
    if (referral.value === 'hall-of-fame') {
      return 'I want to break my 5K personal best. Can you help?'
    }
    return t.value('join.user_message')
  })

  const aiGreeting = computed(() => {
    if (referral.value === 'hall-of-fame') {
      return 'Absolutely. I see your current best is 18:42 from last June.'
    }
    return "I noticed your <span class='text-[#00C16A] font-bold'>HRV</span> dropped to 28ms overnight. 📉"
  })

  const aiAdvice = computed(() => {
    if (referral.value === 'hall-of-fame') {
      return "Based on your current fatigue profile, we need to focus on <span class='font-bold text-[#00C16A] bg-[#00C16A]/10 px-1.5 py-0.5 rounded'>Threshold Intervals</span> this week to push that ceiling."
    }
    return "Let's swap your intervals for a <span class='font-bold text-[#00C16A] bg-[#00C16A]/10 px-1.5 py-0.5 rounded'>Zone 2 Recovery Ride</span>. We'll get back to intensity tomorrow."
  })

  onMounted(() => {
    setTimeout(() => {
      isTyping.value = false
    }, 1200)
  })

  // Starfield Generator
  const generateStarStyle = (n: number) => {
    return {
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.7 + 0.3,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${Math.random() * 3 + 2}s`
    }
  }

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
    isInitializing.value = true
    try {
      // Simulate technical delay for the animation
      await new Promise((resolve) => setTimeout(resolve, 1500))
      await signIn('google', { callbackUrl: '/' })
    } catch (error: any) {
      console.error('Login error:', error)
      isInitializing.value = false
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

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .animate-pulse-slow {
    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  .animate-ping-slow {
    animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
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
</style>
