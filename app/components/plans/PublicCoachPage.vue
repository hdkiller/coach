<template>
  <div class="relative overflow-hidden bg-default/50">
    <div class="absolute inset-x-0 top-0 h-[28rem] border-b border-default/10 bg-default/5"></div>

    <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div v-if="pending" class="space-y-6">
        <USkeleton class="h-20 rounded-[2rem]" />
        <USkeleton class="h-[460px] rounded-[2rem]" />
      </div>

      <div
        v-else-if="!author"
        class="rounded-[2rem] border border-default/70 bg-default/80 p-12 text-center"
      >
        <h1 class="text-2xl font-black tracking-tight text-highlighted">Coach not found</h1>
        <p class="mt-3 text-sm text-muted">This public coach page is unavailable.</p>
        <UButton to="/training-plans" color="primary" class="mt-6">Browse all plans</UButton>
      </div>

      <div v-else class="space-y-8">
        <div class="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
          <NuxtLink to="/" class="transition-colors hover:text-primary">Home</NuxtLink>
          <span>/</span>
          <NuxtLink to="/training-plans" class="transition-colors hover:text-primary"
            >Training Plans</NuxtLink
          >
          <span>/</span>
          <span class="text-highlighted">{{ author.displayName }}</span>
        </div>

        <section
          class="overflow-hidden rounded-[2.2rem] border border-default/70 bg-default shadow-sm"
        >
          <div class="grid gap-0 lg:grid-cols-[minmax(0,1.5fr)_360px]">
            <div class="p-6 sm:p-8 lg:p-10">
              <p class="text-xs font-black uppercase tracking-[0.24em] text-primary">
                Public coach profile
              </p>
              <div class="mt-6 flex flex-col gap-8 md:flex-row md:items-start">
                <UAvatar
                  :src="author.image || undefined"
                  :alt="author.displayName"
                  size="3xl"
                  class="border-2 border-default shadow-sm"
                />
                <div class="min-w-0 flex-1">
                  <h1
                    class="text-4xl font-black tracking-tight text-highlighted sm:text-5xl lg:text-6xl"
                  >
                    {{ author.displayName }}
                  </h1>
                  <p v-if="author.coachingBrand" class="mt-3 text-2xl font-bold text-muted">
                    {{ author.coachingBrand }}
                  </p>

                  <p
                    v-if="author.bio"
                    class="mt-6 max-w-3xl whitespace-pre-wrap text-base leading-8 text-muted"
                  >
                    {{ author.bio }}
                  </p>

                  <div class="mt-8 flex flex-wrap gap-3">
                    <div
                      v-if="author.location"
                      class="flex items-center gap-2 rounded-full border border-default/60 bg-muted/5 px-4 py-2 text-sm font-medium text-muted"
                    >
                      <UIcon name="i-heroicons-map-pin" class="h-4 w-4" />
                      {{ author.location }}
                    </div>
                    <a
                      v-if="author.websiteUrl"
                      :href="author.websiteUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="flex items-center gap-2 rounded-full border border-default/60 bg-muted/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <UIcon name="i-heroicons-globe-alt" class="h-4 w-4" />
                      {{ author.websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') }}
                    </a>
                  </div>

                  <div v-if="author.socialLinks?.length" class="mt-4 flex flex-wrap gap-2">
                    <a
                      v-for="link in author.socialLinks"
                      :key="`${link.label}-${link.url}`"
                      :href="link.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="rounded-full border border-default/60 bg-muted/5 px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {{ link.label }}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-default/70 bg-muted/5 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div class="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <div class="rounded-2xl border border-default/60 bg-default p-5 shadow-sm">
                  <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                    Published plans
                  </div>
                  <div class="mt-2 text-3xl font-black text-highlighted">{{ plans.length }}</div>
                </div>
                <div class="rounded-2xl border border-default/60 bg-default p-5 shadow-sm">
                  <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                    Featured plans
                  </div>
                  <div class="mt-2 text-3xl font-black text-highlighted">
                    {{ featuredPlanCount }}
                  </div>
                </div>
                <div class="rounded-2xl border border-default/60 bg-default p-5 shadow-sm">
                  <div class="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                    Sports covered
                  </div>
                  <div class="mt-2 text-3xl font-black text-highlighted">
                    {{ uniqueSportCount }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="space-y-6">
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-default/10 pb-6"
          >
            <div>
              <p class="text-xs font-black uppercase tracking-[0.24em] text-primary">
                Training plans
              </p>
              <h2 class="mt-2 text-3xl font-black tracking-tight text-highlighted">
                Authored by {{ author.displayName }}
              </h2>
            </div>
            <div class="text-sm font-bold text-muted tabular-nums">
              {{ plans.length }} public plans
            </div>
          </div>

          <div
            v-if="plans.length === 0"
            class="rounded-[2rem] border border-dashed border-default/80 bg-default/70 p-12 text-center"
          >
            <UIcon name="i-heroicons-face-frown" class="mx-auto h-12 w-12 text-muted" />
            <p class="mt-4 text-sm text-muted">
              This coach has no public plans listed at the moment.
            </p>
            <UButton to="/training-plans" color="primary" variant="soft" class="mt-6"
              >Explore other plans</UButton
            >
          </div>

          <div v-else class="space-y-6">
            <PublicPlanCard v-for="plan in plans" :key="plan.id" :plan="plan" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import PublicPlanCard from '~/components/plans/PublicPlanCard.vue'

  const route = useRoute()
  const runtimeConfig = useRuntimeConfig()
  const requestUrl = useRequestURL()
  const slug = route.params.slug as string

  const { data, pending } = await useFetch(`/api/public/authors/${slug}`)
  const author = computed(() => (data.value as any)?.author)
  const plans = computed(() => (data.value as any)?.plans || [])
  const canonicalUrl = computed(
    () => `${runtimeConfig.public.siteUrl || requestUrl.origin}/coach/${slug}`
  )
  const featuredPlanCount = computed(
    () => plans.value.filter((plan: any) => plan.isFeatured).length
  )
  const uniqueSportCount = computed(
    () => new Set(plans.value.map((plan: any) => plan.primarySport).filter(Boolean)).size
  )

  useSeoMeta({
    title: () =>
      author.value ? `${author.value.displayName} | Coach Wattz` : 'Coach | Coach Wattz',
    description: () =>
      author.value?.bio || 'Browse published training plans from this Coach Wattz coach.'
  })

  useHead({
    link: [{ rel: 'canonical', href: canonicalUrl.value }]
  })
</script>
