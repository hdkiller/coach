<script setup lang="ts">
  import { motion } from 'motion-v'
  import BrandSection from '~/components/brand/BrandSection.vue'
  import BrandColorCard from '~/components/brand/BrandColorCard.vue'
  import BrandLogoCard from '~/components/brand/BrandLogoCard.vue'
  import BrandTypefaceCard from '~/components/brand/BrandTypefaceCard.vue'

  definePageMeta({
    layout: 'simple'
  })

  const logoDownloads = [
    { label: 'SVG', url: '/images/logo.svg', icon: 'i-heroicons-code-bracket' },
    { label: 'PNG', url: '/icon.png', icon: 'i-heroicons-photo' }
  ]

  const colors = [
    {
      name: 'Brand Green',
      hex: '#00DC82',
      tailwind: 'primary-400',
      usage:
        'Primary brand identifier. Used for accents, interactive elements, and key call-to-actions.'
    },
    {
      name: 'Action Green',
      hex: '#00C16A',
      tailwind: 'primary-500',
      usage: 'Deep green used for primary buttons and main brand highlights.'
    },
    {
      name: 'Deep Green',
      hex: '#00A155',
      tailwind: 'primary-600',
      usage: 'Used for hover states and dark mode accents.'
    }
  ]

  const neutralColors = [
    {
      name: 'Background (Light)',
      hex: '#FFFFFF',
      tailwind: 'white',
      usage: 'Primary background for light mode interfaces.'
    },
    {
      name: 'Background (Dark)',
      hex: '#09090b',
      tailwind: 'zinc-950',
      usage: 'Primary background for dark mode interfaces.'
    },
    {
      name: 'Text (Primary)',
      hex: '#09090b',
      tailwind: 'zinc-900',
      usage: 'Main body text and header color in light mode.'
    },
    {
      name: 'Text (Muted)',
      hex: '#71717a',
      tailwind: 'zinc-500',
      usage: 'Secondary text, subtitles, and labels.'
    }
  ]

  const linkCards = [
    {
      title: 'Naming',
      description: 'Guidelines on how to use the Coach Watts name in writing.',
      to: '#naming'
    },
    {
      title: 'Logo Selection',
      description: 'Choose the right logo format for your specific medium.',
      to: '#logos'
    },
    {
      title: 'Assets',
      description: 'Direct access to all brand assets for designers and partners.',
      to: '#downloads'
    }
  ]
</script>

<template>
  <div class="min-h-screen bg-white transition-colors duration-300">
    <Head>
      <Title>Brand Manual | Coach Watts</Title>
      <Meta
        name="description"
        content="Official brand guidelines and assets for Coach Watts endurance coaching platform."
      />
    </Head>

    <!-- Header / Nav -->
    <nav
      class="fixed top-0 left-0 right-0 z-50 bg-zinc-950/20 backdrop-blur-xl border-b border-white/5 px-6 py-4 transition-all duration-500"
    >
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="flex items-center gap-2 group">
            <div
              class="p-1 rounded-lg bg-primary-400/10 group-hover:bg-primary-400/20 transition-colors"
            >
              <img src="/images/logo.svg" alt="Coach Watts" class="h-8 w-auto" />
            </div>
            <span class="text-white text-lg font-black uppercase tracking-tight hidden sm:block"
              >Brand Manual</span
            >
          </NuxtLink>
        </div>
        <div class="flex items-center gap-6">
          <NuxtLink
            to="/"
            class="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >Back to Dashboard</NuxtLink
          >
          <UButton
            to="/images/logo.svg"
            download
            label="Download Logo"
            variant="solid"
            color="primary"
            size="sm"
            class="rounded-full px-6 shadow-lg shadow-primary-500/20"
          />
        </div>
      </div>
    </nav>

    <!-- Dark Upper Section -->
    <div class="pt-20 bg-zinc-950">
      <!-- Hero -->
      <BrandSection dark pattern>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.6 }"
          >
            <BrandLogoCard
              dark
              title="Logos"
              description="Our primary visual identifier. Use the appropriate version based on the background contrast."
              logo-src="/images/logo.svg"
              alt="Coach Watts Logo"
              background-class="bg-zinc-900 shadow-inner"
              :download-links="logoDownloads"
            />
          </motion.div>
          <motion.div
            class="lg:col-span-2"
            :initial="{ opacity: 0, y: 20 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.6, delay: 0.1 }"
          >
            <BrandTypefaceCard
              dark
              font-name="Public Sans"
              description="A strong, neutral, yet friendly sans-serif that reflects our commitment to clarity and professional results."
            />
          </motion.div>
        </div>

        <motion.div
          class="mt-8"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :transition="{ duration: 0.8, delay: 0.2 }"
        >
          <h2 class="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 mb-6">
            Primary Brand Colors
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BrandColorCard v-for="color in colors" :key="color.hex" dark v-bind="color" />
          </div>
        </motion.div>
      </BrandSection>
    </div>

    <!-- Light Lower Section -->
    <div class="bg-white">
      <BrandSection
        title="Guidelines & Resources"
        description="Comprehensive rules for maintaining brand consistency across all platforms."
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <NuxtLink
            v-for="card in linkCards"
            :key="card.title"
            :to="card.to"
            class="group p-8 rounded-2xl border border-zinc-100 hover:border-primary-400 hover:shadow-xl transition-all duration-300"
          >
            <h3
              class="text-xl font-black uppercase tracking-tight mb-2 group-hover:text-primary-600 transition-colors"
            >
              {{ card.title }}
            </h3>
            <p class="text-zinc-500 text-sm leading-relaxed mb-6">
              {{ card.description }}
            </p>
            <div class="flex items-center text-primary-500 font-bold text-sm tracking-tight">
              Learn More
              <UIcon
                name="i-heroicons-arrow-right"
                class="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1"
              />
            </div>
          </NuxtLink>
        </div>

        <div
          id="naming"
          class="grid grid-cols-1 lg:grid-cols-12 gap-12 pt-16 border-t border-zinc-100"
        >
          <div class="lg:col-span-4">
            <h3 class="text-2xl font-black uppercase tracking-tight mb-4">Naming Convention</h3>
            <p class="text-zinc-500 text-sm leading-relaxed">
              Correct usage of our brand name is crucial for identity and legal protection.
            </p>
          </div>
          <div class="lg:col-span-8 space-y-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div class="p-6 rounded-xl bg-zinc-50 border border-zinc-100">
                <div class="flex items-center gap-2 mb-4">
                  <div class="w-2 h-2 rounded-full bg-emerald-500" />
                  <span class="text-[10px] font-black uppercase tracking-widest text-emerald-600"
                    >Correct</span
                  >
                </div>
                <p class="text-2xl font-black tracking-tight mb-2">Coach Watts</p>
                <p class="text-zinc-500 text-sm">
                  Two words, capitalized. "Coach" followed by "Watts".
                </p>
              </div>
              <div class="p-6 rounded-xl bg-zinc-50 border border-zinc-100 opacity-60">
                <div class="flex items-center gap-2 mb-4">
                  <div class="w-2 h-2 rounded-full bg-red-500" />
                  <span class="text-[10px] font-black uppercase tracking-widest text-red-600"
                    >Avoid</span
                  >
                </div>
                <p class="text-xl font-medium tracking-tight mb-2 italic">
                  CoachWatts, coachwatts, CW
                </p>
                <p class="text-zinc-500 text-sm">
                  Do not combine words, use lowercase, or use informal abbreviations in official
                  copy.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div id="downloads" class="mt-24">
          <h2 class="text-3xl font-black uppercase tracking-tight mb-4">Neutral Palette</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <BrandColorCard v-for="color in neutralColors" :key="color.hex" v-bind="color" />
          </div>
        </div>
      </BrandSection>
    </div>

    <!-- Footer -->
    <footer class="bg-zinc-50 border-t border-zinc-100 py-12 px-6">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-8">
        <div class="flex items-center gap-4">
          <img src="/images/logo.svg" alt="Coach Watts" class="h-6 w-auto grayscale opacity-50" />
          <p class="text-zinc-400 text-sm">© 2026 Coach Watts. All rights reserved.</p>
        </div>
        <div class="flex items-center gap-8">
          <NuxtLink
            to="/terms"
            class="text-zinc-400 hover:text-zinc-900 text-xs font-medium uppercase tracking-widest"
            >Terms</NuxtLink
          >
          <NuxtLink
            to="/privacy"
            class="text-zinc-400 hover:text-zinc-900 text-xs font-medium uppercase tracking-widest"
            >Privacy</NuxtLink
          >
          <NuxtLink
            to="/chat"
            class="text-zinc-400 hover:text-zinc-900 text-xs font-medium uppercase tracking-widest"
            >Chat</NuxtLink
          >
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
  /* Ensure custom fonts if not already globally loaded */
  :deep(.font-public-sans) {
    font-family: 'Public Sans', sans-serif;
  }
</style>
