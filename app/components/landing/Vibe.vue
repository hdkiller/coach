<template>
  <section class="relative isolate overflow-hidden bg-black px-6 py-24 sm:py-32 lg:px-8">
    <div class="mx-auto max-w-2xl lg:max-w-4xl text-center">
      <h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl uppercase font-athletic">
        The Tri Nerds Vibe
      </h2>
      <p class="mt-4 text-lg text-gray-400">
        Created by Nick & David, Tri Nerds is where serious endurance training meets our favorite
        nerdy passions. Whether you're deep into the Cosmere, rolling dice in D&D, or theorycrafting
        your next TCG deck, you'll fit right in.
      </p>

      <div class="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <UCard class="bg-gray-900 border-gray-800 text-left">
          <div class="flex items-center gap-3 mb-4">
            <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-primary-500" />
            <h3 class="text-xl font-bold text-white">Nerdy by Nature</h3>
          </div>
          <p class="text-gray-400">
            We celebrate the hobbies that fuel our imagination. Training for a marathon or a
            triathlon doesn't mean you have to leave your love for fantasy and sci-fi behind. We
            talk pacing strategies and Sanderson books in the same breath.
          </p>
        </UCard>

        <UCard class="bg-gray-900 border-gray-800 text-left">
          <div class="flex items-center gap-3 mb-4">
            <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-primary-500" />
            <h3 class="text-xl font-bold text-white">Data-Driven Coaching</h3>
          </div>
          <p class="text-gray-400">
            Behind the fun is a serious approach to performance. We use data-driven coaching—from
            VO2 Max estimations to 1RM calculators and cutting-edge AI analysis—to help athletes of
            all levels unlock their true potential.
          </p>
        </UCard>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts"></script>
