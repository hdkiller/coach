<script setup lang="ts">
  defineProps<{
    fontName: string
    description?: string
    dark?: boolean
  }>()

  const weights = [
    { label: 'Regular', class: 'font-normal' },
    { label: 'Bold', class: 'font-bold' },
    { label: 'Black', class: 'font-black' }
  ]

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const alphabetLower = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const sentence = 'The quick brown fox jumps over the lazy dog.'
</script>

<template>
  <div
    class="rounded-2xl border p-8 transition-all duration-300 group"
    :class="[
      dark
        ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
        : 'bg-white border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-lg'
    ]"
  >
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Title and Description -->
      <div class="lg:col-span-4">
        <h3
          class="text-2xl font-black uppercase tracking-tight mb-4"
          :class="dark ? 'text-white' : 'text-zinc-900'"
        >
          {{ fontName }}
        </h3>
        <p
          v-if="description"
          class="text-sm leading-relaxed"
          :class="dark ? 'text-zinc-400' : 'text-zinc-600'"
        >
          {{ description }}
        </p>
      </div>

      <!-- Big Visual and Weight Previews -->
      <div class="lg:col-span-8 flex flex-col space-y-8">
        <div>
          <div
            class="text-6xl sm:text-8xl font-black tracking-tighter leading-none mb-4 transition-all duration-700 group-hover:tracking-normal group-hover:text-primary-500/20"
            :class="dark ? 'text-zinc-800' : 'text-zinc-50'"
            :style="{ fontFamily: fontName }"
          >
            ABC
          </div>

          <!-- Weight Previews -->
          <div class="flex flex-wrap gap-x-12 gap-y-6">
            <div v-for="weight in weights" :key="weight.label" class="group/weight">
              <label
                class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1 transition-colors group-hover/weight:text-primary-400"
              >
                {{ weight.label }}
              </label>
              <div
                :class="[
                  weight.class,
                  'text-xl lg:text-2xl tracking-tight transition-transform group-hover/weight:translate-x-1'
                ]"
                :style="{ fontFamily: fontName }"
              >
                Coach Watts
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <div>
            <label
              class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1"
              >Character Set</label
            >
            <div
              class="text-xl sm:text-2xl tracking-wide break-all"
              :class="dark ? 'text-white font-medium' : 'text-zinc-900 font-medium'"
              :style="{ fontFamily: fontName }"
            >
              {{ alphabet }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-8">
            <div>
              <label
                class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1"
                >Numbers</label
              >
              <div
                class="text-xl sm:text-2xl tabular-nums"
                :class="dark ? 'text-white' : 'text-zinc-900'"
                :style="{ fontFamily: fontName }"
              >
                {{ numbers }}
              </div>
            </div>

            <div>
              <label
                class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-1"
                >Sample</label
              >
              <div
                class="text-lg sm:text-xl italic truncate"
                :class="dark ? 'text-zinc-300' : 'text-zinc-700'"
                :style="{ fontFamily: fontName }"
              >
                The quick brown fox...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
