<template>
  <div class="py-16 md:py-24">
    <UContainer>
      <!-- Header -->
      <div class="text-center max-w-3xl mx-auto mb-16">
        <UBadge color="primary" variant="subtle" class="mb-4">{{ t('header_badge') }}</UBadge>
        <h1 class="text-4xl md:text-5xl font-bold mb-6">{{ t('header_title') }}</h1>
        <p class="text-lg text-gray-600 dark:text-gray-300">
          {{ t('header_description') }}
        </p>
      </div>

      <!-- Featured Story -->
      <div class="mb-24">
        <div class="relative rounded-2xl overflow-hidden bg-gray-900 text-white shadow-2xl">
          <div class="absolute inset-0">
            <!-- Placeholder for a real image, using a gradient for now -->
            <div
              class="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-90"
            />
          </div>
          <div class="relative grid md:grid-cols-2 gap-8 p-8 md:p-16 items-center">
            <div>
              <div
                class="flex items-center gap-2 mb-4 text-primary-400 font-bold tracking-wide uppercase text-sm"
              >
                <UIcon name="i-heroicons-trophy" />
                {{ t('featured_label') }}
              </div>
              <h2 class="text-3xl md:text-4xl font-bold mb-6">"{{ t('featured_headline') }}"</h2>
              <blockquote class="text-lg text-gray-300 mb-8 italic">
                "{{ t('featured_quote') }}"
              </blockquote>
              <div class="flex items-center gap-4">
                <UAvatar size="lg" :alt="t('featured_name')" class="bg-primary/20 text-primary" />
                <div>
                  <div class="font-bold">{{ t('featured_name') }}</div>
                  <div class="text-sm text-gray-400">{{ t('featured_role') }}</div>
                </div>
              </div>
            </div>
            <div class="hidden md:block">
              <!-- Abstract visual representing data/performance -->
              <div class="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
                <div class="space-y-4">
                  <div class="flex justify-between items-end border-b border-white/10 pb-2">
                    <span class="text-sm text-gray-400">{{ t('featured_stat_ftp') }}</span>
                    <span class="text-2xl font-bold text-green-400">+12%</span>
                  </div>
                  <div class="flex justify-between items-end border-b border-white/10 pb-2">
                    <span class="text-sm text-gray-400">{{ t('featured_stat_vo2') }}</span>
                    <span class="text-2xl font-bold text-blue-400">54 ml/kg</span>
                  </div>
                  <div class="flex justify-between items-end">
                    <span class="text-sm text-gray-400">{{ t('featured_stat_consistency') }}</span>
                    <span class="text-2xl font-bold text-purple-400">98%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- More Stories Grid -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <UCard
          v-for="story in stories"
          :key="story.name"
          class="flex flex-col h-full hover:ring-2 hover:ring-primary/50 transition-all"
        >
          <template #header>
            <div class="flex items-start justify-between">
              <UAvatar :alt="story.name" size="md" class="bg-gray-100 dark:bg-gray-800" />
              <UIcon name="i-heroicons-star" class="text-yellow-400 w-5 h-5" />
            </div>
          </template>

          <h3 class="text-xl font-bold mb-2">{{ story.title }}</h3>
          <p class="text-gray-600 dark:text-gray-300 flex-grow mb-4">"{{ story.quote }}"</p>

          <div class="pt-4 border-t border-gray-100 dark:border-gray-800 text-sm">
            <div class="font-bold">{{ story.name }}</div>
            <div class="text-gray-500">{{ story.type }}</div>
          </div>
        </UCard>
      </div>

      <!-- CTA -->
      <div class="mt-24 text-center">
        <h2 class="text-2xl font-bold mb-4">{{ t('cta_title') }}</h2>
        <p class="text-gray-600 dark:text-gray-300 mb-8">
          {{ t('cta_description') }}
        </p>
        <UButton to="/login" size="xl" color="primary" icon="i-heroicons-arrow-right">
          {{ t('cta_button') }}
        </UButton>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
  import { useTranslate } from '@tolgee/vue'

  definePageMeta({
    layout: 'home',
    auth: false
  })

  const { t } = useTranslate('stories')

  useHead(
    computed(() => ({
      title: t.value('meta_title'),
      meta: [{ name: 'description', content: t.value('meta_description') }]
    }))
  )

  const stories = computed(() => [
    {
      name: 'Mike Chen',
      type: t.value('s1_type'),
      title: t.value('s1_title'),
      quote: t.value('s1_quote')
    },
    {
      name: 'Elena Rodriguez',
      type: t.value('s2_type'),
      title: t.value('s2_title'),
      quote: t.value('s2_quote')
    },
    {
      name: 'David Smith',
      type: t.value('s3_type'),
      title: t.value('s3_title'),
      quote: t.value('s3_quote')
    },
    {
      name: 'Tom Baker',
      type: t.value('s4_type'),
      title: t.value('s4_title'),
      quote: t.value('s4_quote')
    },
    {
      name: 'Lisa Wong',
      type: t.value('s5_type'),
      title: t.value('s5_title'),
      quote: t.value('s5_quote')
    },
    {
      name: 'James Wilson',
      type: t.value('s6_type'),
      title: t.value('s6_title'),
      quote: t.value('s6_quote')
    }
  ])
</script>
