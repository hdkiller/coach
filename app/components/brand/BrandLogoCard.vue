<script setup lang="ts">
  defineProps<{
    title: string
    description?: string
    logoSrc: string
    alt: string
    backgroundClass?: string
    downloadLinks?: { label: string; url: string; icon?: string }[]
    dark?: boolean
  }>()
</script>

<template>
  <div
    class="flex flex-col group h-full rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl"
    :class="[
      dark
        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        : 'bg-white border-zinc-100 dark:border-zinc-800 hover:border-primary-200'
    ]"
  >
    <!-- Logo Preview Section -->
    <div
      :class="[
        'h-64 sm:h-72 flex items-center justify-center p-12 transition-transform duration-500 overflow-hidden',
        backgroundClass || 'bg-zinc-100 dark:bg-zinc-800'
      ]"
    >
      <img
        :src="logoSrc"
        :alt="alt"
        class="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110"
      />
    </div>

    <!-- Info Area -->
    <div class="p-6 flex flex-col flex-grow">
      <h3
        class="text-xl font-black uppercase tracking-tight mb-2"
        :class="dark ? 'text-white' : 'text-zinc-900'"
      >
        {{ title }}
      </h3>
      <p
        v-if="description"
        class="text-sm leading-relaxed mb-6"
        :class="dark ? 'text-zinc-400' : 'text-zinc-600'"
      >
        {{ description }}
      </p>

      <!-- Downloads -->
      <div v-if="downloadLinks && downloadLinks.length > 0" class="mt-auto space-y-2">
        <label class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-2"
          >Formats</label
        >
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="link in downloadLinks"
            :key="link.url"
            :to="link.url"
            target="_blank"
            download
            :icon="link.icon || 'i-heroicons-arrow-down-tray'"
            variant="soft"
            color="primary"
            size="sm"
            class="rounded-full"
          >
            {{ link.label }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
