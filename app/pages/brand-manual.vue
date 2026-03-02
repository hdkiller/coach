<script setup lang="ts">
  import { motion } from 'motion-v'
  import BrandSection from '~/components/brand/BrandSection.vue'
  import BrandColorCard from '~/components/brand/BrandColorCard.vue'
  import BrandLogoCard from '~/components/brand/BrandLogoCard.vue'
  import BrandTypefaceCard from '~/components/brand/BrandTypefaceCard.vue'

  definePageMeta({
    layout: false
  })

  const logoDownloads = [
    {
      label: 'WebP (Full Wordmark)',
      url: '/media/coach_watts_text_cropped.webp',
      icon: 'i-heroicons-paper-clip'
    },
    {
      label: 'WebP (Square Symbol)',
      url: '/media/logo.webp',
      icon: 'i-heroicons-square-3-stack-3d'
    }
  ]

  const colors = [
    {
      name: 'Brand Green',
      hex: '#00DC82',
      tailwind: 'primary-400',
      variable: '--color-primary-400',
      contrast: '11.1:1',
      usage:
        'Primary brand identifier. Used for accents, interactive elements, and key call-to-actions.'
    },
    {
      name: 'Action Green',
      hex: '#00C16A',
      tailwind: 'primary-500',
      variable: '--color-primary-500',
      contrast: '8.8:1',
      usage: 'Deep green used for primary buttons and main brand highlights.'
    },
    {
      name: 'Deep Green',
      hex: '#00A155',
      tailwind: 'primary-600',
      variable: '--color-primary-600',
      contrast: '6.1:1',
      usage: 'Used for hover states and dark mode accents.'
    }
  ]

  const neutralColors = [
    {
      name: 'Background (Dark)',
      hex: '#09090B',
      tailwind: 'zinc-950',
      variable: '--color-zinc-950',
      contrast: '1:1',
      usage: 'Primary background for the high-performance dark interface.'
    },
    {
      name: 'Card Base',
      hex: '#111111',
      tailwind: 'zinc-900',
      variable: '--color-zinc-900',
      contrast: '1.2:1',
      usage: 'Standard card background color for floating components.'
    },
    {
      name: 'Text (Primary)',
      hex: '#FFFFFF',
      tailwind: 'white',
      variable: '--color-white',
      contrast: '21:1',
      usage: 'Main body text and header color for maximum readability.'
    },
    {
      name: 'Text (Muted)',
      hex: '#71717A',
      tailwind: 'zinc-500',
      variable: '--color-zinc-500',
      contrast: '4.5:1',
      usage: 'Secondary text, subtitles, and labels.'
    }
  ]

  const sections = [
    { id: 'identity', label: 'Identity', icon: 'i-heroicons-identification' },
    { id: 'colors', label: 'Colors', icon: 'i-heroicons-swatch' },
    { id: 'typography', label: 'Typography', icon: 'i-heroicons-language' },
    { id: 'assets', label: 'Assets', icon: 'i-heroicons-photo' },
    { id: 'naming', label: 'Naming', icon: 'i-heroicons-pencil-square' },
    { id: 'specs', label: 'Specs', icon: 'i-heroicons-document-text' }
  ]

  const activeSection = ref('identity')

  onMounted(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            activeSection.value = entry.target.id
          }
        })
      },
      { threshold: [0.5] }
    )

    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
  })

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 100,
        behavior: 'smooth'
      })
    }
  }
</script>

<template>
  <div class="min-h-screen bg-[#09090B] text-zinc-400 selection:bg-primary-500/30">
    <Head>
      <Title>Design System | Coach Watts</Title>
      <Meta
        name="description"
        content="Coach Watts Design System - Guidelines, assets, and technical specifications."
      />
    </Head>

    <!-- Header / Nav -->
    <nav
      class="fixed top-0 left-0 right-0 z-50 bg-[#09090B]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4"
    >
      <div class="max-w-[1600px] mx-auto flex justify-between items-center">
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="flex items-center gap-3 group">
            <div
              class="p-1 rounded-lg bg-primary-400/10 group-hover:bg-primary-400/20 transition-all duration-300"
            >
              <img src="/media/logo.webp" alt="Coach Watts" class="h-8 w-8 object-contain" />
            </div>
            <div class="flex flex-col">
              <span class="text-white text-lg font-black uppercase tracking-tight leading-none"
                >Coach Watts</span
              >
              <span class="text-[10px] font-bold uppercase tracking-[0.3em] text-primary-500"
                >Design System</span
              >
            </div>
          </NuxtLink>
        </div>

        <div class="flex items-center gap-6">
          <div
            class="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5"
          >
            <button
              v-for="s in sections"
              :key="s.id"
              class="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              :class="
                activeSection === s.id
                  ? 'bg-primary-500 text-black shadow-lg shadow-primary-500/20'
                  : 'hover:bg-white/5 text-zinc-400 hover:text-white'
              "
              @click="scrollTo(s.id)"
            >
              {{ s.label }}
            </button>
          </div>

          <div class="h-6 w-px bg-white/10 hidden lg:block" />

          <UButton
            to="/"
            label="Exit System"
            variant="ghost"
            color="neutral"
            size="sm"
            class="text-[10px] font-black uppercase tracking-widest hover:bg-white/5"
          />
        </div>
      </div>
    </nav>

    <!-- Main Layout -->
    <div class="max-w-[1600px] mx-auto px-6 lg:px-12 flex gap-12 pt-32 pb-24">
      <!-- Desktop Sidebar TOC -->
      <aside class="hidden xl:block w-64 shrink-0 sticky top-32 h-fit">
        <div class="space-y-1">
          <button
            v-for="s in sections"
            :key="s.id"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group"
            :class="
              activeSection === s.id
                ? 'bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/20'
                : 'hover:bg-white/5 text-zinc-500 hover:text-white'
            "
            @click="scrollTo(s.id)"
          >
            <UIcon :name="s.icon" class="w-5 h-5" />
            <span class="text-[11px] font-black uppercase tracking-widest">{{ s.label }}</span>
            <UIcon
              v-if="activeSection === s.id"
              name="i-heroicons-chevron-right"
              class="ml-auto w-4 h-4"
            />
          </button>
        </div>

        <div class="mt-12 p-6 rounded-[2rem] floating-card-base grain-overlay border-white/5">
          <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500 mb-3">
            Version 2.4.0
          </p>
          <p class="text-xs text-zinc-500 leading-relaxed italic">
            "Precision engineering is the heartbeat of human performance."
          </p>
        </div>
      </aside>

      <main class="flex-1 min-w-0">
        <!-- Identity Section -->
        <section id="identity" class="mb-32 scroll-mt-32">
          <div class="mb-12">
            <h2
              class="text-4xl font-black text-white italic font-athletic uppercase tracking-tight mb-4"
            >
              01. Identity
            </h2>
            <p class="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              The Coach Watts identity represents precision, power, and human potential. It should
              be used consistently to maintain professional integrity.
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <div
              class="rounded-[2.5rem] floating-card-base grain-overlay p-8 sm:p-12 border-white/10 flex flex-col items-center justify-center min-h-[400px]"
            >
              <div class="w-full text-center mb-12">
                <span
                  class="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 mb-4 block"
                  >Primary Wordmark</span
                >
                <img
                  src="/media/coach_watts_text_cropped.webp"
                  alt="Wordmark"
                  class="h-16 mx-auto object-contain"
                />
              </div>
              <div class="flex gap-4">
                <UButton
                  v-if="logoDownloads[0]"
                  :to="logoDownloads[0].url"
                  download
                  label="Download WebP"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  class="rounded-xl border border-white/10 font-black uppercase tracking-widest text-[10px]"
                  icon="i-heroicons-arrow-down-tray"
                />
              </div>
            </div>

            <div
              class="rounded-[2.5rem] floating-card-base grain-overlay p-8 sm:p-12 border-white/10 flex flex-col items-center justify-center min-h-[400px]"
            >
              <div class="w-full text-center mb-12">
                <span
                  class="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 mb-4 block"
                  >Square Symbol</span
                >
                <img src="/media/logo.webp" alt="Symbol" class="h-24 mx-auto object-contain" />
              </div>
              <div class="flex gap-4">
                <UButton
                  v-if="logoDownloads[1]"
                  :to="logoDownloads[1].url"
                  download
                  label="Download WebP"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  class="rounded-xl border border-white/10 font-black uppercase tracking-widest text-[10px]"
                  icon="i-heroicons-arrow-down-tray"
                />
              </div>
            </div>
          </div>

          <!-- Clearance Diagram -->
          <div
            class="rounded-[2.5rem] floating-card-base grain-overlay p-12 border-white/10 overflow-hidden relative group"
          >
            <div
              class="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10"
            >
              <UIcon name="i-heroicons-viewfinder-circle-solid" class="w-32 h-32" />
            </div>

            <div class="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
              <div class="lg:flex-1">
                <h3 class="text-2xl font-black text-white italic font-athletic uppercase mb-4">
                  Safety Space
                </h3>
                <p class="text-sm text-zinc-500 leading-relaxed mb-8 max-w-sm">
                  Always maintain a minimum clearance area around the logo to ensure its impact and
                  legibility. No other elements should enter this "protection" zone.
                </p>
                <div
                  class="flex items-center gap-4 py-3 px-4 bg-white/5 rounded-xl border border-white/5 w-fit"
                >
                  <span class="text-[10px] font-black uppercase tracking-widest text-primary-500"
                    >Constant:</span
                  >
                  <code class="text-xs font-mono text-zinc-300">X = 24px (1.5rem)</code>
                </div>
              </div>

              <div
                class="lg:flex-none p-16 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10 relative"
              >
                <!-- Measurement Markers (X labels) -->
                <div
                  class="absolute top-0 left-0 w-16 h-16 border-r border-b border-primary-500/30 flex items-center justify-center"
                >
                  <span class="text-[10px] font-black text-primary-500/50 font-mono">X</span>
                </div>
                <div
                  class="absolute top-0 right-0 w-16 h-16 border-l border-b border-primary-500/30 flex items-center justify-center"
                >
                  <span class="text-[10px] font-black text-primary-500/50 font-mono">X</span>
                </div>
                <div
                  class="absolute bottom-0 left-0 w-16 h-16 border-r border-t border-primary-500/30 flex items-center justify-center"
                >
                  <span class="text-[10px] font-black text-primary-500/50 font-mono">X</span>
                </div>
                <div
                  class="absolute bottom-0 right-0 w-16 h-16 border-l border-t border-primary-500/30 flex items-center justify-center"
                >
                  <span class="text-[10px] font-black text-primary-500/50 font-mono">X</span>
                </div>

                <div class="relative">
                  <!-- Dashed box representing clearance -->
                  <div
                    class="absolute -inset-10 border border-dashed border-primary-500/40 rounded-2xl animate-pulse-border"
                  />
                  <img
                    src="/media/logo.webp"
                    alt="Logo"
                    class="h-24 relative z-10 filter grayscale brightness-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Colors Section -->
        <section id="colors" class="mb-32 scroll-mt-32">
          <div class="mb-12">
            <h2
              class="text-4xl font-black text-white italic font-athletic uppercase tracking-tight mb-4"
            >
              02. Colors
            </h2>
            <p class="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Our color system is built for high-contrast accessibility and premium aesthetic depth.
            </p>
          </div>

          <div class="mb-16">
            <h3
              class="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-8 font-mono"
            >
              Primary Palette
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <BrandColorCard v-for="color in colors" :key="color.hex" v-bind="color" />
            </div>
          </div>

          <div>
            <h3
              class="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-8 font-mono"
            >
              Neutral Palette
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <BrandColorCard v-for="color in neutralColors" :key="color.hex" v-bind="color" />
            </div>
          </div>
        </section>

        <!-- Typography Section -->
        <section id="typography" class="mb-32 scroll-mt-32">
          <div class="mb-12">
            <h2
              class="text-4xl font-black text-white italic font-athletic uppercase tracking-tight mb-4"
            >
              03. Typography
            </h2>
            <p class="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Our typography system balances the mathematical precision of Public Sans with the
              aggressive, high-impact energy of our athletic display face.
            </p>
          </div>

          <!-- Main Typeface -->
          <div class="mb-24">
            <BrandTypefaceCard
              font-name="Public Sans"
              description="A strong, neutral, yet friendly sans-serif that reflects our commitment to clarity and professional results. It is highly legible at small sizes and authoritative at large ones."
            />
          </div>

          <!-- Athletic Accent -->
          <div
            class="mb-24 rounded-[2.5rem] bg-primary-500 p-12 transition-all duration-500 hover:shadow-[0_0_50px_rgba(34,197,94,0.3)] group overflow-hidden relative"
          >
            <div
              class="absolute -right-20 -bottom-20 text-[20rem] font-black italic font-athletic uppercase text-black/10 leading-none select-none group-hover:scale-110 transition-transform duration-1000"
            >
              WATTZ
            </div>

            <div class="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span
                  class="text-[10px] font-black uppercase tracking-[0.4em] text-black/60 mb-4 block"
                  >Performance Accent</span
                >
                <h3
                  class="text-5xl sm:text-7xl font-black text-black italic font-athletic uppercase leading-[0.8] mb-8"
                >
                  The Athletic<br />Display Face
                </h3>
                <div class="space-y-4">
                  <div class="flex items-center gap-4 py-3 border-b border-black/10">
                    <span class="text-[9px] font-black uppercase tracking-widest text-black/40"
                      >Usage</span
                    >
                    <span class="text-xs font-bold text-black uppercase"
                      >Metrics, Headlines, High-Impact Cards</span
                    >
                  </div>
                  <div class="flex items-center gap-4 py-3 border-b border-black/10">
                    <span class="text-[9px] font-black uppercase tracking-widest text-black/40"
                      >Style</span
                    >
                    <span class="text-xs font-bold text-black uppercase italic"
                      >Condensed Black Italic</span
                    >
                  </div>
                </div>
              </div>

              <div class="bg-black rounded-3xl p-10 shadow-2xl">
                <div
                  class="text-6xl sm:text-8xl font-black text-primary-500 italic font-athletic uppercase leading-none mb-4 tabular-nums"
                >
                  264<span class="text-2xl ml-2">W</span>
                </div>
                <div class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                  Peak Performance Metric
                </div>
              </div>
            </div>
          </div>

          <!-- Type Scale -->
          <div class="rounded-[2.5rem] floating-card-base grain-overlay p-12 border-white/10">
            <h3
              class="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-12 font-mono"
            >
              Type Scale System
            </h3>

            <div class="space-y-16">
              <div class="flex flex-col lg:flex-row lg:items-end gap-6 group">
                <div class="lg:w-48 shrink-0">
                  <span class="text-[9px] font-black uppercase tracking-widest text-primary-500"
                    >H1 / Hero Title</span
                  >
                  <div class="text-[9px] text-zinc-600 font-mono mt-1 space-y-1">
                    <p>Size: 4rem (64px)</p>
                    <p>Line: 0.85</p>
                    <p>Spacing: -0.05em</p>
                    <p>Weight: 900</p>
                  </div>
                </div>
                <div
                  class="text-5xl sm:text-6xl font-black text-white uppercase italic font-athletic tracking-tight group-hover:text-primary-500 transition-colors"
                >
                  ENGINEERED FOR POWER
                </div>
              </div>

              <div class="flex flex-col lg:flex-row lg:items-end gap-6 group">
                <div class="lg:w-48 shrink-0">
                  <span class="text-[9px] font-black uppercase tracking-widest text-zinc-500"
                    >H2 / Section Title</span
                  >
                  <div class="text-[9px] text-zinc-600 font-mono mt-1 space-y-1">
                    <p>Size: 2.25rem (36px)</p>
                    <p>Line: 1.1</p>
                    <p>Spacing: -0.02em</p>
                    <p>Weight: 900</p>
                  </div>
                </div>
                <div
                  class="text-4xl font-black text-white italic font-athletic uppercase group-hover:text-zinc-300 transition-colors"
                >
                  High Fidelity Coaching
                </div>
              </div>

              <div class="flex flex-col lg:flex-row lg:items-end gap-6 group">
                <div class="lg:w-48 shrink-0">
                  <span class="text-[9px] font-black uppercase tracking-widest text-zinc-500"
                    >Body / Standard</span
                  >
                  <div class="text-[9px] text-zinc-600 font-mono mt-1 space-y-1">
                    <p>Size: 1.125rem (18px)</p>
                    <p>Line: 1.6</p>
                    <p>Spacing: 0.01em</p>
                    <p>Weight: 400</p>
                  </div>
                </div>
                <div class="text-lg text-zinc-300 leading-relaxed max-w-2xl">
                  Coach Watts uses advanced biometric data to craft the perfect training block for
                  your specific physiological profile.
                </div>
              </div>

              <div class="flex flex-col lg:flex-row lg:items-end gap-6 group">
                <div class="lg:w-32 shrink-0">
                  <span class="text-[9px] font-black uppercase tracking-widest text-zinc-500"
                    >Technical / Mono</span
                  >
                  <div class="text-[9px] text-zinc-600 font-mono mt-1">0.875rem (14px) / 700</div>
                </div>
                <div
                  class="text-sm font-mono text-primary-500 bg-primary-500/5 border border-primary-500/10 px-4 py-2 rounded-xl"
                >
                  npm run dev --host 0.0.0.0 --port 3000
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Naming & Assets Section -->
        <section id="naming" class="mb-32 scroll-mt-32">
          <div class="mb-12">
            <h2
              class="text-4xl font-black text-white italic font-athletic uppercase tracking-tight mb-4"
            >
              04. Naming & Voice
            </h2>
            <p class="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              How we speak is as important as how we look. We are technical, authoritative, yet
              motivating.
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div
              class="rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/20 p-10 relative overflow-hidden group"
            >
              <div
                class="absolute -right-8 -bottom-8 opacity-5 transform rotate-12 transition-transform group-hover:scale-110"
              >
                <UIcon name="i-heroicons-check-circle-solid" class="w-48 h-48 text-emerald-500" />
              </div>
              <div class="relative z-10">
                <div class="flex items-center gap-3 mb-8">
                  <div
                    class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black"
                  >
                    <UIcon name="i-heroicons-check-solid" class="w-5 h-5" />
                  </div>
                  <span class="text-xs font-black uppercase tracking-widest text-emerald-500"
                    >The Do List</span
                  >
                </div>
                <h4 class="text-2xl font-black text-white uppercase mb-6 font-athletic italic">
                  Coach Watts
                </h4>
                <p class="text-sm text-zinc-400 leading-relaxed max-w-sm">
                  Always use two words. Capitalize both "Coach" and "Watts". Maintain a professional
                  tone.
                </p>
              </div>
            </div>

            <div
              class="rounded-[2.5rem] bg-red-500/5 border border-red-500/20 p-10 relative overflow-hidden group"
            >
              <div
                class="absolute -right-8 -bottom-8 opacity-5 transform -rotate-12 transition-transform group-hover:scale-110"
              >
                <UIcon name="i-heroicons-x-circle-solid" class="w-48 h-48 text-red-500" />
              </div>
              <div class="relative z-10">
                <div class="flex items-center gap-3 mb-8">
                  <div
                    class="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-black"
                  >
                    <UIcon name="i-heroicons-x-mark-solid" class="w-5 h-5" />
                  </div>
                  <span class="text-xs font-black uppercase tracking-widest text-red-500"
                    >The Don't List</span
                  >
                </div>
                <h4
                  class="text-lg font-medium text-zinc-500 uppercase mb-6 line-through opacity-50"
                >
                  CoachWatts, CW, Wattz
                </h4>
                <p class="text-sm text-zinc-500 leading-relaxed max-w-sm">
                  Avoid camel-case, informal abbreviations, or misspelling the brand name in
                  official communications.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Tech Specs Section -->
        <section id="specs" class="mb-32 scroll-mt-32">
          <div class="mb-12">
            <h2
              class="text-4xl font-black text-white italic font-athletic uppercase tracking-tight mb-4"
            >
              05. Technical Specs
            </h2>
            <p class="text-lg text-zinc-400 max-w-2xl leading-relaxed">
              Precision is in the decimals. Our component architecture follows strict geometric
              rules.
            </p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="rounded-[2.5rem] floating-card-base grain-overlay p-10 border-white/10">
              <h3
                class="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-8 font-mono"
              >
                Corner Radii
              </h3>
              <div class="grid grid-cols-3 gap-6">
                <div class="space-y-4">
                  <div class="aspect-square bg-white/5 border border-white/10 rounded-lg" />
                  <div class="text-center">
                    <div class="text-[10px] font-black text-white">8px</div>
                    <div class="text-[8px] text-zinc-600 uppercase">Buttons/Inputs</div>
                  </div>
                </div>
                <div class="space-y-4">
                  <div class="aspect-square bg-white/5 border border-white/10 rounded-2xl" />
                  <div class="text-center">
                    <div class="text-[10px] font-black text-white">16px</div>
                    <div class="text-[8px] text-zinc-600 uppercase">Standard Cards</div>
                  </div>
                </div>
                <div class="space-y-4">
                  <div class="aspect-square bg-white/5 border border-white/10 rounded-[2.5rem]" />
                  <div class="text-center">
                    <div class="text-[10px] font-black text-white">40px</div>
                    <div class="text-[8px] text-zinc-600 uppercase">Feature Bento</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-[2.5rem] floating-card-base grain-overlay p-10 border-white/10">
              <h3
                class="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-8 font-mono"
              >
                Iconography
              </h3>
              <div class="grid grid-cols-5 gap-6 text-primary-500/60">
                <UIcon name="i-heroicons-bolt-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-chart-bar-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-fire-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-heart-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-user-group-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-calendar-days-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-map-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-cog-6-tooth-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-signal-solid" class="w-8 h-8" />
                <UIcon name="i-heroicons-beaker-solid" class="w-8 h-8" />
              </div>
              <div class="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest"
                  >Library: Heroicons Solid</span
                >
                <UButton
                  label="Icon Spec"
                  variant="link"
                  color="primary"
                  size="xs"
                  class="text-[9px] font-black uppercase tracking-widest p-0"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style>
  @keyframes pulseBorder {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.02);
    }
  }

  .animate-pulse-border {
    animation: pulseBorder 3s ease-in-out infinite;
  }
</style>
