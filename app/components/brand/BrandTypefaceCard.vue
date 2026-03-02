<script setup lang="ts">
  defineProps<{
    fontName: string
    description?: string
    dark?: boolean
  }>()

  const weights = [
    { label: 'Regular', class: 'font-normal', weight: '400' },
    { label: 'Semibold', class: 'font-semibold', weight: '600' },
    { label: 'Bold', class: 'font-bold', weight: '700' },
    { label: 'Black', class: 'font-black', weight: '900' }
  ]

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
</script>

<template>
  <div
    class="rounded-[2.5rem] floating-card-base grain-overlay p-10 border-white/10 transition-all duration-500 group"
  >
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <!-- Title and Description -->
      <div class="lg:col-span-4 lg:border-r lg:border-white/5 lg:pr-12">
        <div class="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 border border-primary-500/20 mb-8 transition-transform group-hover:scale-110">
          <UIcon name="i-heroicons-language-solid" class="w-6 h-6" />
        </div>
        <h3 class="text-3xl font-black text-white italic font-athletic uppercase tracking-tight mb-6 group-hover:text-primary-500 transition-colors">
          {{ fontName }}
        </h3>
        <p class="text-sm font-medium leading-relaxed text-zinc-400 mb-8">
          {{ description }}
        </p>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between py-3 border-b border-white/5">
            <span class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Family</span>
            <span class="text-xs font-mono text-zinc-300">{{ fontName }}</span>
          </div>
          <div class="flex items-center justify-between py-3 border-b border-white/5">
            <span class="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tracking</span>
            <span class="text-xs font-mono text-zinc-300">-0.02em</span>
          </div>
        </div>
      </div>

      <!-- Specimen Area -->
      <div class="lg:col-span-8 flex flex-col space-y-12">
        <div>
          <div
            class="text-7xl sm:text-9xl font-black tracking-tighter leading-none mb-12 transition-all duration-1000 group-hover:tracking-normal text-white/5"
            :style="{ fontFamily: fontName }"
          >
            AaBbCc
          </div>

          <!-- Weight Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div v-for="weight in weights" :key="weight.label" class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-black uppercase tracking-[0.2em] text-primary-500/60">{{ weight.label }}</span>
                <span class="text-[9px] font-mono text-zinc-600">{{ weight.weight }}</span>
              </div>
              <div
                :class="[
                  weight.class,
                  'text-3xl text-white tracking-tight leading-none group-hover:text-primary-500 transition-colors duration-500'
                ]"
                :style="{ fontFamily: fontName }"
              >
                Aa
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-8 pt-10 border-t border-white/5">
          <div>
            <label class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 block mb-6 font-mono">Character Set</label>
            <div
              class="text-xl sm:text-2xl tracking-widest break-all font-medium text-zinc-300 leading-relaxed"
              :style="{ fontFamily: fontName }"
            >
              {{ alphabet }}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-12">
            <div>
              <label class="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 block mb-4 font-mono">Numbers</label>
              <div
                class="text-3xl sm:text-4xl tabular-nums font-black text-white"
                :style="{ fontFamily: fontName }"
              >
                {{ numbers }}
              </div>
            </div>

            <div class="flex flex-col justify-end">
              <div
                class="text-lg sm:text-xl italic text-zinc-500 leading-relaxed border-l-2 border-primary-500/20 pl-6"
                :style="{ fontFamily: fontName }"
              >
                The quick brown fox jumps over the lazy dog.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
