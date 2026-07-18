<script setup lang="ts">
  import { useTranslate, useTolgee } from '@tolgee/vue'

  definePageMeta({
    layout: 'home',
    auth: false
  })

  const { t } = useTranslate('partners')
  const tolgee = useTolgee(['language'])
  const runtimeConfig = useRuntimeConfig()
  const requestUrl = useRequestURL()

  const dateLocale = computed(() => {
    const lang = tolgee.value.getLanguage() || 'en'
    if (lang === 'hu') return 'hu-HU'
    if (lang === 'zh') return 'zh-CN'
    return lang
  })

  const { data, pending, error } = await useFetch('/api/public-events', {
    key: 'public-events-directory'
  })

  const events = computed(() => data.value?.events || [])

  const canonicalUrl = computed(
    () => `${runtimeConfig.public.siteUrl || requestUrl.origin}/calendar`
  )

  useSeoMeta({
    title: () => t.value('directory_events_meta_title'),
    description: () => t.value('directory_events_meta_description'),
    ogTitle: () => t.value('directory_events_meta_title'),
    ogDescription: () => t.value('directory_events_meta_description'),
    ogUrl: () => canonicalUrl.value,
    twitterCard: 'summary_large_image'
  })

  useHead(() => ({
    link: [{ rel: 'canonical', href: canonicalUrl.value }]
  }))

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale.value, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function locationLabel(event: {
    isVirtual: boolean
    location: string | null
    city: string | null
    country: string | null
  }) {
    if (event.isVirtual) return t.value('virtual')
    return (
      event.location || [event.city, event.country].filter(Boolean).join(', ') || t.value('tba')
    )
  }
</script>

<template>
  <div class="overflow-x-clip py-14 sm:py-20">
    <UContainer>
      <div class="max-w-2xl">
        <h1
          class="font-athletic text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl"
        >
          {{ t('directory_events_title') }}
        </h1>
        <p class="mt-5 text-lg text-gray-400">
          {{ t('directory_events_subtitle') }}
        </p>
      </div>

      <div v-if="pending" class="mt-12 flex justify-center py-16">
        <UIcon name="i-heroicons-arrow-path" class="h-10 w-10 animate-spin text-primary-500" />
      </div>

      <div v-else-if="error" class="mt-12 rounded-2xl border border-white/10 p-8 text-center">
        <p class="text-gray-400">{{ t('error_event_not_found') }}</p>
      </div>

      <div
        v-else-if="!events.length"
        class="mt-12 rounded-2xl border border-white/10 bg-[oklch(16%_0.02_155)] p-10 text-center"
      >
        <p class="text-gray-400">{{ t('directory_events_empty') }}</p>
      </div>

      <ul v-else class="mt-12 space-y-4">
        <li v-for="event in events" :key="event.slug">
          <NuxtLink
            :to="event.publicUrl"
            class="block rounded-2xl border border-white/10 bg-[oklch(16%_0.02_155)] p-6 transition-colors hover:border-primary-500/40 hover:bg-[oklch(18%_0.02_155)] sm:p-8"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 space-y-2">
                <h2 class="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {{ event.title }}
                </h2>
                <p class="text-sm text-gray-400">{{ event.organizerName }}</p>
                <p class="text-sm text-gray-300">
                  {{ formatDate(event.date) }} · {{ locationLabel(event) }}
                </p>
                <p
                  v-if="event.type || event.distance || event.elevation"
                  class="text-sm text-gray-400"
                >
                  <span v-if="event.type">{{ event.type }}</span>
                  <span v-if="event.type && (event.distance || event.elevation)"> · </span>
                  <span v-if="event.distance">{{
                    t('course_distance', { distance: event.distance })
                  }}</span>
                  <span v-if="event.distance && event.elevation"> · </span>
                  <span v-if="event.elevation">{{
                    t('course_elevation', { elevation: event.elevation })
                  }}</span>
                </p>
              </div>
              <span
                class="shrink-0 text-sm font-bold uppercase tracking-wide text-primary-400 sm:pt-1"
              >
                {{ t('directory_events_view') }}
              </span>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </UContainer>
  </div>
</template>
