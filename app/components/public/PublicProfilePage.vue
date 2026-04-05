<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top,#174033,transparent_18%),radial-gradient(circle_at_top_right,#1e293b,transparent_24%),linear-gradient(180deg,#050816,#0b1120_40%,#050816)] text-gray-100"
  >
    <div class="mx-auto max-w-7xl px-0 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div v-if="pending" class="space-y-6">
        <USkeleton class="mx-4 h-24 rounded-[1.5rem] sm:mx-0 sm:rounded-[2rem]" />
        <USkeleton class="mx-4 h-[560px] rounded-[1.5rem] sm:mx-0 sm:rounded-[2rem]" />
      </div>

      <div
        v-else-if="!publicProfile"
        class="mx-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-center shadow-sm shadow-black/20 sm:mx-0 sm:rounded-[2rem] sm:p-12"
      >
        <h1 class="text-2xl font-black tracking-tight text-white">
          {{ role === 'coach' ? 'Coach page not found' : 'Athlete page not found' }}
        </h1>
        <p class="mt-3 text-sm text-gray-400">This public page is unavailable.</p>
      </div>

      <div v-else class="space-y-6">
        <div
          class="mx-4 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/20 sm:mx-0 sm:rounded-[2rem] sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              {{ role === 'coach' ? 'Public Coach Minisite' : 'Public Athlete Page' }}
            </div>
            <div class="mt-1 text-sm text-gray-400">
              {{
                ownerMode
                  ? 'Edit mode is live. Your changes preview directly on this page.'
                  : 'Public view.'
              }}
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="viewer?.isOwner && !ownerMode"
              :to="`${route.path}?edit=1`"
              color="primary"
            >
              Edit page
            </UButton>
            <UButton
              v-if="viewer?.isOwner && ownerMode"
              :to="route.path"
              color="neutral"
              variant="soft"
            >
              Exit edit mode
            </UButton>
            <UButton
              v-if="viewer?.isOwner && ownerMode"
              color="neutral"
              variant="outline"
              @click="previewMode = previewMode === 'desktop' ? 'mobile' : 'desktop'"
            >
              {{ previewMode === 'desktop' ? 'Mobile preview' : 'Desktop preview' }}
            </UButton>
          </div>
        </div>

        <div class="transition-all" :class="previewMode === 'mobile' ? 'mx-auto max-w-md' : ''">
          <div class="space-y-6">
            <section
              v-for="section in visibleSections"
              :key="section.id"
              class="relative"
              :class="
                ownerMode
                  ? 'border-y-2 border-dashed border-emerald-400/40 bg-white/5 py-2 sm:rounded-[2rem] sm:border-2 sm:px-2 sm:py-2'
                  : ''
              "
            >
              <div
                v-if="ownerMode"
                class="mb-2 flex items-center justify-between rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300"
              >
                <span>{{ formatSectionLabel(section.type) }}</span>
                <span>{{ section.enabled ? 'Visible' : 'Hidden' }}</span>
              </div>

              <component :is="renderSection(section)" />
            </section>
          </div>
        </div>
      </div>
    </div>

    <PublicProfileEditorRail
      v-if="viewer?.isOwner"
      v-model:profile="editableProfile"
      :open="ownerMode"
      :role="role"
      :available-plans="availablePlans"
      :validation-errors="validationErrors"
      :saving="saving"
      :uploading="uploading"
      @close="closeEditMode"
      @save="saveProfile"
      @upload="handleUpload"
    />
  </div>
</template>

<script setup lang="ts">
  import { h } from 'vue'
  import { buildPublicCoachStartPath } from '#shared/public-presence'
  import { buildPublicPlanPath } from '#shared/public-plans'
  import { renderSafeMarkdown } from '~/utils/publicRichText'
  import {
    formatPublicPresenceApiError,
    getFirstValidationMessage,
    validatePublicProfileDraft
  } from '~/utils/publicPresenceValidation'
  import { getYouTubeEmbedUrl } from '~/utils/strengthExerciseLibrary'
  import PublicContactSection from './PublicContactSection.vue'
  import PublicFeaturedPlanShowcase from './PublicFeaturedPlanShowcase.vue'
  import PublicProfileEditorRail from './PublicProfileEditorRail.vue'

  const props = defineProps<{
    role: 'coach' | 'athlete'
  }>()

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const runtimeConfig = useRuntimeConfig()
  const requestUrl = useRequestURL()
  const attemptedSave = ref(false)
  const slug = computed(() => route.params.slug as string)
  const publicEndpoint = computed(() =>
    props.role === 'coach'
      ? `/api/public/coaches/${slug.value}`
      : `/api/public/athletes/${slug.value}`
  )
  const privateEndpoint = computed(() =>
    props.role === 'coach' ? '/api/profile/public/coach' : '/api/profile/public/athlete'
  )
  const validationErrors = computed(() =>
    attemptedSave.value && editableProfile.value
      ? validatePublicProfileDraft(editableProfile.value, props.role)
      : {}
  )

  const { data, pending, refresh } = await useFetch(publicEndpoint, {
    key: () => `${props.role}-public-profile-${slug.value}`
  })

  const publicProfile = computed(() => (data.value as any)?.profile || null)
  const viewer = computed(() => (data.value as any)?.viewer || null)
  const author = computed(() => (data.value as any)?.author || null)
  const availablePlans = computed(() => (data.value as any)?.plans || [])
  const featuredPlans = computed(() => (data.value as any)?.featuredPlans || [])
  const remainingPlans = computed(() => (data.value as any)?.remainingPlans || [])
  const ownerMode = computed(() => viewer.value?.isOwner && route.query.edit === '1')
  const previewMode = ref<'desktop' | 'mobile'>('desktop')
  const editableProfile = ref<any>(null)
  const saving = ref(false)
  const uploading = ref(false)

  watch(
    [ownerMode, viewer, publicProfile],
    async () => {
      if (!ownerMode.value) {
        editableProfile.value = publicProfile.value ? structuredClone(publicProfile.value) : null
        return
      }

      if (viewer.value?.isOwner) {
        const response = await $fetch(privateEndpoint.value)
        editableProfile.value = structuredClone((response as any).profile)
        if (props.role === 'coach' && (response as any).availablePlans && data.value) {
          ;(data.value as any).plans = (response as any).availablePlans
        }
      }
    },
    { immediate: true }
  )

  const resolvedProfile = computed(() =>
    ownerMode.value ? editableProfile.value : publicProfile.value
  )
  const coachJoinUrl = computed(() =>
    props.role === 'coach' ? buildPublicCoachStartPath(resolvedProfile.value?.settings?.slug) : null
  )
  const visibleSections = computed(() =>
    [...(resolvedProfile.value?.sections || [])]
      .filter((section: any) => section.enabled)
      .sort((a: any, b: any) => a.order - b.order)
  )

  const coverImage = computed(
    () => resolvedProfile.value?.media?.find((image: any) => image.kind === 'cover') || null
  )
  const galleryImages = computed(() =>
    [...(resolvedProfile.value?.media || [])]
      .filter((image: any) => image.kind === 'gallery')
      .sort((a: any, b: any) => a.order - b.order)
  )
  const sectionSurfaceClass =
    'rounded-none border-y border-white/10 bg-[#0f172a]/85 p-5 shadow-sm shadow-black/30 backdrop-blur sm:rounded-[2rem] sm:border sm:p-6'
  const sectionSurfaceSoftClass =
    'rounded-none border-y border-white/10 bg-[#09101d]/75 p-5 shadow-sm shadow-black/30 backdrop-blur sm:rounded-[2rem] sm:border sm:p-6'
  const sectionGradientClass =
    'rounded-none border-y border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(15,23,42,0.96))] p-5 shadow-sm shadow-black/30 backdrop-blur sm:rounded-[2rem] sm:border sm:p-8'
  const heroSurfaceClass =
    'overflow-hidden rounded-none border-y border-white/10 bg-[#0f172a]/90 shadow-sm shadow-black/30 backdrop-blur sm:rounded-[2.4rem] sm:border'
  const footerSurfaceClass =
    'rounded-none border-y border-default/70 bg-[linear-gradient(135deg,#052e16,#14532d)] p-6 text-white shadow-sm sm:rounded-[2.2rem] sm:border sm:p-8'

  const canonicalUrl = computed(
    () => `${runtimeConfig.public.siteUrl || requestUrl.origin}/${props.role}/${slug.value}`
  )

  useSeoMeta({
    title: () =>
      resolvedProfile.value?.settings?.seoTitle ||
      `${resolvedProfile.value?.settings?.displayName || author.value?.name || 'Profile'} | Coach Wattz`,
    description: () =>
      resolvedProfile.value?.settings?.seoDescription ||
      resolvedProfile.value?.settings?.bio ||
      `Explore this public ${props.role} page on Coach Wattz.`
  })

  useHead({
    link: [{ rel: 'canonical', href: canonicalUrl.value }]
  })

  function formatSectionLabel(type: string) {
    return (
      (
        {
          hero: 'Hero',
          credibility: 'Credibility',
          about: 'About',
          specialties: 'Specialties',
          credentials: 'Credentials',
          faq: 'FAQ',
          testimonials: 'Testimonials',
          gallery: 'Gallery',
          videoIntro: 'Video Introduction',
          socials: 'Socials',
          featuredPlans: 'Featured Plans',
          allPlans: 'All Plans',
          footerCta: 'Footer CTA',
          contact: 'Contact',
          story: 'Story',
          highlights: 'Highlights',
          achievements: 'Achievements',
          links: 'Links'
        } as Record<string, string>
      )[type] || type
    )
  }

  function renderSection(section: any) {
    const settings = resolvedProfile.value?.settings || {}

    if (section.type === 'hero') {
      return h('section', { class: heroSurfaceClass }, [
        coverImage.value
          ? h('img', {
              src: coverImage.value.url,
              alt: coverImage.value.alt || settings.displayName || 'Cover image',
              class: 'h-56 w-full object-cover'
            })
          : h('div', {
              class: 'h-56 w-full bg-[linear-gradient(135deg,#064e3b_0%,#0f172a_45%,#3f2a13_100%)]'
            }),
        h(
          'div',
          { class: 'grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-start' },
          [
            h(
              'div',
              { class: 'flex justify-center md:justify-start' },
              h(resolveComponent('UAvatar'), {
                src: author.value?.image || undefined,
                alt: settings.displayName || author.value?.name,
                size: '3xl',
                class: 'border-4 border-white/10 shadow-lg shadow-black/30'
              })
            ),
            h('div', { class: 'min-w-0' }, [
              h(
                'p',
                { class: 'text-xs font-black uppercase tracking-[0.22em] text-emerald-300' },
                props.role === 'coach' ? 'Coach profile' : 'Athlete profile'
              ),
              h(
                'h1',
                { class: 'mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl' },
                settings.displayName || author.value?.name || 'Public profile'
              ),
              settings.coachingBrand
                ? h(
                    'p',
                    { class: 'mt-2 text-xl font-semibold text-slate-300' },
                    settings.coachingBrand
                  )
                : null,
              settings.headline
                ? h(
                    'p',
                    { class: 'mt-4 max-w-3xl text-lg leading-8 text-slate-300' },
                    settings.headline
                  )
                : null,
              h('div', { class: 'mt-5 flex flex-wrap gap-2' }, [
                settings.location
                  ? h(
                      'span',
                      {
                        class:
                          'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300'
                      },
                      settings.location
                    )
                  : null,
                ...(props.role === 'athlete'
                  ? (settings.focusSports || []).map((sport: string) =>
                      h(
                        'span',
                        {
                          class:
                            'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300'
                        },
                        sport
                      )
                    )
                  : [])
              ])
            ]),
            props.role === 'coach' && coachJoinUrl.value
              ? h(
                  'div',
                  { class: 'flex md:justify-end' },
                  h(
                    resolveComponent('NuxtLink'),
                    {
                      to: coachJoinUrl.value,
                      class:
                        'inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 shadow-sm transition hover:opacity-90'
                    },
                    () => 'Work with me'
                  )
                )
              : null
          ]
        )
      ])
    }

    if (section.type === 'credibility') {
      return renderCredibilitySection(section)
    }

    if (section.type === 'about' || section.type === 'story') {
      return renderTextSection(
        section.headline || section.title || (section.type === 'about' ? 'About' : 'Story'),
        settings.bio,
        section.intro
      )
    }

    if (section.type === 'specialties') {
      return renderTagSection(
        section.headline || section.title || 'Specialties',
        settings.specialties || [],
        section.intro
      )
    }

    if (section.type === 'credentials') {
      return renderTagSection(
        section.headline || section.title || 'Credentials',
        settings.credentials || [],
        section.intro
      )
    }

    if (section.type === 'faq') {
      return renderFaqSection(
        section.headline || section.title || 'FAQ',
        section.content?.items || [],
        section.intro
      )
    }

    if (section.type === 'testimonials') {
      return renderQuoteSection(
        section.headline || section.title || 'Testimonials',
        resolvedProfile.value?.testimonials || [],
        section.intro
      )
    }

    if (section.type === 'gallery') {
      return renderGallerySection(
        section.headline || section.title || 'Gallery',
        galleryImages.value,
        section.intro
      )
    }

    if (section.type === 'videoIntro') {
      return renderVideoSection(
        section.headline || section.title || 'Video Introduction',
        section.content || {},
        section.intro
      )
    }

    if (section.type === 'featuredPlans') {
      if (!featuredPlans.value.length && !ownerMode.value) return h('div')
      return h('section', { class: 'space-y-5' }, [
        section.headline || section.intro
          ? h(
              'div',
              { class: 'px-4 sm:px-2' },
              renderSectionHeading(
                section.headline || section.title || 'Featured Plans',
                section.intro
              )
            )
          : null,
        h(PublicFeaturedPlanShowcase, {
          plans: featuredPlans.value
        })
      ])
    }

    if (section.type === 'allPlans') {
      return renderPlanSection(
        section.headline || section.title || 'All Plans',
        remainingPlans.value,
        section.intro
      )
    }

    if (section.type === 'footerCta') {
      return renderFooterCta(
        props.role === 'coach' ? coachJoinUrl.value : settings.ctaUrl,
        section.headline,
        section.intro,
        section.content?.buttonLabel
      )
    }

    if (section.type === 'highlights') {
      return renderHighlightSection(
        section.headline || section.title || 'Highlights',
        resolvedProfile.value?.highlights || [],
        section.intro
      )
    }

    if (section.type === 'achievements') {
      return renderAchievementSection(
        section.headline || section.title || 'Achievements',
        resolvedProfile.value?.achievements || [],
        section.intro
      )
    }

    if (section.type === 'links') {
      return renderLinksSection(
        settings.socialLinks || [],
        settings.websiteUrl,
        section.headline || section.title || 'Links',
        section.intro,
        section.content?.websiteLabel
      )
    }

    if (section.type === 'socials') {
      return renderLinksSection(
        settings.socialLinks || [],
        settings.websiteUrl,
        section.headline || section.title || 'Socials',
        section.intro || 'Follow, browse, or get in touch through the channels that fit best.',
        section.content?.websiteLabel
      )
    }

    if (section.type === 'contact') {
      return h(PublicContactSection, {
        role: props.role,
        slug: slug.value,
        title: section.headline || section.title || 'Contact',
        intro: section.intro,
        content: section.content || {},
        ownerMode: ownerMode.value
      })
    }

    return h('div')
  }

  function renderCardSection(title: string, cards: any[], intro?: string | null) {
    if (!cards.length && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h('div', { class: 'mt-5 grid gap-4 md:grid-cols-3' }, cards)
    ])
  }

  function formatEnumLabel(value?: string | null) {
    if (!value) return null
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function renderCredibilitySection(section: any) {
    const settings = resolvedProfile.value?.settings || {}
    const testimonials = resolvedProfile.value?.testimonials || []
    const specialties = settings.specialties || []
    const credentials = settings.credentials || []
    const eyebrow = section.content?.eyebrow || 'Proof points'
    const spotlightTitle = section.content?.spotlightTitle || 'Why athletes choose this coach'
    const spotlightBody =
      section.content?.spotlightBody ||
      'Use this section to turn trust into clarity: show who you help, what your coaching feels like, and why the next conversation is worth having.'
    const trustBullets = Array.isArray(section.content?.trustBullets)
      ? section.content.trustBullets
      : []
    const showSpotlight = section.content?.showSpotlight !== false
    const showSpecialties = section.content?.showSpecialties !== false
    const showCredentials = section.content?.showCredentials !== false
    const showSocialProof = section.content?.showSocialProof !== false
    const title = section.headline || section.title || 'Why athletes can trust this coach'
    const intro =
      section.intro ||
      'Blend measurable signals with real positioning. This section should feel like proof, not filler.'
    const sportsCovered = [
      ...new Set(
        availablePlans.value
          .map((plan: any) => formatEnumLabel(plan.primarySport) || plan.primarySport)
          .filter(Boolean)
      )
    ]
    const metrics = [
      {
        label: 'Published plans',
        value: availablePlans.value.length.toString(),
        blurb: availablePlans.value.length
          ? 'Public offers athletes can browse right away.'
          : 'Add plans to turn this into a stronger marketplace signal.'
      },
      {
        label: 'Sports covered',
        value: sportsCovered.length.toString(),
        blurb: sportsCovered.length
          ? sportsCovered.slice(0, 3).join(' • ')
          : 'Highlight your core coaching disciplines here.'
      },
      {
        label: 'Testimonials',
        value: testimonials.length.toString(),
        blurb: testimonials.length
          ? 'Social proof from athletes and collaborators.'
          : 'Add client quotes to strengthen trust.'
      }
    ]

    const hasContent =
      metrics.some((metric) => Number(metric.value) > 0) ||
      (showSpecialties && specialties.length > 0) ||
      (showCredentials && credentials.length > 0) ||
      (showSocialProof && testimonials.length > 0) ||
      (showSpotlight && Boolean(spotlightBody)) ||
      trustBullets.length > 0

    if (!hasContent && !ownerMode.value) return h('div')

    return h(
      'section',
      {
        class: sectionGradientClass
      },
      [
        h('div', { class: 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between' }, [
          h('div', { class: 'max-w-2xl' }, [
            eyebrow
              ? h(
                  'div',
                  { class: 'text-xs font-black uppercase tracking-[0.22em] text-emerald-300' },
                  eyebrow
                )
              : null,
            h('h2', { class: 'mt-2 text-3xl font-black tracking-tight text-white' }, title),
            intro ? h('p', { class: 'mt-3 text-sm leading-7 text-slate-300' }, intro) : null
          ]),
          coachJoinUrl.value
            ? h(
                resolveComponent('NuxtLink'),
                {
                  to: coachJoinUrl.value,
                  class:
                    'inline-flex items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-400/15'
                },
                () => 'Start a conversation'
              )
            : null
        ]),
        h(
          'div',
          { class: 'mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]' },
          [
            h('div', { class: 'space-y-4' }, [
              showSpotlight || ownerMode.value
                ? h(
                    'div',
                    {
                      class:
                        'rounded-[1.4rem] border border-emerald-300/15 bg-black/20 p-5 sm:rounded-[1.8rem] sm:p-6'
                    },
                    [
                      h(
                        'div',
                        {
                          class: 'flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'
                        },
                        [
                          h('div', { class: 'max-w-2xl' }, [
                            h(
                              'div',
                              {
                                class:
                                  'text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300/90'
                              },
                              spotlightTitle
                            ),
                            showSpotlight
                              ? h('div', { class: 'mt-3 text-sm leading-7 text-slate-200' }, [
                                  renderRichTextBlock(spotlightBody)
                                ])
                              : ownerMode.value
                                ? h(
                                    'p',
                                    { class: 'mt-3 text-sm leading-6 text-slate-400' },
                                    'Enable spotlight to show this positioning block on the public page.'
                                  )
                                : null
                          ]),
                          h(
                            'div',
                            {
                              class: 'grid min-w-0 gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1'
                            },
                            metrics.map((metric) =>
                              h(
                                'div',
                                {
                                  class:
                                    'rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-4'
                                },
                                [
                                  h(
                                    'div',
                                    {
                                      class:
                                        'text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'
                                    },
                                    metric.label
                                  ),
                                  h(
                                    'div',
                                    { class: 'mt-2 text-3xl font-black tracking-tight text-white' },
                                    metric.value
                                  ),
                                  h(
                                    'p',
                                    { class: 'mt-2 text-sm leading-6 text-slate-300' },
                                    metric.blurb
                                  )
                                ]
                              )
                            )
                          )
                        ]
                      )
                    ]
                  )
                : null,
              trustBullets.length || ownerMode.value
                ? h('div', { class: 'rounded-[1.6rem] border border-white/10 bg-black/20 p-5' }, [
                    h(
                      'div',
                      {
                        class: 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'
                      },
                      'Trust markers'
                    ),
                    h(
                      'div',
                      { class: 'mt-4 grid gap-3 sm:grid-cols-2' },
                      (trustBullets.length
                        ? trustBullets
                        : [
                            'Add short trust markers in edit mode to make your coaching feel specific and low-friction.'
                          ]
                      ).map((item: string) =>
                        h(
                          'div',
                          {
                            class:
                              'rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-200'
                          },
                          [
                            h('div', { class: 'flex items-start gap-3' }, [
                              h('span', {
                                class: 'mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300/80'
                              }),
                              h('span', item)
                            ])
                          ]
                        )
                      )
                    )
                  ])
                : null
            ]),
            h('div', { class: 'space-y-4' }, [
              (showSpecialties && specialties.length) || ownerMode.value
                ? h('div', { class: 'rounded-[1.6rem] border border-white/10 bg-black/20 p-5' }, [
                    h(
                      'div',
                      {
                        class: 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'
                      },
                      'Specialties'
                    ),
                    h(
                      'div',
                      { class: 'mt-4 flex flex-wrap gap-2' },
                      (showSpecialties && specialties.length
                        ? specialties.slice(0, 6)
                        : ['Add specialties in edit mode']
                      ).map((item: string) =>
                        h(
                          'span',
                          {
                            class:
                              'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200'
                          },
                          item
                        )
                      )
                    )
                  ])
                : null,
              (showCredentials && credentials.length) ||
              (showSocialProof && testimonials.length) ||
              ownerMode.value
                ? h('div', { class: 'rounded-[1.6rem] border border-white/10 bg-black/20 p-5' }, [
                    h(
                      'div',
                      {
                        class:
                          'grid gap-4 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-start'
                      },
                      [
                        showCredentials || ownerMode.value
                          ? h('div', { class: 'space-y-3' }, [
                              h(
                                'div',
                                {
                                  class:
                                    'text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'
                                },
                                'Credentials'
                              ),
                              ...(showCredentials && credentials.length
                                ? credentials
                                    .slice(0, 4)
                                    .map((credential: string) =>
                                      h(
                                        'div',
                                        {
                                          class:
                                            'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200'
                                        },
                                        credential
                                      )
                                    )
                                : ownerMode.value && showCredentials
                                  ? [
                                      h(
                                        'p',
                                        { class: 'text-sm leading-6 text-slate-400' },
                                        'Add certifications, education, or standout experience in edit mode.'
                                      )
                                    ]
                                  : [])
                            ])
                          : null,
                        showSocialProof || ownerMode.value
                          ? h('div', { class: 'space-y-3' }, [
                              h(
                                'div',
                                {
                                  class:
                                    'text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'
                                },
                                'Social proof'
                              ),
                              showSocialProof && testimonials.length
                                ? h(
                                    'blockquote',
                                    {
                                      class:
                                        'rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4'
                                    },
                                    [
                                      h(
                                        'p',
                                        { class: 'text-sm leading-7 text-slate-200' },
                                        `“${testimonials[0].quote}”`
                                      ),
                                      h(
                                        'footer',
                                        { class: 'mt-3 text-sm font-semibold text-white' },
                                        testimonials[0].authorName || 'Athlete'
                                      ),
                                      testimonials[0].authorRole
                                        ? h(
                                            'div',
                                            { class: 'text-xs text-slate-400' },
                                            testimonials[0].authorRole
                                          )
                                        : null
                                    ]
                                  )
                                : ownerMode.value && showSocialProof
                                  ? h(
                                      'p',
                                      { class: 'text-sm leading-6 text-slate-400' },
                                      'Add a testimonial in edit mode to strengthen trust instantly.'
                                    )
                                  : null
                            ])
                          : null
                      ]
                    )
                  ])
                : null
            ])
          ]
        )
      ]
    )
  }

  function renderSectionHeading(title: string, intro?: string | null) {
    return [
      h('h2', { class: 'text-2xl font-black tracking-tight text-white' }, title),
      intro ? h('p', { class: 'mt-3 max-w-3xl text-sm leading-7 text-slate-400' }, intro) : null
    ]
  }

  function renderRichTextBlock(text?: string | null) {
    const html = renderSafeMarkdown(text)
    return h('div', {
      class:
        'prose prose-invert prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-img:my-6 prose-img:rounded-2xl prose-img:border prose-img:border-white/10 prose-img:shadow-sm prose-img:shadow-black/30 max-w-none leading-8',
      innerHTML: html || '<p>Add copy for this section in edit mode.</p>'
    })
  }

  function renderTextSection(title: string, text?: string | null, intro?: string | null) {
    if (!text && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h('div', { class: 'mt-4' }, [renderRichTextBlock(text)])
    ])
  }

  function renderTagSection(title: string, items: string[], intro?: string | null) {
    if (!items.length && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h(
        'div',
        { class: 'mt-4 flex flex-wrap gap-2' },
        (items.length ? items : ['Add items in edit mode']).map((item) =>
          h(
            'span',
            {
              class:
                'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300'
            },
            item
          )
        )
      )
    ])
  }

  function renderFaqSection(title: string, items: any[], intro?: string | null) {
    if (!items.length && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h(
        'div',
        { class: 'mt-5 space-y-3' },
        (items.length
          ? items
          : [
              {
                question: 'Add frequently asked questions in edit mode',
                answer: 'Use this section to answer common objections and explain how you work.'
              }
            ]
        ).map((item: any) =>
          h('details', { class: 'rounded-2xl border border-white/10 bg-white/5 p-5 group' }, [
            h(
              'summary',
              { class: 'cursor-pointer list-none text-base font-semibold text-white' },
              item.question
            ),
            h('div', { class: 'mt-3 text-sm leading-7 text-slate-300' }, [
              renderRichTextBlock(item.answer)
            ])
          ])
        )
      )
    ])
  }

  function renderQuoteSection(title: string, items: any[], intro?: string | null) {
    if (!items.length && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h(
        'div',
        { class: 'mt-5 grid gap-4 md:grid-cols-2' },
        (items.length
          ? items
          : [{ quote: 'Add testimonials in edit mode.', authorName: 'You' }]
        ).map((item: any) =>
          h('blockquote', { class: 'rounded-2xl border border-white/10 bg-white/5 p-5' }, [
            h('p', { class: 'text-base leading-7 text-slate-300' }, `“${item.quote}”`),
            h(
              'footer',
              { class: 'mt-4 text-sm font-semibold text-white' },
              item.authorName || 'Client'
            ),
            item.authorRole ? h('div', { class: 'text-xs text-slate-400' }, item.authorRole) : null
          ])
        )
      )
    ])
  }

  function renderGallerySection(title: string, items: any[], intro?: string | null) {
    if (!items.length && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h(
        'div',
        { class: 'mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3' },
        (items.length
          ? items
          : [{ url: '/images/screenshots/image.png', caption: 'Add gallery images in edit mode.' }]
        ).map((item: any) =>
          h('figure', { class: 'overflow-hidden rounded-2xl border border-white/10 bg-white/5' }, [
            h('img', { src: item.url, alt: item.alt || title, class: 'h-48 w-full object-cover' }),
            item.caption
              ? h('figcaption', { class: 'px-4 py-3 text-sm text-slate-300' }, item.caption)
              : null
          ])
        )
      )
    ])
  }

  function renderVideoSection(title: string, content: any, intro?: string | null) {
    const embedUrl = getYouTubeEmbedUrl(content?.videoUrl)
    const caption = typeof content?.caption === 'string' ? content.caption : null
    if (!embedUrl && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      embedUrl
        ? h(
            'div',
            { class: 'mt-5 overflow-hidden rounded-[1.6rem] border border-white/10 bg-black' },
            [
              h('div', { class: 'aspect-video w-full' }, [
                h('iframe', {
                  src: embedUrl,
                  title: title,
                  class: 'h-full w-full',
                  allow:
                    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
                  allowfullscreen: true,
                  referrerpolicy: 'strict-origin-when-cross-origin'
                })
              ])
            ]
          )
        : h(
            'div',
            {
              class:
                'mt-5 rounded-[1.6rem] border border-dashed border-white/15 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-400'
            },
            'Add a YouTube video in edit mode to introduce this page with motion and personality.'
          ),
      caption ? h('p', { class: 'mt-4 text-sm leading-7 text-slate-300' }, caption) : null
    ])
  }

  function renderPlanSection(title: string, plans: any[], intro?: string | null) {
    if (!plans.length && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceSoftClass }, [
      h('div', { class: 'flex items-center justify-between gap-3' }, [
        h('div', { class: 'space-y-2' }, [...renderSectionHeading(title, intro)]),
        h('span', { class: 'text-sm font-semibold text-slate-400' }, `${plans.length} plans`)
      ]),
      h(
        'div',
        { class: 'mt-5 space-y-4' },
        (plans.length
          ? plans
          : [
              {
                name: 'Select plans in edit mode',
                publicHeadline: 'Feature your strongest offers here.'
              }
            ]
        ).map((plan: any) =>
          h(
            resolveComponent('NuxtLink'),
            {
              to: plan.slug ? buildPublicPlanPath(plan) : '#',
              class:
                'block rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-emerald-400/40'
            },
            () => [
              h('div', { class: 'text-lg font-bold text-white' }, plan.name),
              h(
                'p',
                { class: 'mt-2 text-sm text-slate-300' },
                plan.publicHeadline || plan.publicDescription || 'No summary yet.'
              )
            ]
          )
        )
      )
    ])
  }

  function renderFooterCta(
    ctaUrl?: string | null,
    headline?: string | null,
    intro?: string | null,
    buttonLabel?: string | null
  ) {
    if (!ctaUrl && !ownerMode.value) return h('div')
    return h('section', { class: footerSurfaceClass }, [
      h(
        'h2',
        { class: 'text-3xl font-black tracking-tight' },
        headline || (props.role === 'coach' ? 'Ready to work together?' : 'Stay connected')
      ),
      h(
        'p',
        { class: 'mt-3 max-w-2xl text-sm text-emerald-50/90' },
        intro ||
          (props.role === 'coach'
            ? 'Use your strongest conversion CTA here so visitors know the next step.'
            : 'Add a call to action or keep this section disabled.')
      ),
      ctaUrl
        ? h(
            'a',
            {
              href: ctaUrl,
              target: '_blank',
              rel: 'noopener noreferrer',
              class:
                'mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-950'
            },
            buttonLabel || 'Open link'
          )
        : null
    ])
  }

  function renderHighlightSection(title: string, items: any[], intro?: string | null) {
    if (!items.length && !ownerMode.value) return h('div')
    return renderCardSection(
      title,
      (items.length
        ? items
        : [
            {
              title: 'Add highlights in edit mode',
              value: '',
              description: 'Selected milestones, identity, or training focus.'
            }
          ]
      ).map((item: any) =>
        h('div', { class: 'rounded-2xl border border-white/10 bg-white/5 p-5' }, [
          h('div', { class: 'text-sm font-semibold text-white' }, item.title),
          item.value
            ? h('div', { class: 'mt-2 text-3xl font-black text-white' }, item.value)
            : null,
          item.description
            ? h('div', { class: 'mt-2 text-sm text-slate-300' }, item.description)
            : null
        ])
      ),
      intro
    )
  }

  function renderAchievementSection(title: string, items: any[], intro?: string | null) {
    if (!items.length && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h(
        'div',
        { class: 'mt-5 space-y-3' },
        (items.length
          ? items
          : [
              {
                title: 'Add achievements in edit mode',
                year: '',
                description: 'This is where race results, milestones, and standout efforts go.'
              }
            ]
        ).map((item: any) =>
          h('div', { class: 'rounded-2xl border border-white/10 bg-white/5 p-5' }, [
            h('div', { class: 'flex items-center justify-between gap-3' }, [
              h('div', { class: 'text-lg font-bold text-white' }, item.title),
              item.year
                ? h(
                    'div',
                    { class: 'text-xs font-semibold uppercase tracking-[0.18em] text-slate-400' },
                    item.year
                  )
                : null
            ]),
            item.description
              ? h('p', { class: 'mt-2 text-sm text-slate-300' }, item.description)
              : null
          ])
        )
      )
    ])
  }

  function renderLinksSection(
    links: any[],
    websiteUrl?: string | null,
    title = 'Links',
    intro?: string | null,
    websiteLabel?: string | null
  ) {
    const allLinks = [...links]
    if (websiteUrl) {
      allLinks.unshift({ label: websiteLabel || 'Website', url: websiteUrl })
    }
    if (!allLinks.length && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h(
        'div',
        { class: 'mt-4 flex flex-wrap gap-2' },
        (allLinks.length ? allLinks : [{ label: 'Add links in edit mode', url: '#' }]).map(
          (link: any) =>
            h(
              'a',
              {
                href: link.url,
                target: link.url === '#' ? undefined : '_blank',
                rel: 'noopener noreferrer',
                class:
                  'rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300'
              },
              link.label
            )
        )
      )
    ])
  }

  async function saveProfile() {
    if (!editableProfile.value) return
    attemptedSave.value = true
    if (Object.keys(validationErrors.value).length) {
      toast.add({
        title: 'Check the form',
        description: getFirstValidationMessage(validationErrors.value),
        color: 'warning'
      })
      return
    }

    saving.value = true
    try {
      const response = await $fetch(privateEndpoint.value, {
        method: 'PATCH',
        body: editableProfile.value
      })
      editableProfile.value = structuredClone((response as any).profile)
      attemptedSave.value = false
      await refresh()
      toast.add({
        title: 'Public page saved',
        description: 'Your latest edits are now reflected in the profile.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Save failed',
        description: formatPublicPresenceApiError(error, 'Could not save this page.'),
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }

  async function handleUpload(kind: 'cover' | 'gallery', file: File) {
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await $fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      })
      const mediaItem = {
        id: `${kind}-${Math.random().toString(36).slice(2, 10)}`,
        type: 'upload',
        url: (result as any).url,
        alt: editableProfile.value?.settings?.displayName || '',
        caption: null,
        kind,
        order: kind === 'gallery' ? galleryImages.value.length : 0
      }
      if (kind === 'cover') {
        editableProfile.value.media = [
          ...editableProfile.value.media.filter((image: any) => image.kind !== 'cover'),
          mediaItem
        ]
      } else {
        editableProfile.value.media.push(mediaItem)
      }
    } catch (error: any) {
      toast.add({
        title: 'Upload failed',
        description: error.data?.message || 'Could not upload this image.',
        color: 'error'
      })
    } finally {
      uploading.value = false
    }
  }

  function closeEditMode() {
    router.push({ path: route.path, query: { ...route.query, edit: undefined } })
  }
</script>
