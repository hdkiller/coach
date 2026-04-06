export const PUBLIC_PROFILE_VISIBILITY_OPTIONS = ['Private', 'Public', 'Followers Only'] as const
export const PUBLIC_MEDIA_TYPE_OPTIONS = ['upload', 'external'] as const
export const PUBLIC_MEDIA_KIND_OPTIONS = ['cover', 'gallery'] as const

export const COACH_PUBLIC_SECTION_TYPES = [
  'hero',
  'credibility',
  'about',
  'specialties',
  'credentials',
  'faq',
  'testimonials',
  'gallery',
  'videoIntro',
  'socials',
  'featuredPlans',
  'allPlans',
  'footerCta',
  'contact'
] as const

export const COACH_START_SECTION_TYPES = [
  'hero',
  'intro',
  'expectations',
  'proof',
  'pricing',
  'noCommitment',
  'faq',
  'intakeForm',
  'footerCta'
] as const

export const ATHLETE_PUBLIC_SECTION_TYPES = [
  'hero',
  'story',
  'highlights',
  'achievements',
  'faq',
  'gallery',
  'videoIntro',
  'socials',
  'links',
  'contact'
] as const

export type PublicProfileVisibility = (typeof PUBLIC_PROFILE_VISIBILITY_OPTIONS)[number]
export type PublicMediaType = (typeof PUBLIC_MEDIA_TYPE_OPTIONS)[number]
export type PublicMediaKind = (typeof PUBLIC_MEDIA_KIND_OPTIONS)[number]
export type CoachPublicSectionType = (typeof COACH_PUBLIC_SECTION_TYPES)[number]
export type CoachStartSectionType = (typeof COACH_START_SECTION_TYPES)[number]
export type AthletePublicSectionType = (typeof ATHLETE_PUBLIC_SECTION_TYPES)[number]
export type PublicProfileRole = 'coach' | 'athlete'
export type PublicRichContent = string

export interface CoachJoinPageStep {
  id: string
  title: string
  description: string
}

export interface CoachStartFormFieldOption {
  id: string
  label: string
  value: string
}

export interface CoachStartFormField {
  id: string
  type: 'shortText' | 'longText' | 'singleSelect' | 'yesNo'
  label: string
  required: boolean
  helpText?: string | null
  placeholder?: string | null
  options?: CoachStartFormFieldOption[]
}

export interface CoachStartOffer {
  id: string
  name: string
  priceLabel: string
  billingLabel?: string | null
  summary?: string | null
  features: string[]
  ctaLabel?: string | null
  ctaUrl?: string | null
  highlighted?: boolean
}

export interface PublicSocialLink {
  label: string
  url: string
}

export interface PublicProfileMediaItem {
  id: string
  type: PublicMediaType
  url: string
  alt: string
  caption?: string | null
  kind: PublicMediaKind
  order: number
}

export interface PublicTestimonial {
  id: string
  quote: string
  authorName: string
  authorRole?: string | null
}

export interface PublicHighlight {
  id: string
  title: string
  value?: string | null
  description?: string | null
}

export interface PublicAchievement {
  id: string
  title: string
  year?: string | null
  description?: string | null
}

export interface PublicFaqItem {
  id: string
  question: string
  answer: PublicRichContent
}

export interface FeaturedPlanConfig {
  planId: string
  order: number
  highlightWeekId?: string | null
  coachNote?: PublicRichContent | null
}

export interface CoachCredibilitySectionContent {
  eyebrow?: string | null
  spotlightTitle?: string | null
  spotlightBody?: PublicRichContent | null
  trustBullets?: string[]
}

export interface PublicProfileSection<
  TType extends string = string,
  TContent = Record<string, any>
> {
  id: string
  type: TType
  enabled: boolean
  order: number
  title?: string | null
  headline?: string | null
  intro?: string | null
  styleVariant?: string | null
  content?: TContent
}

export interface CoachPublicProfile {
  settings: {
    enabled: boolean
    slug: string | null
    displayName: string | null
    headline: string | null
    coachingBrand: string | null
    location: string | null
    websiteUrl: string | null
    ctaUrl: string | null
    bio: PublicRichContent | null
    visibility: PublicProfileVisibility
    socialLinks: PublicSocialLink[]
    specialties: string[]
    credentials: string[]
    featuredPlanMeta: FeaturedPlanConfig[]
    seoTitle: string | null
    seoDescription: string | null
  }
  sections: PublicProfileSection<CoachPublicSectionType>[]
  media: PublicProfileMediaItem[]
  testimonials: PublicTestimonial[]
  startPage: {
    enabled: boolean
    settings: {
      headline: string | null
      intro: string | null
      heroImageUrl: string | null
      heroImageAlt: string | null
      submitLabel: string | null
      loginLabel: string | null
      successTitle: string | null
      successMessage: string | null
    }
    sections: PublicProfileSection<CoachStartSectionType>[]
    introBody: PublicRichContent | null
    steps: CoachJoinPageStep[]
    faq: PublicFaqItem[]
    trustNote: string | null
    noCommitmentBody: PublicRichContent | null
    noCommitmentBullets: string[]
    pricing: {
      note: string | null
      offers: CoachStartOffer[]
    }
    form: {
      title: string | null
      intro: string | null
      fields: CoachStartFormField[]
    }
  }
  joinPage: {
    enabled: boolean
    headline: string | null
    intro: string | null
    ctaLabel: string | null
    welcomeTitle: string | null
    welcomeBody: PublicRichContent | null
    trustTitle: string | null
    trustNote: string | null
    unavailableMessage: string | null
    steps: CoachJoinPageStep[]
    faq: PublicFaqItem[]
  }
}

export interface AthletePublicProfile {
  settings: {
    enabled: boolean
    slug: string | null
    displayName: string | null
    headline: string | null
    location: string | null
    websiteUrl: string | null
    bio: PublicRichContent | null
    visibility: PublicProfileVisibility
    socialLinks: PublicSocialLink[]
    focusSports: string[]
    seoTitle: string | null
    seoDescription: string | null
  }
  sections: PublicProfileSection<AthletePublicSectionType>[]
  media: PublicProfileMediaItem[]
  highlights: PublicHighlight[]
  achievements: PublicAchievement[]
}

function buildSectionId(role: PublicProfileRole, type: string) {
  return `${role}-${type}`
}

function buildCoachStartSectionId(type: string) {
  return `coach-start-${type}`
}

export function buildDefaultCoachSections(): PublicProfileSection<CoachPublicSectionType>[] {
  return COACH_PUBLIC_SECTION_TYPES.map((type, index) => ({
    id: buildSectionId('coach', type),
    type,
    enabled: true,
    order: index,
    title: null,
    content: {}
  }))
}

export function buildDefaultCoachStartSections(): PublicProfileSection<CoachStartSectionType>[] {
  return COACH_START_SECTION_TYPES.map((type, index) => ({
    id: buildCoachStartSectionId(type),
    type,
    enabled: true,
    order: index,
    title: null,
    content: {}
  }))
}

export function buildDefaultAthleteSections(): PublicProfileSection<AthletePublicSectionType>[] {
  return ATHLETE_PUBLIC_SECTION_TYPES.filter((type) => type !== 'links').map((type, index) => ({
    id: buildSectionId('athlete', type),
    type,
    enabled: true,
    order: index,
    title: null,
    content: {}
  }))
}

export function buildDefaultCoachPublicProfile(): CoachPublicProfile {
  return {
    settings: {
      enabled: false,
      slug: null,
      displayName: null,
      headline: null,
      coachingBrand: null,
      location: null,
      websiteUrl: null,
      ctaUrl: null,
      bio: null,
      visibility: 'Private',
      socialLinks: [],
      specialties: [],
      credentials: [],
      featuredPlanMeta: [],
      seoTitle: null,
      seoDescription: null
    },
    sections: buildDefaultCoachSections(),
    media: [],
    testimonials: [],
    startPage: {
      enabled: true,
      settings: {
        headline: null,
        intro: null,
        heroImageUrl: null,
        heroImageAlt: null,
        submitLabel: null,
        loginLabel: null,
        successTitle: null,
        successMessage: null
      },
      sections: buildDefaultCoachStartSections(),
      introBody: null,
      steps: [
        {
          id: 'coach-start-step-request',
          title: 'Tell the coach what you need',
          description:
            'Answer the short intake questions so the coach understands your goals and context.'
        },
        {
          id: 'coach-start-step-account',
          title: 'Create your account or log in',
          description:
            'Finish with a Coach Watts account so your request and future coaching context live in one place.'
        },
        {
          id: 'coach-start-step-review',
          title: 'Wait for coach approval',
          description:
            'The coach reviews your request and can then start working with you inside Coach Watts.'
        }
      ],
      faq: [],
      trustNote: null,
      noCommitmentBody:
        'Sending a request is free, it does not start billing, and it does not lock you into coaching. This is simply the first step to see if there is a fit on both sides.',
      noCommitmentBullets: [
        'Submitting a request is free',
        'No payment is taken at this stage',
        'There is no obligation to continue',
        'The coach reviews fit first'
      ],
      pricing: {
        note: null,
        offers: []
      },
      form: {
        title: 'Request coaching',
        intro: 'Share a few details so the coach knows how to follow up with you.',
        fields: [
          {
            id: 'coach-start-goal',
            type: 'longText',
            label: 'What are you training for right now?',
            required: true,
            helpText: null,
            placeholder: 'Race goal, fitness target, consistency, return from time off...'
          },
          {
            id: 'coach-start-experience',
            type: 'singleSelect',
            label: 'How would you describe your current level?',
            required: true,
            helpText: null,
            placeholder: null,
            options: [
              { id: 'beginner', label: 'Beginner', value: 'beginner' },
              { id: 'intermediate', label: 'Intermediate', value: 'intermediate' },
              { id: 'advanced', label: 'Advanced', value: 'advanced' }
            ]
          },
          {
            id: 'coach-start-contact',
            type: 'yesNo',
            label: 'Are you ready for the coach to reach out soon?',
            required: true,
            helpText: null,
            placeholder: null,
            options: [
              { id: 'yes', label: 'Yes', value: 'yes' },
              { id: 'no', label: 'No', value: 'no' }
            ]
          }
        ]
      }
    },
    joinPage: {
      enabled: false,
      headline: null,
      intro: null,
      ctaLabel: null,
      welcomeTitle: null,
      welcomeBody: null,
      trustTitle: null,
      trustNote: null,
      unavailableMessage: null,
      steps: [
        {
          id: 'coach-join-step-account',
          title: 'Create your account',
          description:
            'Start with a Coach Watts account so your training, messaging, and progress all live in one place.'
        },
        {
          id: 'coach-join-step-connect',
          title: 'Join under your coach',
          description:
            'We will connect your athlete account to this coach using their current public join link.'
        },
        {
          id: 'coach-join-step-start',
          title: 'Start working together',
          description:
            'Finish onboarding and begin training with the context, plans, and communication your coach has set up.'
        }
      ],
      faq: []
    }
  }
}

export function buildDefaultAthletePublicProfile(): AthletePublicProfile {
  return {
    settings: {
      enabled: false,
      slug: null,
      displayName: null,
      headline: null,
      location: null,
      websiteUrl: null,
      bio: null,
      visibility: 'Private',
      socialLinks: [],
      focusSports: [],
      seoTitle: null,
      seoDescription: null
    },
    sections: buildDefaultAthleteSections(),
    media: [],
    highlights: [],
    achievements: []
  }
}

export function buildPublicCoachPath(slug?: string | null) {
  return slug ? `/coach/${slug}` : undefined
}

export function buildPublicCoachHomePath(slug?: string | null) {
  return slug ? `/coach/${slug}/home` : undefined
}

export function buildPublicCoachStartPath(slug?: string | null) {
  return slug ? `/coach/${slug}/start` : undefined
}

export function buildPublicAthletePath(slug?: string | null) {
  return slug ? `/athlete/${slug}` : undefined
}
