import { z } from 'zod'
import {
  ATHLETE_PUBLIC_SECTION_TYPES,
  COACH_PUBLIC_SECTION_TYPES,
  COACH_START_SECTION_TYPES,
  PUBLIC_MEDIA_KIND_OPTIONS,
  PUBLIC_MEDIA_TYPE_OPTIONS,
  PUBLIC_PROFILE_VISIBILITY_OPTIONS,
  buildDefaultCoachStartSections,
  buildDefaultAthletePublicProfile,
  buildDefaultCoachPublicProfile
} from '../../shared/public-presence'
import { slugifyPublicName } from '../../shared/public-plans'
import { normalizeYouTubeUrl } from './strength-exercise-library'

function formatZodIssuePath(path: PropertyKey[]) {
  return path
    .map((segment) => (typeof segment === 'number' ? `${segment + 1}` : String(segment)))
    .join('.')
}

function formatZodErrorMessage(error: z.ZodError, fallback: string) {
  const issue = error.issues[0]
  if (!issue) return fallback
  const path = issue.path.length ? `${formatZodIssuePath(issue.path as PropertyKey[])}: ` : ''
  return `${path}${issue.message}`
}

function parseOrThrow<T>(schema: z.ZodSchema<T>, input: unknown, fallback: string) {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: formatZodErrorMessage(result.error, fallback)
    })
  }
  return result.data
}

const publicSocialLinkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  url: z.string().url()
})

const publicMediaItemSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(PUBLIC_MEDIA_TYPE_OPTIONS),
  url: z.string().url(),
  alt: z.string().max(200).default(''),
  caption: z.string().max(300).nullable().optional(),
  kind: z.enum(PUBLIC_MEDIA_KIND_OPTIONS),
  order: z.number().int().min(0)
})

const coachSectionSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(COACH_PUBLIC_SECTION_TYPES),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  title: z.string().max(120).nullable().optional(),
  headline: z.string().max(160).nullable().optional(),
  intro: z.string().max(400).nullable().optional(),
  styleVariant: z.string().max(80).nullable().optional(),
  content: z.record(z.string(), z.any()).optional()
})

const coachStartSectionSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(COACH_START_SECTION_TYPES),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  title: z.string().max(120).nullable().optional(),
  headline: z.string().max(160).nullable().optional(),
  intro: z.string().max(400).nullable().optional(),
  styleVariant: z.string().max(80).nullable().optional(),
  content: z.record(z.string(), z.any()).optional()
})

const athleteSectionSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(ATHLETE_PUBLIC_SECTION_TYPES),
  enabled: z.boolean(),
  order: z.number().int().min(0),
  title: z.string().max(120).nullable().optional(),
  headline: z.string().max(160).nullable().optional(),
  intro: z.string().max(400).nullable().optional(),
  styleVariant: z.string().max(80).nullable().optional(),
  content: z.record(z.string(), z.any()).optional()
})

const testimonialSchema = z.object({
  id: z.string().min(1).max(120),
  quote: z.string().trim().min(1).max(400),
  authorName: z.string().trim().min(1).max(120),
  authorRole: z.string().max(120).nullable().optional()
})

const highlightSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  value: z.string().max(120).nullable().optional(),
  description: z.string().max(240).nullable().optional()
})

const achievementSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  year: z.string().max(12).nullable().optional(),
  description: z.string().max(240).nullable().optional()
})

const faqItemSchema = z.object({
  id: z.string().trim().min(1).max(120),
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(4000)
})

const coachJoinPageStepSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(400)
})

const coachStartFormFieldOptionSchema = z.object({
  id: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  value: z.string().trim().min(1).max(120)
})

const coachStartFormFieldSchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: z.enum(['shortText', 'longText', 'singleSelect', 'yesNo']),
  label: z.string().trim().min(1).max(200),
  required: z.boolean().default(false),
  helpText: z.string().max(240).nullable().optional(),
  placeholder: z.string().max(200).nullable().optional(),
  options: z.array(coachStartFormFieldOptionSchema).max(12).optional()
})

const coachStartOfferSchema = z.object({
  id: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  priceLabel: z.string().trim().min(1).max(80),
  billingLabel: z.string().max(80).nullable().optional(),
  summary: z.string().max(300).nullable().optional(),
  features: z.array(z.string().trim().min(1).max(140)).max(8).default([]),
  ctaLabel: z.string().max(80).nullable().optional(),
  ctaUrl: z.string().url().nullable().optional(),
  highlighted: z.boolean().optional()
})

const featuredPlanConfigSchema = z.object({
  planId: z.string().trim().min(1).max(191),
  order: z.number().int().min(0),
  highlightWeekId: z.string().trim().min(1).max(191).nullable().optional(),
  coachNote: z.string().max(4000).nullable().optional()
})

const contactMethodSchema = z.object({
  id: z.string().trim().min(1).max(120),
  type: z.enum(['link', 'email', 'phone']),
  label: z.string().max(80).nullable().optional().default(''),
  value: z.string().trim().min(1).max(300)
})

const contactSectionContentSchema = z.object({
  methods: z.array(contactMethodSchema).max(8).default([]),
  formEnabled: z.boolean().default(false),
  formTitle: z.string().max(120).nullable().optional(),
  formIntro: z.string().max(400).nullable().optional(),
  submitLabel: z.string().max(60).nullable().optional()
})

const socialSectionContentSchema = z.object({}).passthrough().default({})
const socialSectionDisplaySchema = z.object({
  websiteLabel: z.string().max(80).nullable().optional()
})

const footerCtaSectionContentSchema = z.object({
  buttonLabel: z.string().max(80).nullable().optional()
})

const credibilitySectionContentSchema = z.object({
  eyebrow: z.string().max(80).nullable().optional(),
  spotlightTitle: z.string().max(160).nullable().optional(),
  spotlightBody: z.string().max(4000).nullable().optional(),
  trustBullets: z.array(z.string().trim().min(1).max(160)).max(6).default([]),
  showSpotlight: z.boolean().optional().default(true),
  showSpecialties: z.boolean().optional().default(true),
  showCredentials: z.boolean().optional().default(true),
  showSocialProof: z.boolean().optional().default(true)
})

const startExpectationsSectionContentSchema = z.object({
  eyebrow: z.string().max(80).nullable().optional()
})

const startProofSectionContentSchema = z.object({
  eyebrow: z.string().max(80).nullable().optional(),
  body: z.string().max(4000).nullable().optional()
})

const videoSectionContentSchema = z.object({
  videoUrl: z.string().max(500).nullable().optional(),
  caption: z.string().max(400).nullable().optional()
})

const faqSectionContentSchema = z.object({
  items: z.array(faqItemSchema).max(12).default([])
})

const coachStartPricingContentSchema = z.object({
  note: z.string().max(400).nullable().optional(),
  offers: z.array(coachStartOfferSchema).max(6).default([])
})

const coachStartNoCommitmentContentSchema = z.object({
  body: z.string().max(4000).nullable().optional(),
  bullets: z.array(z.string().trim().min(1).max(180)).max(8).default([])
})

const coachJoinPageSchema = z.object({
  enabled: z.boolean().default(false),
  headline: z.string().max(200).nullable().optional(),
  intro: z.string().max(500).nullable().optional(),
  ctaLabel: z.string().max(80).nullable().optional(),
  welcomeTitle: z.string().max(160).nullable().optional(),
  welcomeBody: z.string().max(4000).nullable().optional(),
  trustTitle: z.string().max(160).nullable().optional(),
  trustNote: z.string().max(400).nullable().optional(),
  unavailableMessage: z.string().max(400).nullable().optional(),
  steps: z.array(coachJoinPageStepSchema).length(3).default([]),
  faq: z.array(faqItemSchema).max(8).default([])
})

const coachStartPageSchema = z.object({
  enabled: z.boolean().default(true),
  settings: z
    .object({
      headline: z.string().max(200).nullable().optional(),
      intro: z.string().max(500).nullable().optional(),
      heroImageUrl: z.string().url().nullable().optional(),
      heroImageAlt: z.string().max(200).nullable().optional(),
      submitLabel: z.string().max(80).nullable().optional(),
      loginLabel: z.string().max(80).nullable().optional(),
      successTitle: z.string().max(160).nullable().optional(),
      successMessage: z.string().max(400).nullable().optional()
    })
    .default(buildDefaultCoachPublicProfile().startPage.settings as any),
  sections: z.array(coachStartSectionSchema).default(buildDefaultCoachStartSections() as any),
  introBody: z.string().max(4000).nullable().optional(),
  steps: z
    .array(coachJoinPageStepSchema)
    .length(3)
    .default([] as any),
  faq: z.array(faqItemSchema).max(8).default([]),
  trustNote: z.string().max(400).nullable().optional(),
  noCommitmentBody: z.string().max(4000).nullable().optional(),
  noCommitmentBullets: z.array(z.string().trim().min(1).max(180)).max(8).default([]),
  pricing: z
    .object({
      note: z.string().max(400).nullable().optional(),
      offers: z.array(coachStartOfferSchema).max(6).default([])
    })
    .default(buildDefaultCoachPublicProfile().startPage.pricing as any),
  form: z
    .object({
      title: z.string().max(160).nullable().optional(),
      intro: z.string().max(400).nullable().optional(),
      fields: z.array(coachStartFormFieldSchema).max(10).default([])
    })
    .default(buildDefaultCoachPublicProfile().startPage.form as any)
})

export const coachPublicProfileSchema = z.object({
  settings: z.object({
    enabled: z.boolean().default(false),
    slug: z.string().max(80).nullable().optional(),
    displayName: z.string().max(120).nullable().optional(),
    headline: z.string().max(200).nullable().optional(),
    coachingBrand: z.string().max(160).nullable().optional(),
    location: z.string().max(160).nullable().optional(),
    websiteUrl: z.string().url().nullable().optional(),
    ctaUrl: z.string().url().nullable().optional(),
    bio: z.string().max(4000).nullable().optional(),
    visibility: z.enum(PUBLIC_PROFILE_VISIBILITY_OPTIONS).default('Private'),
    socialLinks: z.array(publicSocialLinkSchema).max(6).default([]),
    specialties: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    credentials: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
    featuredPlanMeta: z.array(featuredPlanConfigSchema).max(12).default([]),
    featuredPlanIds: z.array(z.string().min(1)).max(12).optional().default([]),
    seoTitle: z.string().max(140).nullable().optional(),
    seoDescription: z.string().max(300).nullable().optional()
  }),
  sections: z.array(coachSectionSchema).default(buildDefaultCoachPublicProfile().sections as any),
  media: z.array(publicMediaItemSchema).max(7).default([]),
  testimonials: z.array(testimonialSchema).max(8).default([]),
  startPage: coachStartPageSchema.default(buildDefaultCoachPublicProfile().startPage as any),
  joinPage: coachJoinPageSchema.default(buildDefaultCoachPublicProfile().joinPage as any)
})

export const athletePublicProfileSchema = z.object({
  settings: z.object({
    enabled: z.boolean().default(false),
    slug: z.string().max(80).nullable().optional(),
    displayName: z.string().max(120).nullable().optional(),
    headline: z.string().max(200).nullable().optional(),
    location: z.string().max(160).nullable().optional(),
    websiteUrl: z.string().url().nullable().optional(),
    bio: z.string().max(4000).nullable().optional(),
    visibility: z.enum(PUBLIC_PROFILE_VISIBILITY_OPTIONS).default('Private'),
    socialLinks: z.array(publicSocialLinkSchema).max(6).default([]),
    focusSports: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    seoTitle: z.string().max(140).nullable().optional(),
    seoDescription: z.string().max(300).nullable().optional()
  }),
  sections: z
    .array(athleteSectionSchema)
    .default(buildDefaultAthletePublicProfile().sections as any),
  media: z.array(publicMediaItemSchema).max(7).default([]),
  highlights: z.array(highlightSchema).max(8).default([]),
  achievements: z.array(achievementSchema).max(12).default([])
})

function ensureMandatorySection<T extends { type: string; enabled: boolean; order: number }>(
  sections: T[],
  type: string
) {
  const found = sections.find((section) => section.type === type)
  if (!found) {
    throw createError({ statusCode: 400, message: `Missing mandatory ${type} section.` })
  }
  if (!found.enabled) {
    throw createError({ statusCode: 400, message: `${type} section must stay enabled.` })
  }
  return true
}

function normalizeSectionOrder<T extends { order: number }>(sections: T[]) {
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index }))
}

function mergeSectionsWithDefaults<T extends { type: string }>(sections: T[], defaults: T[]) {
  const sectionMap = new Map(sections.map((section) => [section.type, section]))
  return defaults.map((defaultSection) => sectionMap.get(defaultSection.type) || defaultSection)
}

function normalizeStructuredSectionContent<
  T extends { type: string; enabled: boolean; content?: Record<string, any> }
>(sections: T[], role: 'coach' | 'athlete' | 'coach-start') {
  return sections.map((section) => {
    const rawContent =
      section.content && typeof section.content === 'object' ? { ...section.content } : {}
    let content = rawContent

    if (section.type === 'videoIntro') {
      const parsed = parseOrThrow(
        videoSectionContentSchema,
        rawContent,
        'Video introduction is invalid.'
      )
      content = {
        ...parsed,
        videoUrl:
          typeof parsed.videoUrl === 'string' && parsed.videoUrl.trim()
            ? normalizeYouTubeUrl(parsed.videoUrl) || null
            : null,
        caption: typeof parsed.caption === 'string' ? parsed.caption : null
      }
    } else if (section.type === 'faq') {
      const parsed = parseOrThrow(faqSectionContentSchema, rawContent, 'FAQ content is invalid.')
      content = {
        items: parsed.items
      }
    } else if (section.type === 'contact') {
      const parsed = parseOrThrow(
        contactSectionContentSchema,
        rawContent,
        'Contact section is invalid.'
      )
      content = {
        ...parsed,
        methods: parsed.methods.map((method) => ({
          ...method,
          label: method.label || ''
        })),
        formTitle: parsed.formTitle || null,
        formIntro: parsed.formIntro || null,
        submitLabel: parsed.submitLabel || null
      }
    } else if (section.type === 'footerCta') {
      const parsed = parseOrThrow(
        footerCtaSectionContentSchema,
        rawContent,
        'Footer CTA is invalid.'
      )
      content = {
        buttonLabel: parsed.buttonLabel || null
      }
    } else if (section.type === 'credibility') {
      const parsed = parseOrThrow(
        credibilitySectionContentSchema,
        rawContent,
        'Credibility section is invalid.'
      )
      content = {
        eyebrow: parsed.eyebrow || null,
        spotlightTitle: parsed.spotlightTitle || null,
        spotlightBody: parsed.spotlightBody || null,
        trustBullets: parsed.trustBullets,
        showSpotlight: parsed.showSpotlight,
        showSpecialties: parsed.showSpecialties,
        showCredentials: parsed.showCredentials,
        showSocialProof: parsed.showSocialProof
      }
    } else if (section.type === 'socials' || section.type === 'links') {
      const parsed = parseOrThrow(
        socialSectionContentSchema,
        rawContent,
        'Social links are invalid.'
      )
      const display = parseOrThrow(
        socialSectionDisplaySchema,
        rawContent,
        'Social links are invalid.'
      )
      content = {
        ...parsed,
        websiteLabel: display.websiteLabel || null
      }
    } else if (section.type === 'expectations') {
      const parsed = parseOrThrow(
        startExpectationsSectionContentSchema,
        rawContent,
        'What-happens-next section is invalid.'
      )
      content = {
        eyebrow: parsed.eyebrow || null
      }
    } else if (section.type === 'proof') {
      const parsed = parseOrThrow(
        startProofSectionContentSchema,
        rawContent,
        'Proof section is invalid.'
      )
      content = {
        eyebrow: parsed.eyebrow || null,
        body: parsed.body || null
      }
    } else if (section.type === 'pricing') {
      const parsed = parseOrThrow(
        coachStartPricingContentSchema,
        rawContent,
        'Pricing section is invalid.'
      )
      const firstHighlightedIndex = parsed.offers.findIndex((offer) => offer.highlighted)
      content = {
        note: parsed.note || null,
        offers: parsed.offers.map((offer, index) => ({
          ...offer,
          billingLabel: offer.billingLabel || null,
          summary: offer.summary || null,
          ctaLabel: offer.ctaLabel || null,
          ctaUrl: offer.ctaUrl || null,
          highlighted:
            firstHighlightedIndex === -1
              ? Boolean(offer.highlighted)
              : index === firstHighlightedIndex
        }))
      }
    } else if (section.type === 'noCommitment') {
      const parsed = parseOrThrow(
        coachStartNoCommitmentContentSchema,
        rawContent,
        'No-commitment section is invalid.'
      )
      content = {
        body: parsed.body || null,
        bullets: parsed.bullets
      }
    }

    if (role === 'athlete' && section.type === 'links') {
      return {
        ...section,
        enabled: false,
        content
      }
    }

    return {
      ...section,
      content
    }
  })
}

export function normalizePublicSlug(value?: string | null) {
  return value && value.trim() ? slugifyPublicName(value) : null
}

export function normalizeCoachPublicProfile(input: unknown) {
  const parsed = parseOrThrow(coachPublicProfileSchema, input || {}, 'Coach profile is invalid.')
  const defaultProfile = buildDefaultCoachPublicProfile()
  parsed.settings.slug = normalizePublicSlug(parsed.settings.slug)
  const fallbackFeaturedPlanMeta = (parsed.settings.featuredPlanIds || []).map((planId, index) => ({
    planId,
    order: index,
    highlightWeekId: null,
    coachNote: null
  }))
  parsed.settings.featuredPlanMeta = normalizeSectionOrder(
    (parsed.settings.featuredPlanMeta?.length
      ? parsed.settings.featuredPlanMeta
      : fallbackFeaturedPlanMeta
    ).map((item) => ({
      ...item,
      highlightWeekId: item.highlightWeekId || null,
      coachNote: item.coachNote || null
    }))
  )
  delete (parsed.settings as any).featuredPlanIds
  parsed.sections = normalizeSectionOrder(
    normalizeStructuredSectionContent(
      mergeSectionsWithDefaults(parsed.sections, defaultProfile.sections as any),
      'coach'
    )
  )
  const parsedStartPage = parseOrThrow(
    coachStartPageSchema,
    {
      ...defaultProfile.startPage,
      ...(parsed.startPage || {}),
      settings: {
        ...defaultProfile.startPage.settings,
        ...(parsed.startPage?.settings || {})
      },
      sections: Array.isArray(parsed.startPage?.sections)
        ? parsed.startPage.sections
        : defaultProfile.startPage.sections,
      steps:
        Array.isArray(parsed.startPage?.steps) && parsed.startPage.steps.length === 3
          ? parsed.startPage.steps
          : defaultProfile.startPage.steps,
      faq: parsed.startPage?.faq || defaultProfile.startPage.faq,
      form: {
        ...defaultProfile.startPage.form,
        ...(parsed.startPage?.form || {}),
        fields: parsed.startPage?.form?.fields || defaultProfile.startPage.form.fields
      }
    },
    'Coach start page is invalid.'
  )
  parsed.startPage = {
    ...defaultProfile.startPage,
    ...parsedStartPage,
    settings: {
      ...defaultProfile.startPage.settings,
      ...parsedStartPage.settings,
      headline: parsedStartPage.settings.headline || null,
      intro: parsedStartPage.settings.intro || null,
      heroImageUrl: parsedStartPage.settings.heroImageUrl || null,
      heroImageAlt: parsedStartPage.settings.heroImageAlt || null,
      submitLabel: parsedStartPage.settings.submitLabel || null,
      loginLabel: parsedStartPage.settings.loginLabel || null,
      successTitle: parsedStartPage.settings.successTitle || null,
      successMessage: parsedStartPage.settings.successMessage || null
    },
    sections: normalizeSectionOrder(
      normalizeStructuredSectionContent(
        mergeSectionsWithDefaults(
          parsedStartPage.sections,
          defaultProfile.startPage.sections as any
        ),
        'coach-start'
      )
    ),
    introBody: parsedStartPage.introBody || null,
    trustNote: parsedStartPage.trustNote || null,
    faq: parsedStartPage.faq || [],
    steps: parsedStartPage.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description
    })),
    form: {
      title: parsedStartPage.form.title || null,
      intro: parsedStartPage.form.intro || null,
      fields: parsedStartPage.form.fields.map((field) => ({
        id: field.id,
        type: field.type,
        label: field.label,
        required: Boolean(field.required),
        helpText: field.helpText || null,
        placeholder: field.placeholder || null,
        options:
          field.type === 'singleSelect' || field.type === 'yesNo'
            ? (field.options || []).map((option) => ({
                id: option.id,
                label: option.label,
                value: option.value
              }))
            : []
      }))
    },
    noCommitmentBody: parsedStartPage.noCommitmentBody || null,
    noCommitmentBullets: parsedStartPage.noCommitmentBullets || [],
    pricing: {
      note: parsedStartPage.pricing.note || null,
      offers: parsedStartPage.pricing.offers.map((offer) => ({
        ...offer,
        billingLabel: offer.billingLabel || null,
        summary: offer.summary || null,
        ctaLabel: offer.ctaLabel || null,
        ctaUrl: offer.ctaUrl || null,
        highlighted: Boolean(offer.highlighted)
      }))
    }
  }
  const defaultJoinPage = defaultProfile.joinPage
  const parsedJoinPage = parseOrThrow(
    coachJoinPageSchema,
    {
      ...defaultJoinPage,
      ...(parsed.joinPage || {}),
      steps:
        Array.isArray(parsed.joinPage?.steps) && parsed.joinPage.steps.length === 3
          ? parsed.joinPage.steps
          : defaultJoinPage.steps,
      faq: parsed.joinPage?.faq || defaultJoinPage.faq
    },
    'Coach join page is invalid.'
  )
  parsed.joinPage = {
    ...defaultJoinPage,
    ...parsedJoinPage,
    headline: parsedJoinPage.headline || null,
    intro: parsedJoinPage.intro || null,
    ctaLabel: parsedJoinPage.ctaLabel || null,
    welcomeTitle: parsedJoinPage.welcomeTitle || null,
    welcomeBody: parsedJoinPage.welcomeBody || null,
    trustTitle: parsedJoinPage.trustTitle || null,
    trustNote: parsedJoinPage.trustNote || null,
    unavailableMessage: parsedJoinPage.unavailableMessage || null,
    faq: parsedJoinPage.faq || [],
    steps: parsedJoinPage.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description
    }))
  }
  ensureMandatorySection(parsed.sections, 'hero')
  ensureMandatorySection(parsed.startPage.sections, 'hero')
  return parsed
}

export function normalizeAthletePublicProfile(input: unknown) {
  const parsed = parseOrThrow(
    athletePublicProfileSchema,
    input || {},
    'Athlete profile is invalid.'
  )
  parsed.settings.slug = normalizePublicSlug(parsed.settings.slug)
  parsed.sections = normalizeSectionOrder(
    normalizeStructuredSectionContent(
      mergeSectionsWithDefaults(
        parsed.sections,
        buildDefaultAthletePublicProfile().sections as any
      ),
      'athlete'
    )
  )
  ensureMandatorySection(parsed.sections, 'hero')
  return parsed
}

export function parseStoredCoachPublicProfile(input: unknown) {
  const base = buildDefaultCoachPublicProfile()
  try {
    return normalizeCoachPublicProfile({ ...base, ...(input as Record<string, unknown>) })
  } catch {
    return base
  }
}

export function parseStoredAthletePublicProfile(input: unknown) {
  const base = buildDefaultAthletePublicProfile()
  try {
    return normalizeAthletePublicProfile({ ...base, ...(input as Record<string, unknown>) })
  } catch {
    return base
  }
}

export function buildCoachProfileFromLegacy(user: Record<string, any>) {
  const base = buildDefaultCoachPublicProfile()
  base.settings.enabled = Boolean(user.coachProfileEnabled ?? user.publicAuthorSlug)
  base.settings.slug = normalizePublicSlug(user.coachProfileSlug || user.publicAuthorSlug)
  base.settings.displayName = user.publicDisplayName || user.name || null
  base.settings.coachingBrand = user.publicCoachingBrand || null
  base.settings.location = user.publicLocation || null
  base.settings.websiteUrl = user.publicWebsiteUrl || null
  base.settings.bio = user.publicBio || null
  base.settings.visibility = user.visibility || 'Private'
  base.settings.socialLinks = Array.isArray(user.publicSocialLinks) ? user.publicSocialLinks : []
  return base
}

export function resolveCoachPublicProfile(user: Record<string, any>) {
  const legacy = buildCoachProfileFromLegacy(user)
  const stored = parseStoredCoachPublicProfile(user.coachPublicPage)
  return normalizeCoachPublicProfile({
    ...legacy,
    ...stored,
    settings: {
      ...legacy.settings,
      ...stored.settings,
      enabled: Boolean(
        user.coachProfileEnabled ?? stored.settings.enabled ?? legacy.settings.enabled
      ),
      slug: normalizePublicSlug(
        user.coachProfileSlug || stored.settings.slug || legacy.settings.slug
      )
    }
  })
}

export function resolveAthletePublicProfile(user: Record<string, any>) {
  const base = parseStoredAthletePublicProfile(user.athletePublicPage)
  return normalizeAthletePublicProfile({
    ...base,
    settings: {
      ...base.settings,
      enabled: Boolean(user.athleteProfileEnabled ?? base.settings.enabled),
      slug: normalizePublicSlug(user.athleteProfileSlug || base.settings.slug)
    }
  })
}
