<script setup lang="ts">
  defineProps<{
    title?: string
    description?: string
    dark?: boolean
    pattern?: boolean
  }>()
</script>

<template>
  <section
    :class="[
      'py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden',
      dark
        ? 'bg-zinc-950 text-white'
        : 'bg-white text-zinc-900 border-t border-zinc-100 dark:border-zinc-800'
    ]"
  >
    <!-- Decorative Pattern (Rouvy style) -->
    <div
      v-if="dark && pattern"
      class="absolute inset-0 pointer-events-none opacity-10"
      aria-hidden="true"
    >
      <div
        class="absolute -top-1/4 -right-1/4 w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 rotate-45 transform origin-center skew-x-12 scale-150"
      />
      <div
        class="absolute -bottom-1/4 -left-1/4 w-full h-full bg-gradient-to-tr from-primary-600 to-emerald-400 -rotate-45 transform origin-center -skew-x-12 scale-125 transition-transform duration-1000 group-hover:scale-150"
      />
    </div>

    <div class="max-w-7xl mx-auto relative z-10">
      <div v-if="title || description" class="mb-12">
        <h2
          v-if="title"
          :class="[
            'text-3xl font-black uppercase tracking-tight mb-4',
            dark ? 'text-white' : 'text-zinc-900'
          ]"
        >
          {{ title }}
        </h2>
        <p
          v-if="description"
          :class="['max-w-2xl text-lg leading-relaxed', dark ? 'text-zinc-400' : 'text-zinc-500']"
        >
          {{ description }}
        </p>
      </div>

      <slot />
    </div>
  </section>
</template>
