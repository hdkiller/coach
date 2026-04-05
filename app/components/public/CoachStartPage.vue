<template>
  <div
    class="min-h-screen bg-[radial-gradient(circle_at_top,#174033,transparent_18%),radial-gradient(circle_at_top_right,#1e293b,transparent_24%),linear-gradient(180deg,#050816,#0b1120_40%,#050816)] text-gray-100"
  >
    <div class="mx-auto max-w-6xl px-0 py-4 sm:px-6 sm:py-8 lg:px-8">
      <div v-if="pending" class="space-y-6">
        <USkeleton class="mx-4 h-24 rounded-[1.5rem] sm:mx-0 sm:rounded-[2rem]" />
        <USkeleton class="mx-4 h-[640px] rounded-[1.5rem] sm:mx-0 sm:rounded-[2rem]" />
      </div>

      <div
        v-else-if="!startExperience"
        class="mx-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-8 text-center shadow-sm shadow-black/20 sm:mx-0 sm:rounded-[2rem] sm:p-12"
      >
        <h1 class="text-2xl font-black tracking-tight text-white">Coach start page not found</h1>
        <p class="mt-3 text-sm text-gray-400">This start page is unavailable.</p>
      </div>

      <div v-else class="space-y-6">
        <div
          class="mx-4 flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/20 sm:mx-0 sm:rounded-[2rem] sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Coach Start Page
            </div>
            <div class="mt-1 text-sm text-gray-400">
              {{
                ownerMode
                  ? 'Edit mode is live. Your changes preview directly on this page.'
                  : 'Request-based onboarding for this coach.'
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
          </div>
        </div>

        <div
          class="overflow-hidden rounded-none border-y border-white/10 bg-white/5 shadow-sm shadow-black/20 sm:rounded-[2rem] sm:border"
        >
          <section
            class="relative border-b border-white/10 px-4 py-8 sm:px-10 sm:py-14"
            :class="heroImageUrl ? 'bg-cover bg-center' : ''"
            :style="
              heroImageUrl
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(5,8,22,0.45), rgba(5,8,22,0.92)), url(${heroImageUrl})`
                  }
                : undefined
            "
          >
            <div
              v-if="!heroImageUrl"
              class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_28%),linear-gradient(180deg,rgba(5,8,22,0.72),rgba(5,8,22,0.96))]"
            />

            <div class="relative z-10 max-w-4xl space-y-6">
              <div class="flex items-center gap-4">
                <UAvatar
                  :src="startExperience.coach.image || undefined"
                  :alt="startExperience.coach.name"
                  size="3xl"
                  class="ring-4 ring-emerald-400/20"
                />
                <div>
                  <div class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                    {{ heroSection?.content?.eyebrow || 'Start with this coach' }}
                  </div>
                  <div class="mt-2 text-2xl font-black tracking-tight text-white">
                    {{ startExperience.coach.name }}
                  </div>
                  <div
                    v-if="startExperience.coach.brand || startExperience.coach.headline"
                    class="mt-1 text-sm text-slate-300"
                  >
                    {{ startExperience.coach.brand || startExperience.coach.headline }}
                  </div>
                </div>
              </div>

              <div class="space-y-3">
                <h1 class="text-3xl font-black tracking-tight text-white sm:text-5xl">
                  {{ startExperience.startPage.settings.headline }}
                </h1>
                <p class="max-w-2xl text-base leading-7 text-slate-300">
                  {{ startExperience.startPage.settings.intro }}
                </p>
              </div>

              <div class="flex flex-wrap gap-3">
                <UButton color="primary" size="xl" class="justify-center" @click="scrollToForm">
                  {{ submitButtonLabel }}
                </UButton>
                <UButton
                  v-if="!session"
                  :to="loginUrl"
                  color="neutral"
                  variant="outline"
                  size="xl"
                  class="justify-center"
                >
                  Log in instead
                </UButton>
                <UButton
                  v-else-if="startExperience.coach.profileUrl"
                  :to="startExperience.coach.profileUrl"
                  color="neutral"
                  variant="outline"
                  size="xl"
                  class="justify-center"
                >
                  View coach page
                </UButton>
              </div>

              <div
                v-if="viewer?.hasActiveCoach && !ownerMode"
                class="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
              >
                You are already connected to {{ viewer.activeCoachNames.join(', ') }}. You can still
                submit this request and let the coach review it manually.
              </div>

              <div
                v-if="submissionComplete && !ownerMode"
                class="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm leading-6 text-emerald-50"
              >
                <div class="font-semibold text-white">
                  {{ startExperience.startPage.settings.successTitle }}
                </div>
                <div class="mt-1">{{ startExperience.startPage.settings.successMessage }}</div>
              </div>
            </div>
          </section>

          <div class="space-y-6 px-0 py-6 sm:px-10 sm:py-10">
            <section
              v-for="section in visibleSections"
              :id="section.type === 'intakeForm' ? 'coach-start-form' : undefined"
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

    <CoachStartPageEditorRail
      v-if="viewer?.isOwner"
      v-model:start-page="editableStartPage"
      :open="ownerMode"
      :saving="saving"
      :uploading="uploadingHero"
      :validation-errors="validationErrors"
      @close="closeEditMode"
      @save="saveStartPage"
      @upload-hero="handleStartHeroUpload"
    />
  </div>
</template>

<script setup lang="ts">
  import { h, resolveComponent } from 'vue'
  import { renderSafeMarkdown } from '~/utils/publicRichText'
  import {
    formatPublicPresenceApiError,
    getFirstValidationMessage,
    validateCoachStartPageDraft
  } from '~/utils/publicPresenceValidation'
  import CoachStartPageEditorRail from './CoachStartPageEditorRail.vue'

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useAuth()
  const slug = computed(() => route.params.slug as string)
  const publicEndpoint = computed(() => `/api/public/coaches/${slug.value}/start`)
  const privateEndpoint = '/api/profile/public/coach/start'
  const callbackUrl = computed(() => `/coach/${slug.value}/start?resume=1`)
  const signupUrl = computed(() => `/join?callbackUrl=${encodeURIComponent(callbackUrl.value)}`)
  const loginUrl = computed(() => `/login?callbackUrl=${encodeURIComponent(callbackUrl.value)}`)
  const pendingRequestCookie = useCookie<any | null>('coach_start_request', {
    sameSite: 'lax',
    maxAge: 60 * 30
  })

  const { data, pending, refresh } = await useFetch(publicEndpoint, {
    key: () => `coach-start-${slug.value}`
  })

  const startExperience = computed(() => {
    const value = (data.value as any)?.start || null
    if (!value) return null
    if (ownerMode.value && editableStartPage.value) {
      return {
        ...value,
        startPage: editableStartPage.value
      }
    }
    return value
  })
  const viewer = computed(
    () => (data.value as any)?.viewer || { isOwner: false, isAuthenticated: false }
  )
  const ownerMode = computed(() => viewer.value?.isOwner && route.query.edit === '1')
  const editableStartPage = ref<any>(null)
  const attemptedSave = ref(false)
  const saving = ref(false)
  const submitting = ref(false)
  const uploadingHero = ref(false)
  const resumeHandled = ref(false)
  const submissionComplete = ref(route.query.submitted === '1')
  const formAnswers = ref<Record<string, any>>({})

  watch(
    () => ownerMode.value,
    async (isOwnerMode) => {
      if (!isOwnerMode) {
        editableStartPage.value = startExperience.value
          ? structuredClone(startExperience.value.startPage)
          : null
        return
      }

      const response = await $fetch(privateEndpoint)
      editableStartPage.value = structuredClone((response as any).startPage)
    },
    { immediate: true }
  )

  watch(
    () => (data.value as any)?.start,
    (value) => {
      if (ownerMode.value) return
      editableStartPage.value = value ? structuredClone(value.startPage) : null
    },
    { immediate: true }
  )

  const visibleSections = computed(() =>
    [...(startExperience.value?.startPage?.sections || [])]
      .filter((section: any) => section.enabled)
      .sort((a: any, b: any) => a.order - b.order)
      .filter((section: any) => section.type !== 'hero')
  )

  const heroSection = computed(
    () =>
      startExperience.value?.startPage?.sections?.find((section: any) => section.type === 'hero') ||
      null
  )
  const heroImageUrl = computed(
    () =>
      startExperience.value?.startPage?.settings?.heroImageUrl ||
      startExperience.value?.coach?.coverImageUrl ||
      ''
  )
  const sectionSurfaceClass =
    'rounded-none border-y border-white/10 bg-[#0f172a]/85 p-5 shadow-sm shadow-black/30 sm:rounded-[1.8rem] sm:border sm:p-6'
  const sectionGradientClass =
    'rounded-none border-y border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(15,23,42,0.96))] p-5 shadow-sm shadow-black/30 sm:rounded-[1.8rem] sm:border sm:p-6'
  const footerSurfaceClass =
    'rounded-none border-y border-default/70 bg-[linear-gradient(135deg,#052e16,#14532d)] p-6 text-white shadow-sm sm:rounded-[2.2rem] sm:border sm:p-8'
  const validationErrors = computed(() =>
    attemptedSave.value && editableStartPage.value
      ? validateCoachStartPageDraft(editableStartPage.value)
      : {}
  )

  const submitButtonLabel = computed(() =>
    session.value
      ? startExperience.value?.startPage?.settings?.submitLabel || 'Submit coaching request'
      : startExperience.value?.startPage?.settings?.loginLabel || 'Continue to create account'
  )

  const formValidationErrors = computed(() => {
    const errors: Record<string, string> = {}
    const fields = startExperience.value?.startPage?.form?.fields || []
    for (const field of fields) {
      if (!field.required) continue
      const answer = formAnswers.value[field.id]
      const hasValue =
        typeof answer === 'boolean' ? true : typeof answer === 'string' && Boolean(answer.trim())
      if (!hasValue) {
        errors[field.id] = `${field.label} is required.`
      }
    }
    return errors
  })

  async function saveStartPage() {
    if (!editableStartPage.value) return
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
      await $fetch(privateEndpoint, {
        method: 'PATCH',
        body: editableStartPage.value
      })
      attemptedSave.value = false
      await refresh()
      toast.add({
        title: 'Coach start page saved',
        description: 'Your request-based onboarding page is updated.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Save failed',
        description: formatPublicPresenceApiError(error, 'Could not save the coach start page.'),
        color: 'error'
      })
    } finally {
      saving.value = false
    }
  }

  async function handleStartHeroUpload(file: File) {
    uploadingHero.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await $fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      })
      if (!editableStartPage.value?.settings) {
        editableStartPage.value.settings = {}
      }
      editableStartPage.value.settings.heroImageUrl = (result as any).url
      editableStartPage.value.settings.heroImageAlt =
        editableStartPage.value.settings.heroImageAlt || startExperience.value?.coach?.name || ''
      toast.add({
        title: 'Hero image uploaded',
        description: 'The start page hero now uses your uploaded image.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Upload failed',
        description: error.data?.message || 'Could not upload this image.',
        color: 'error'
      })
    } finally {
      uploadingHero.value = false
    }
  }

  function closeEditMode() {
    router.push(route.path)
  }

  function scrollToForm() {
    if (!import.meta.client) return
    document
      .getElementById('coach-start-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function serialiseAnswers() {
    const fields = startExperience.value?.startPage?.form?.fields || []
    return fields.map((field: any) => ({
      fieldId: field.id,
      label: field.label,
      type: field.type,
      answer: formAnswers.value[field.id] ?? null
    }))
  }

  async function submitRequest() {
    if (ownerMode.value || !startExperience.value) return

    if (Object.keys(formValidationErrors.value).length) {
      toast.add({
        title: 'Check the form',
        description: Object.values(formValidationErrors.value)[0],
        color: 'warning'
      })
      return
    }

    const answers = serialiseAnswers()

    if (!session.value) {
      pendingRequestCookie.value = {
        slug: slug.value,
        answers
      }
      await navigateTo(signupUrl.value)
      return
    }

    submitting.value = true
    try {
      await $fetch(`/api/public/coaches/${slug.value}/start/request`, {
        method: 'POST',
        body: {
          answers
        }
      })
      pendingRequestCookie.value = null
      submissionComplete.value = true
      toast.add({
        title: 'Request submitted',
        description: startExperience.value.startPage.settings.successMessage,
        color: 'success'
      })
      await router.replace({ query: { submitted: '1' } })
    } catch (error: any) {
      toast.add({
        title: 'Request failed',
        description: formatPublicPresenceApiError(
          error,
          'Could not submit your request right now.'
        ),
        color: 'error'
      })
    } finally {
      submitting.value = false
    }
  }

  watchEffect(() => {
    if (!import.meta.client) return
    const pendingRequest = pendingRequestCookie.value
    if (
      session.value &&
      route.query.resume === '1' &&
      pendingRequest?.slug === slug.value &&
      !submitting.value &&
      !resumeHandled.value &&
      !submissionComplete.value
    ) {
      resumeHandled.value = true
      formAnswers.value = Object.fromEntries(
        (pendingRequest.answers || []).map((answer: any) => [answer.fieldId, answer.answer])
      )
      submitRequest()
    }
  })

  function formatSectionLabel(type: string) {
    return (
      (
        {
          intro: 'Intro',
          expectations: 'What To Expect',
          proof: 'Proof',
          pricing: 'Pricing',
          noCommitment: 'No Commitment',
          faq: 'FAQ',
          intakeForm: 'Intake Form',
          footerCta: 'Final CTA'
        } as Record<string, string>
      )[type] || type
    )
  }

  function renderSection(section: any) {
    if (section.type === 'intro') {
      return renderTextSection(
        section.headline || section.title || 'Welcome',
        startExperience.value?.startPage?.introBody,
        section.intro
      )
    }

    if (section.type === 'expectations') {
      const steps = startExperience.value?.startPage?.steps || []
      if (!steps.length && !ownerMode.value) return h('div')
      return h('section', { class: sectionSurfaceClass }, [
        section.content?.eyebrow
          ? h(
              'div',
              { class: 'text-xs font-black uppercase tracking-[0.2em] text-emerald-300' },
              section.content.eyebrow
            )
          : null,
        ...renderSectionHeading(
          section.headline || section.title || 'What happens next',
          section.intro
        ),
        h(
          'div',
          { class: 'mt-5 grid gap-4 md:grid-cols-3' },
          steps.map((step: any, index: number) =>
            h('div', { class: 'rounded-[1.4rem] border border-white/10 bg-black/20 p-5' }, [
              h(
                'div',
                { class: 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-400' },
                `Step ${index + 1}`
              ),
              h('div', { class: 'mt-3 text-lg font-semibold text-white' }, step.title),
              h('p', { class: 'mt-3 text-sm leading-6 text-slate-300' }, step.description)
            ])
          )
        )
      ])
    }

    if (section.type === 'proof') {
      const proof = startExperience.value?.proof || {
        specialties: [],
        credentials: [],
        testimonial: null
      }
      const eyebrow = section.content?.eyebrow || 'Trust'
      const trustBody = section.content?.body || startExperience.value?.startPage?.trustNote
      return h('section', { class: sectionGradientClass }, [
        h(
          'div',
          { class: 'text-xs font-black uppercase tracking-[0.2em] text-emerald-300' },
          eyebrow
        ),
        h(
          'h2',
          { class: 'mt-2 text-3xl font-black tracking-tight text-white' },
          section.headline || section.title || 'Why submit a request'
        ),
        trustBody
          ? h('div', { class: 'mt-3 text-sm leading-7 text-slate-300' }, [
              renderRichTextBlock(trustBody)
            ])
          : null,
        section.intro
          ? h('p', { class: 'mt-3 text-sm leading-7 text-slate-400' }, section.intro)
          : null,
        h('div', { class: 'mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]' }, [
          h('div', { class: 'space-y-4' }, [
            proof.specialties?.length
              ? h('div', { class: 'rounded-2xl border border-white/10 bg-black/20 p-4' }, [
                  h(
                    'div',
                    { class: 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-400' },
                    'Specialties'
                  ),
                  h(
                    'div',
                    { class: 'mt-3 flex flex-wrap gap-2' },
                    proof.specialties
                      .slice(0, 6)
                      .map((item: string) =>
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
            proof.credentials?.length
              ? h('div', { class: 'rounded-2xl border border-white/10 bg-black/20 p-4' }, [
                  h(
                    'div',
                    { class: 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-400' },
                    'Credentials'
                  ),
                  h(
                    'div',
                    { class: 'mt-3 space-y-2' },
                    proof.credentials
                      .slice(0, 4)
                      .map((item: string) =>
                        h(
                          'div',
                          {
                            class:
                              'rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-200'
                          },
                          item
                        )
                      )
                  )
                ])
              : null
          ]),
          proof.testimonial
            ? h('div', { class: 'rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4' }, [
                h(
                  'div',
                  {
                    class: 'text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200/80'
                  },
                  'Social proof'
                ),
                h(
                  'blockquote',
                  { class: 'mt-3 text-sm leading-7 text-slate-200' },
                  `“${proof.testimonial.quote}”`
                ),
                h(
                  'div',
                  { class: 'mt-3 text-sm font-semibold text-white' },
                  proof.testimonial.authorName
                ),
                proof.testimonial.authorRole
                  ? h('div', { class: 'text-xs text-slate-400' }, proof.testimonial.authorRole)
                  : null
              ])
            : h('div')
        ])
      ])
    }

    if (section.type === 'pricing') {
      const pricing = section.content || {}
      const offers = Array.isArray(pricing.offers) ? pricing.offers : []
      const hasOffers = offers.length > 0
      if (!hasOffers && !ownerMode.value) return h('div')
      return h('section', { class: sectionSurfaceClass }, [
        ...renderSectionHeading(
          section.headline || section.title || 'Pricing & offers',
          section.intro || pricing.note
        ),
        h(
          'div',
          { class: 'mt-5 grid gap-4 lg:grid-cols-3' },
          (hasOffers
            ? offers
            : [
                {
                  id: 'placeholder',
                  name: 'Add an offer in edit mode',
                  priceLabel: '$0',
                  billingLabel: '/month',
                  summary: 'Show how coaching works and what athletes get.',
                  features: ['Example feature one', 'Example feature two'],
                  highlighted: true
                }
              ]
          ).map((offer: any) =>
            h(
              'div',
              {
                class: [
                  'rounded-[1.6rem] border p-5',
                  offer.highlighted
                    ? 'border-emerald-400/30 bg-emerald-400/8 shadow-sm shadow-emerald-950/30'
                    : 'border-white/10 bg-black/20'
                ]
              },
              [
                h('div', { class: 'flex items-start justify-between gap-3' }, [
                  h('div', { class: 'min-w-0' }, [
                    h('div', { class: 'text-lg font-bold text-white' }, offer.name),
                    offer.summary
                      ? h('p', { class: 'mt-2 text-sm leading-6 text-slate-300' }, offer.summary)
                      : null
                  ]),
                  offer.highlighted
                    ? h(
                        'span',
                        {
                          class:
                            'rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200'
                        },
                        'Featured'
                      )
                    : null
                ]),
                h('div', { class: 'mt-5 flex items-end gap-2' }, [
                  h(
                    'div',
                    { class: 'text-4xl font-black tracking-tight text-white' },
                    offer.priceLabel
                  ),
                  offer.billingLabel
                    ? h(
                        'div',
                        { class: 'pb-1 text-sm font-medium text-slate-400' },
                        offer.billingLabel
                      )
                    : null
                ]),
                offer.features?.length
                  ? h(
                      'ul',
                      { class: 'mt-5 space-y-2' },
                      offer.features.map((feature: string) =>
                        h('li', { class: 'flex items-start gap-2 text-sm text-slate-300' }, [
                          h('span', { class: 'mt-1 h-2 w-2 rounded-full bg-emerald-300' }),
                          h('span', feature)
                        ])
                      )
                    )
                  : null,
                offer.ctaUrl
                  ? h(
                      'a',
                      {
                        href: offer.ctaUrl,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        class:
                          'mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10'
                      },
                      offer.ctaLabel || 'Learn more'
                    )
                  : h(
                      'button',
                      {
                        type: 'button',
                        class:
                          'mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10',
                        onClick: scrollToForm
                      },
                      offer.ctaLabel || 'Request this'
                    )
              ]
            )
          )
        )
      ])
    }

    if (section.type === 'noCommitment') {
      const content = section.content || {}
      const body = content.body || startExperience.value?.startPage?.noCommitmentBody
      const bullets =
        (content.bullets?.length
          ? content.bullets
          : startExperience.value?.startPage?.noCommitmentBullets) || []
      if (!body && !bullets.length && !ownerMode.value) return h('div')
      return h('section', { class: sectionGradientClass }, [
        ...renderSectionHeading(
          section.headline || section.title || 'No commitment upfront',
          section.intro ||
            'Use this section to make the low-pressure nature of the request completely clear.'
        ),
        h('div', { class: 'mt-4' }, [renderRichTextBlock(body)]),
        bullets.length
          ? h(
              'div',
              { class: 'mt-5 grid gap-3 md:grid-cols-2' },
              bullets.map((bullet: string) =>
                h(
                  'div',
                  {
                    class:
                      'rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200'
                  },
                  bullet
                )
              )
            )
          : null
      ])
    }

    if (section.type === 'faq') {
      return renderFaqSection(
        section.headline || section.title || 'FAQ',
        startExperience.value?.startPage?.faq || [],
        section.intro
      )
    }

    if (section.type === 'intakeForm') {
      return renderIntakeForm(section)
    }

    if (section.type === 'footerCta') {
      return h('section', { class: footerSurfaceClass }, [
        h(
          'h2',
          { class: 'text-3xl font-black tracking-tight' },
          section.headline || section.title || 'Ready to work together?'
        ),
        h(
          'p',
          { class: 'mt-3 max-w-2xl text-sm text-emerald-50/90' },
          section.intro ||
            'Use this final section to reinforce the next step before the athlete submits their request.'
        ),
        h(
          'button',
          {
            type: 'button',
            class:
              'mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-950',
            onClick: scrollToForm
          },
          section.content?.buttonLabel || submitButtonLabel.value
        )
      ])
    }

    return h('div')
  }

  function renderSectionHeading(title: string, intro?: string | null) {
    return [
      h('h2', { class: 'text-2xl font-black tracking-tight text-white' }, title),
      intro ? h('p', { class: 'mt-3 max-w-3xl text-sm leading-7 text-slate-400' }, intro) : null
    ]
  }

  function renderRichTextBlock(text?: string | null) {
    return h('div', {
      class:
        'prose prose-invert prose-p:text-slate-300 prose-headings:text-white prose-strong:text-white prose-li:text-slate-300 prose-img:my-6 prose-img:rounded-2xl prose-img:border prose-img:border-white/10 prose-img:shadow-sm prose-img:shadow-black/30 max-w-none leading-8',
      innerHTML: renderSafeMarkdown(text) || '<p>Add copy for this section in edit mode.</p>'
    })
  }

  function renderTextSection(title: string, text?: string | null, intro?: string | null) {
    if (!text && !ownerMode.value) return h('div')
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(title, intro),
      h('div', { class: 'mt-4' }, [renderRichTextBlock(text)])
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
                question: 'Add questions in edit mode',
                answer:
                  'Use this section to address fit, communication, pricing, and the next step.'
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

  function renderFieldInput(field: any) {
    const commonClass = 'w-full'
    if (field.type === 'longText') {
      return h(resolveComponent('UTextarea'), {
        modelValue: formAnswers.value[field.id] || '',
        'onUpdate:modelValue': (value: string) => {
          formAnswers.value[field.id] = value
        },
        rows: 4,
        placeholder: field.placeholder || '',
        class: commonClass
      })
    }

    if (field.type === 'singleSelect' || field.type === 'yesNo') {
      const items =
        field.type === 'yesNo'
          ? [
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' }
            ]
          : (field.options || []).map((option: any) => ({
              label: option.label,
              value: option.value
            }))
      return h(resolveComponent('USelect'), {
        modelValue: formAnswers.value[field.id] || undefined,
        'onUpdate:modelValue': (value: string) => {
          formAnswers.value[field.id] = value
        },
        items,
        placeholder: field.placeholder || 'Choose an option',
        class: commonClass
      })
    }

    return h(resolveComponent('UInput'), {
      modelValue: formAnswers.value[field.id] || '',
      'onUpdate:modelValue': (value: string) => {
        formAnswers.value[field.id] = value
      },
      placeholder: field.placeholder || '',
      class: commonClass
    })
  }

  function renderIntakeForm(section: any) {
    const fields = startExperience.value?.startPage?.form?.fields || []
    return h('section', { class: sectionSurfaceClass }, [
      ...renderSectionHeading(
        section.headline ||
          section.title ||
          startExperience.value?.startPage?.form?.title ||
          'Request coaching',
        section.intro || startExperience.value?.startPage?.form?.intro
      ),
      h('div', { class: 'mt-5 space-y-4' }, [
        ...fields.map((field: any) =>
          h(
            resolveComponent('UFormField'),
            {
              label: field.label,
              error: formValidationErrors.value[field.id],
              help: field.helpText || undefined
            },
            {
              default: () => [renderFieldInput(field)]
            }
          )
        ),
        !fields.length && ownerMode.value
          ? h(
              'div',
              {
                class:
                  'rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400'
              },
              'Add a few intake questions in edit mode so athletes can request coaching directly from this page.'
            )
          : null,
        !ownerMode.value
          ? h('div', { class: 'flex flex-col gap-3 pt-2 sm:flex-row' }, [
              h(
                resolveComponent('UButton'),
                {
                  color: 'primary',
                  size: 'lg',
                  class: 'justify-center',
                  loading: submitting.value,
                  onClick: submitRequest
                },
                {
                  default: () => submitButtonLabel.value
                }
              ),
              !session.value
                ? h(
                    resolveComponent('UButton'),
                    {
                      to: loginUrl.value,
                      color: 'neutral',
                      variant: 'outline',
                      size: 'lg',
                      class: 'justify-center'
                    },
                    {
                      default: () => 'Log in instead'
                    }
                  )
                : null
            ])
          : null
      ])
    ])
  }
</script>
