<script setup lang="ts">
  import { useClipboard } from '@vueuse/core'

  const props = defineProps<{
    name: string
    hex: string
    tailwind?: string
    variable?: string
    contrast?: string
    usage?: string
    dark?: boolean
  }>()

  const { copy, copied } = useClipboard({ source: props.hex })
  const toast = useToast()

  watch(copied, (newVal) => {
    if (newVal) {
      toast.add({
        title: 'Copied to Clipboard',
        description: `${props.hex} specialized for ${props.usage || props.name}`,
        icon: 'i-heroicons-check-circle',
        color: 'primary'
      })
    }
  })
</script>

<template>
  <div
    class="flex flex-col group h-full rounded-[2rem] overflow-hidden floating-card-base grain-overlay border-white/10 transition-all duration-500"
  >
    <!-- Color Swatch -->
    <div
      class="h-40 w-full transition-transform duration-700 group-hover:scale-105 relative"
      :style="{ backgroundColor: hex }"
    >
      <div
        v-if="contrast"
        class="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2"
      >
        <span class="text-[9px] font-black uppercase tracking-widest text-zinc-400">Contrast</span>
        <span class="text-xs font-black text-white font-mono">{{ contrast }}</span>
      </div>
    </div>

    <!-- Info Area -->
    <div class="p-8 flex flex-col flex-grow">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h3 class="text-[10px] font-black uppercase tracking-[0.3em] text-primary-500 mb-2">
            {{ name }}
          </h3>
          <div class="flex items-center gap-3">
            <span class="text-2xl font-black text-white font-mono tracking-tight">
              {{ hex }}
            </span>
            <UButton
              icon="i-heroicons-clipboard-document"
              variant="ghost"
              color="primary"
              size="xs"
              class="rounded-xl border border-white/5 hover:bg-white/5"
              @click="copy()"
            />
          </div>
        </div>
      </div>

      <div class="space-y-4 mb-8">
        <div v-if="tailwind">
          <label class="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1.5"
            >Tailwind Class</label
          >
          <code
            class="text-[11px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 font-mono text-zinc-300 block w-full"
          >
            {{ tailwind }}
          </code>
        </div>

        <div v-if="variable">
          <label class="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1.5"
            >CSS Variable</label
          >
          <code
            class="text-[11px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 font-mono text-primary-500/80 block w-full"
          >
            {{ variable }}
          </code>
        </div>
      </div>

      <p
        v-if="usage"
        class="text-sm font-medium leading-relaxed text-zinc-400 mt-auto border-t border-white/5 pt-6 italic"
      >
        {{ usage }}
      </p>
    </div>
  </div>
</template>
