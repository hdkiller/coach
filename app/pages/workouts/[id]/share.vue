<template>
  <UDashboardPanel id="workout-share-preview">
    <template #header>
      <UDashboardNavbar :title="pageTitle">
        <template #leading>
          <UButton
            icon="i-heroicons-arrow-left"
            color="neutral"
            variant="ghost"
            @click="navigateTo(`/workouts/${workoutId}`)"
          >
            Back
          </UButton>
        </template>

        <template #right>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-arrow-down-tray"
              color="neutral"
              variant="outline"
              :disabled="!imageVariants.length"
              @click="downloadAll"
            >
              Download All
            </UButton>
            <UButton
              icon="i-heroicons-eye"
              color="neutral"
              variant="outline"
              :to="shareLink || undefined"
              :disabled="!shareLink"
              target="_blank"
            >
              Open Share
            </UButton>
            <UButton
              icon="i-heroicons-arrow-path"
              color="primary"
              variant="solid"
              :loading="loading || generatingShareLink"
              @click="refreshAll"
            >
              Refresh
            </UButton>
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 sm:p-6">
        <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <UCard v-for="i in 6" :key="i">
            <USkeleton class="aspect-[4/5] w-full rounded-2xl" />
            <div class="mt-4 space-y-2">
              <USkeleton class="h-5 w-32" />
              <USkeleton class="h-4 w-full" />
            </div>
          </UCard>
        </div>

        <UAlert
          v-else-if="error"
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          title="Failed to load share preview"
          :description="error"
        />

        <template v-else>
          <UCard>
            <div class="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div class="space-y-3">
                <div>
                  <p class="text-xs font-black uppercase tracking-[0.2em] text-primary-500">
                    Share Preview Lab
                  </p>
                  <h1
                    class="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white"
                  >
                    {{ workout?.title || 'Workout Share Variants' }}
                  </h1>
                </div>
                <p class="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                  Compare cinematic story, square, and post exports side-by-side before sharing.
                </p>
              </div>

              <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[620px]">
                <div class="space-y-2">
                  <p
                    class="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500"
                  >
                    Share Link
                  </p>
                  <UInput
                    :model-value="shareLink"
                    readonly
                    :ui="{ base: 'font-medium' }"
                    @focus="selectInput"
                  >
                    <template #trailing>
                      <UButton
                        icon="i-heroicons-clipboard"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        :disabled="!shareLink"
                        @click="copyShareLink"
                      >
                        Copy
                      </UButton>
                    </template>
                  </UInput>
                </div>

                <div class="space-y-2">
                  <p
                    class="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500"
                  >
                    Layout
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <UButton
                      v-for="option in ratioOptions"
                      :key="option.value"
                      :color="selectedRatio === option.value ? 'primary' : 'neutral'"
                      :variant="selectedRatio === option.value ? 'solid' : 'outline'"
                      size="sm"
                      @click="selectedRatio = option.value"
                    >
                      {{ option.label }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <UCard
              v-for="item in imageVariants"
              :key="item.id"
              :ui="{ body: 'p-4', root: 'overflow-hidden' }"
            >
              <div class="group relative space-y-4">
                <div
                  class="share-card-container relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 dark:border-white/10 dark:bg-gray-950"
                  :class="item.previewClass"
                >
                  <img
                    :src="item.url"
                    :alt="item.label"
                    class="block w-full object-contain"
                    :class="item.previewImageClass"
                  />

                  <div
                    class="pointer-events-none absolute right-4 top-4 hidden rounded-[28px] border border-white/15 bg-black/70 p-2 shadow-2xl backdrop-blur-sm transition duration-200 group-hover:block"
                  >
                    <div class="rounded-[22px] border border-white/10 bg-black p-2">
                      <div class="overflow-hidden rounded-[18px] border border-white/10 bg-black">
                        <img
                          :src="item.storyPreviewUrl"
                          alt="Story preview"
                          class="h-44 w-24 object-cover"
                        />
                      </div>
                    </div>
                    <p
                      class="mt-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/70"
                    >
                      Story Frame
                    </p>
                  </div>
                </div>

                <div class="flex items-start justify-between gap-3">
                  <div class="space-y-1">
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">
                      {{ item.label }}
                    </h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ item.meta }}
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <UButton
                      icon="i-heroicons-arrow-down-tray"
                      color="neutral"
                      variant="soft"
                      size="sm"
                      @click="downloadImage(item)"
                    >
                      Save
                    </UButton>
                    <UButton
                      icon="i-heroicons-arrow-top-right-on-square"
                      color="neutral"
                      variant="soft"
                      size="sm"
                      :to="item.url"
                      target="_blank"
                    >
                      Open
                    </UButton>
                  </div>
                </div>

                <UInput
                  :model-value="absoluteUrl(item.url)"
                  readonly
                  :ui="{ base: 'text-xs' }"
                  @focus="selectInput"
                />
              </div>
            </UCard>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
  definePageMeta({
    middleware: 'auth'
  })

  useHead({
    title: 'Workout Share Preview'
  })

  type ShareRatio = 'story' | 'square' | 'post'
  type ShareStyle = 'map' | 'poster' | 'crest' | 'pulse'
  type ShareVariant = 'default' | 'flat' | 'transparent'

  interface PreviewVariant {
    id: string
    label: string
    style: ShareStyle
    variant: ShareVariant
    transparent: boolean
  }

  const route = useRoute()
  const toast = useToast()
  const config = useRuntimeConfig()

  const workoutId = computed(() => route.params.id as string)
  const workout = ref<any>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const selectedRatio = ref<ShareRatio>('story')
  const imageRenderVersion = '2026-03-08c'

  const ratioOptions = [
    { label: 'Story 9:16', value: 'story' },
    { label: 'Square 1:1', value: 'square' },
    { label: 'Post 4:5', value: 'post' }
  ] as const

  const previewVariants: PreviewVariant[] = [
    { id: 'default', label: 'Standard', style: 'map', variant: 'default', transparent: false },
    { id: 'flat', label: 'Flat', style: 'map', variant: 'flat', transparent: false },
    {
      id: 'transparent',
      label: 'Transparent',
      style: 'map',
      variant: 'transparent',
      transparent: true
    },
    { id: 'poster', label: 'Poster', style: 'poster', variant: 'default', transparent: false },
    {
      id: 'poster-transparent',
      label: 'Poster Clear',
      style: 'poster',
      variant: 'transparent',
      transparent: true
    },
    { id: 'crest', label: 'Crest', style: 'crest', variant: 'default', transparent: false },
    {
      id: 'crest-transparent',
      label: 'Crest Clear',
      style: 'crest',
      variant: 'transparent',
      transparent: true
    },
    { id: 'pulse', label: 'Pulse', style: 'pulse', variant: 'default', transparent: false },
    {
      id: 'pulse-transparent',
      label: 'Pulse Clear',
      style: 'pulse',
      variant: 'transparent',
      transparent: true
    }
  ]

  const { shareLink, generatingShareLink, generateShareLink } = useResourceShare(
    'WORKOUT',
    workoutId
  )

  const checkerboardClass =
    'bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6),linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_75%,#f3f4f6_75%,#f3f4f6)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] dark:bg-[linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06)),linear-gradient(45deg,rgba(255,255,255,0.06)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.06)_75%,rgba(255,255,255,0.06))] dark:bg-[length:24px_24px] dark:bg-[position:0_0,12px_12px]'

  const pageTitle = computed(() =>
    workout.value?.title ? `Share Preview: ${workout.value.title}` : 'Workout Share Preview'
  )

  const shareToken = computed(() => {
    if (!shareLink.value) return ''
    const parts = shareLink.value.split('/').filter(Boolean)
    return parts[parts.length - 1] || ''
  })

  const imageVariants = computed(() => {
    if (!shareToken.value) return []

    return previewVariants.map((item) => ({
      ...item,
      meta: `${selectedRatio.value.toUpperCase()} • style=${item.style} • variant=${item.variant}`,
      url: buildImageUrl(item.style, item.variant, selectedRatio.value),
      storyPreviewUrl: buildImageUrl(item.style, item.variant, 'story'),
      previewClass: item.transparent ? checkerboardClass : '',
      previewImageClass:
        selectedRatio.value === 'story'
          ? 'aspect-[9/16]'
          : selectedRatio.value === 'square'
            ? 'aspect-square'
            : 'aspect-[4/5]'
    }))
  })

  function buildImageUrl(style: ShareStyle, variant: ShareVariant, ratio: ShareRatio) {
    const params = new URLSearchParams()
    if (style !== 'map') params.set('style', style)
    if (variant !== 'default') params.set('variant', variant)
    if (ratio !== 'story') params.set('ratio', ratio)
    params.set('v', imageRenderVersion)
    const query = params.toString()
    return `/api/share/workouts/${shareToken.value}/image${query ? `?${query}` : ''}`
  }

  function absoluteUrl(path: string) {
    const siteUrl = config.public.siteUrl || 'http://localhost:3000'
    return `${siteUrl}${path}`
  }

  function selectInput(event: FocusEvent) {
    ;(event.target as HTMLInputElement).select()
  }

  async function copyShareLink() {
    if (!shareLink.value || !import.meta.client) return
    await navigator.clipboard.writeText(shareLink.value)
    toast.add({
      title: 'Copied',
      description: 'Share link copied to clipboard.',
      color: 'success'
    })
  }

  async function downloadImage(item: { label: string; url: string }) {
    if (!import.meta.client) return

    const link = document.createElement('a')
    link.href = item.url
    link.download = `${slugify(item.label)}-${selectedRatio.value}.png`
    link.rel = 'noopener'
    document.body.append(link)
    link.click()
    link.remove()
  }

  async function downloadAll() {
    for (const item of imageVariants.value) {
      await downloadImage(item)
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
  }

  async function fetchWorkout() {
    loading.value = true
    error.value = null
    try {
      workout.value = await $fetch(`/api/workouts/${workoutId.value}`)
      await generateShareLink({ expiresIn: null, forceNew: false })
    } catch (e: any) {
      error.value = e.data?.message || e.message || 'Failed to load workout share preview.'
    } finally {
      loading.value = false
    }
  }

  async function refreshAll() {
    await fetchWorkout()
  }

  function slugify(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  await fetchWorkout()
</script>
