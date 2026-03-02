<script setup lang="ts">
  defineProps<{
    fontName: string
    description?: string
    dark?: boolean
  }>()

  const weights = [
    { label: 'Light', class: 'font-light' },
    { label: 'Regular', class: 'font-normal' },
    { label: 'Medium', class: 'font-medium' },
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
    class="rounded-2xl border p-8 transition-all duration-300"
    :class="[
      dark
        ? 'bg-zinc-900 border-zinc-800'
        : 'bg-white border-zinc-100 dark:border-zinc-800 shadow-sm'
    ]"
  >
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
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
          class="text-sm leading-relaxed mb-8"
          :class="dark ? 'text-zinc-400' : 'text-zinc-600'"
        >
          {{ description }}
        </p>

        <div class="space-y-6">
          <div v-for="weight in weights" :key="weight.label">
            <label
              class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-2"
            >
              {{ weight.label }}
            </label>
            <div
              :class="[weight.class, 'text-2xl lg:text-3xl tracking-tight']"
              :style="{ fontFamily: fontName }"
            >
              Coach Watts
            </div>
          </div>
        </div>
      </div>

      <!-- Big Visual and Details -->
      <div class="lg:col-span-8 flex flex-col justify-between">
        <div
          class="text-7xl sm:text-9xl font-black tracking-tighter leading-none mb-12"
          :class="dark ? 'text-zinc-800' : 'text-zinc-50'"
          :style="{ fontFamily: fontName }"
        >
          ABC
        </div>

        <div class="space-y-8">
          <div>
            <label
              class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-2"
              >Character Set</label
            >
            <div
              class="text-2xl sm:text-3xl tracking-wide break-all"
              :class="dark ? 'text-white font-medium' : 'text-zinc-900 font-medium'"
              :style="{ fontFamily: fontName }"
            >
              {{ alphabet }}
            </div>
            <div
              class="text-2xl sm:text-3xl tracking-wide break-all opacity-60 mt-2"
              :class="dark ? 'text-white' : 'text-zinc-900'"
              :style="{ fontFamily: fontName }"
            >
              {{ alphabetLower }}
            </div>
          </div>

          <div>
            <label
              class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-2"
              >Numbers</label
            >
            <div
              class="text-2xl sm:text-3xl tabular-nums"
              :class="dark ? 'text-white' : 'text-zinc-900'"
              :style="{ fontFamily: fontName }"
            >
              {{ numbers }}
            </div>
          </div>

          <div>
            <label
              class="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block mb-2"
              >Sample Sentence</label
            >
            <div
              class="text-xl sm:text-2xl italic leading-relaxed"
              :class="dark ? 'text-zinc-300' : 'text-zinc-700'"
              :style="{ fontFamily: fontName }"
            >
              "{{ sentence }}"
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
