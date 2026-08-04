<template>
  <div
    id="hero"
    class="relative isolate overflow-hidden min-h-[80vh] flex items-center justify-center"
  >
    <!-- Subtle parallax/animated background -->
    <div
      class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/40 via-[oklch(12%_0.015_155)] to-[oklch(12%_0.015_155)] opacity-80"
    ></div>
    <div class="absolute inset-0 -z-10 opacity-10 mix-blend-overlay"></div>
    <div
      class="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[200%] h-[100%] animate-[spin_60s_linear_infinite] opacity-30 pointer-events-none"
    >
      <div
        class="absolute inset-0 bg-gradient-to-r from-transparent via-primary-500/10 to-transparent blur-3xl rounded-full"
      ></div>
    </div>

    <div
      ref="heroRef"
      class="relative z-10 mx-auto flex max-w-[88rem] flex-col items-center px-6 pb-16 pt-24 sm:pb-20 sm:pt-32 lg:px-8 text-center transition-all duration-1000 transform"
      :class="[isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12']"
    >
      <NuxtLink
        to="#why-us"
        class="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-gray-400 transition-colors hover:text-white mb-8"
      >
        <span
          class="rounded-sm bg-primary-500/10 px-2.5 py-1 text-primary-400 ring-1 ring-inset ring-primary-500/25"
        >
          NEW BRANDING
        </span>
        <span class="inline-flex items-center gap-1.5">
          Read the Manifesto
          <UIcon name="i-heroicons-chevron-right" class="h-4 w-4" />
        </span>
      </NuxtLink>

      <h1
        class="font-athletic mt-6 text-balance text-5xl font-bold uppercase leading-[0.9] tracking-tight text-white sm:text-6xl xl:text-[5rem] max-w-4xl"
      >
        Level Up Your Endurance.<br />
        <span class="text-primary-500">Welcome to the Tri Nerds.</span>
      </h1>
      <p class="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-gray-400 sm:text-xl">
        We don't just log miles. We analyze the Acute:Chronic Workload Ratio. Join a community of
        multisport geeks powered by an elite AI Digital Coaching Twin.
      </p>

      <div class="mt-10 flex flex-wrap items-center justify-center gap-5">
        <UButton
          to="/join"
          size="xl"
          color="primary"
          variant="solid"
          class="hero-cta h-14 rounded-xl px-8 text-[13px] font-bold uppercase tracking-[0.18em] transition-[background-color,transform] duration-200 hover:brightness-110 active:translate-y-px"
        >
          Join the Guild (Free)
        </UButton>
        <UButton
          to="#why-us"
          size="xl"
          color="neutral"
          variant="link"
          trailing-icon="i-heroicons-arrow-right-20-solid"
          class="text-[13px] font-bold uppercase tracking-[0.12em] text-gray-400 transition-colors hover:text-white"
        >
          Explore the Tech
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted } from 'vue'

  const heroRef = ref(null)
  const isVisible = ref(false)

  onMounted(() => {
    // Trigger animation shortly after mount for the hero
    setTimeout(() => {
      isVisible.value = true
    }, 100)
  })
</script>
