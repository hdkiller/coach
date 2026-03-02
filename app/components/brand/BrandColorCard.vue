<script setup lang="ts">
  import { useClipboard } from '@vueuse/core'

  const props = defineProps<{
    name: string
    hex: string
    tailwind?: string
    usage?: string
    dark?: boolean
  }>()

  const { copy, copied } = useClipboard({ source: props.hex })
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
    <!-- Color Swatch -->
    <div
      class="h-32 sm:h-40 w-full transition-transform duration-500 group-hover:scale-105"
      :style="{ backgroundColor: hex }"
    />

    <!-- Info Area -->
    <div class="p-6 flex flex-col flex-grow">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3
            class="text-sm font-black uppercase tracking-[0.2em] mb-1"
            :class="dark ? 'text-zinc-400' : 'text-zinc-500'"
          >
            {{ name }}
          </h3>
          <div class="flex items-center gap-2">
            <span
              class="text-xl font-mono font-bold"
              :class="dark ? 'text-white' : 'text-zinc-900'"
            >
              {{ hex }}
            </span>
            <UButton
              icon="i-heroicons-clipboard-document"
              variant="ghost"
              color="primary"
              size="xs"
              @click="copy()"
            >
              <template #trailing>
                <span v-if="copied" class="text-[10px] animate-pulse">Copied!</span>
              </template>
            </UButton>
          </div>
        </div>
      </div>

      <div v-if="tailwind" class="mb-4">
        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1"
          >Tailwind Class</label
        >
        <code class="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
          {{ tailwind }}
        </code>
      </div>

      <p
        v-if="usage"
        class="text-sm leading-relaxed mt-auto"
        :class="dark ? 'text-zinc-400' : 'text-zinc-600'"
      >
        {{ usage }}
      </p>
    </div>
  </div>
</template>
