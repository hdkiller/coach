<template>
  <div
    class="flex min-h-screen flex-col overflow-x-clip bg-[oklch(12%_0.015_155)] font-sans text-gray-100"
  >
    <header class="relative z-40 border-b border-white/8">
      <div
        class="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <NuxtLink to="/" class="flex shrink-0 items-center transition-opacity hover:opacity-90">
          <img
            src="/media/coach_watts_text_cropped.webp"
            alt="Coach Watts"
            class="h-10 w-auto object-contain sm:h-12"
          />
        </NuxtLink>

        <nav
          class="hidden items-center gap-8 text-sm font-medium text-gray-400 lg:flex"
          aria-label="Primary"
        >
          <NuxtLink
            to="/#how-it-works"
            class="whitespace-nowrap transition-colors hover:text-white"
          >
            {{ t('nav.how_it_works') }}
          </NuxtLink>
          <NuxtLink
            to="/#pricing"
            class="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-white"
          >
            {{ t('nav.pricing') }}
            <span
              class="inline-flex items-center justify-center rounded-sm bg-emerald-400 px-1.5 py-0.5 text-xs font-bold leading-none text-emerald-950"
              >{{ t('nav.pricing_badge') }}</span
            >
          </NuxtLink>
          <NuxtLink
            to="/training-plans"
            class="whitespace-nowrap transition-colors hover:text-white"
          >
            Training Plans
          </NuxtLink>
          <NuxtLink to="/works-with" class="whitespace-nowrap transition-colors hover:text-white">{{
            t('nav.integrations')
          }}</NuxtLink>
          <NuxtLink to="/stories" class="whitespace-nowrap transition-colors hover:text-white">{{
            t('nav.stories')
          }}</NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <div class="hidden h-8 min-w-[8.5rem] shrink-0 sm:block">
            <ClientOnly>
              <LanguageSwitcher />
              <template #fallback>
                <div
                  class="h-full w-full rounded-md border border-white/10 bg-white/5"
                  aria-hidden="true"
                />
              </template>
            </ClientOnly>
          </div>
          <UButton
            v-if="route.path !== '/join'"
            to="/join"
            color="primary"
            size="sm"
            class="whitespace-nowrap sm:hidden"
          >
            {{ t('nav.get_started') }}
          </UButton>
          <div class="hidden items-center gap-2 sm:flex">
            <UButton
              v-if="route.path !== '/login'"
              to="/login"
              variant="ghost"
              color="neutral"
              class="whitespace-nowrap"
              >{{ t('nav.sign_in') }}</UButton
            >
            <UButton
              v-if="route.path !== '/join'"
              to="/join"
              color="primary"
              class="whitespace-nowrap"
              >{{ t('nav.get_started') }}</UButton
            >
          </div>

          <UPopover class="lg:hidden">
            <UButton
              icon="i-heroicons-bars-3"
              color="neutral"
              variant="ghost"
              aria-label="Open menu"
            />
            <template #content>
              <div class="flex w-48 flex-col gap-4 p-4">
                <NuxtLink
                  to="/#how-it-works"
                  class="text-sm font-medium whitespace-nowrap transition-colors hover:text-primary"
                  >{{ t('nav.how_it_works') }}</NuxtLink
                >
                <NuxtLink
                  to="/#pricing"
                  class="flex items-center justify-between text-sm font-medium whitespace-nowrap transition-colors hover:text-primary"
                >
                  {{ t('nav.pricing') }}
                  <span
                    class="inline-flex items-center justify-center rounded-sm bg-emerald-400 px-1.5 py-0.5 text-xs font-bold leading-none text-emerald-950"
                    >{{ t('nav.pricing_badge') }}</span
                  >
                </NuxtLink>
                <NuxtLink
                  to="/training-plans"
                  class="text-sm font-medium whitespace-nowrap transition-colors hover:text-primary"
                  >Training Plans</NuxtLink
                >
                <NuxtLink
                  to="/works-with"
                  class="text-sm font-medium whitespace-nowrap transition-colors hover:text-primary"
                  >{{ t('nav.integrations') }}</NuxtLink
                >
                <NuxtLink
                  to="/stories"
                  class="text-sm font-medium whitespace-nowrap transition-colors hover:text-primary"
                  >{{ t('nav.stories') }}</NuxtLink
                >
                <hr class="border-white/10" />
                <UButton
                  v-if="route.path !== '/login'"
                  to="/login"
                  variant="ghost"
                  color="neutral"
                  block
                  >{{ t('nav.sign_in') }}</UButton
                >
                <UButton v-if="route.path !== '/join'" to="/join" color="primary" block>{{
                  t('nav.get_started')
                }}</UButton>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </header>

    <main class="flex-grow">
      <slot />
    </main>

    <PublicFooter />
  </div>
</template>

<script setup>
  import { useTranslate } from '@tolgee/vue'
  import PublicFooter from '~/components/layout/PublicFooter.vue'

  const route = useRoute()
  const { t } = useTranslate('common')

  useHead({
    htmlAttrs: { class: 'dark' },
    link: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap'
      }
    ]
  })
</script>
