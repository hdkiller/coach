<template>
  <div
    class="min-h-screen flex flex-col font-sans bg-[oklch(12%_0.015_155)] text-gray-100 overflow-x-clip"
  >
    <header
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b"
      :class="[
        y > 50
          ? 'bg-black/60 backdrop-blur-lg border-white/10 shadow-lg'
          : 'bg-transparent border-transparent'
      ]"
    >
      <div
        class="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <NuxtLink to="/" class="flex shrink-0 items-center transition-opacity hover:opacity-90">
          <img
            src="/media/coach_watts_text_cropped.webp"
            alt="Journey Endurance Coaching"
            class="h-10 w-auto object-contain sm:h-12"
          />
        </NuxtLink>

        <nav
          class="hidden items-center gap-8 text-sm font-medium text-gray-400 lg:flex"
          aria-label="Primary"
        >
          <NuxtLink to="/#why-us" class="whitespace-nowrap transition-colors hover:text-white"
            >Why Us</NuxtLink
          >
          <NuxtLink
            to="/#pricing"
            class="flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-white"
          >
            Pricing
            <span
              class="inline-flex items-center justify-center rounded-sm bg-primary-500/20 text-primary-400 px-1.5 py-0.5 text-xs font-bold leading-none"
              >START</span
            >
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <template v-if="!isAuthPage && isSignedIn">
            <UButton to="/dashboard" color="primary" class="whitespace-nowrap">Dashboard</UButton>
          </template>
          <template v-else-if="!isAuthPage">
            <UButton
              to="/login"
              variant="ghost"
              color="neutral"
              class="hidden sm:flex whitespace-nowrap"
              >Sign In</UButton
            >
            <UButton
              to="/join"
              color="primary"
              class="whitespace-nowrap transition-all duration-300"
            >
              {{ headerCtaText }}
            </UButton>
          </template>

          <UPopover class="lg:hidden">
            <UButton icon="i-heroicons-bars-3" color="neutral" variant="ghost" />
            <template #content>
              <div class="flex w-48 flex-col gap-4 p-4">
                <NuxtLink
                  to="/#why-us"
                  class="text-sm font-medium whitespace-nowrap transition-colors hover:text-primary"
                  >Why Us</NuxtLink
                >
                <NuxtLink
                  to="/#pricing"
                  class="flex items-center justify-between text-sm font-medium whitespace-nowrap transition-colors hover:text-primary"
                >
                  Pricing
                </NuxtLink>
                <template v-if="!isAuthPage && isSignedIn">
                  <hr class="border-white/10" />
                  <UButton to="/dashboard" color="primary" block>Dashboard</UButton>
                </template>
                <template v-else-if="!isAuthPage">
                  <hr class="border-white/10" />
                  <UButton to="/login" variant="ghost" color="neutral" block>Sign In</UButton>
                  <UButton to="/join" color="primary" block>{{ headerCtaText }}</UButton>
                </template>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </header>

    <main class="flex-grow pt-16">
      <slot />
    </main>

    <PublicFooter v-if="!isAuthPage" />
  </div>
</template>

<script setup>
  import { useWindowScroll } from '@vueuse/core'
  import PublicFooter from '~/components/layout/PublicFooter.vue'

  const { y } = useWindowScroll()
  const headerCtaText = useState('headerCtaText', () => 'Join the Community')

  const route = useRoute()
  const { data: authData, status: authStatus } = useAuth()
  const isAuthPage = computed(() => route.path === '/join' || route.path === '/login')
  const isSignedIn = computed(
    () => authStatus.value === 'authenticated' || Boolean(authData.value?.user)
  )

  useHead({
    link: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap'
      }
    ]
  })

  const colorMode = useColorMode()
  const prevPreference = colorMode.preference
  colorMode.preference = 'dark'
  onBeforeUnmount(() => {
    colorMode.preference = prevPreference
  })
</script>
