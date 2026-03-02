<script setup lang="ts">
  defineProps<{
    title?: string
    description?: string
    dark?: boolean
  }>()
</script>

<template>
  <section
    :class="[
      'py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300',
      dark
        ? 'bg-zinc-950 text-white'
        : 'bg-white text-zinc-900 border-t border-zinc-100 dark:border-zinc-800'
    ]"
  >
    <div class="max-w-7xl mx-auto">
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
