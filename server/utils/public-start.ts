import { buildPublicCoachPath, buildPublicCoachStartPath } from '../../shared/public-presence'

export function getCoachStartCoverImage(profile: any) {
  return (profile?.media || []).find((item: any) => item.kind === 'cover') || null
}

export function getVisibleStartSections(profile: any) {
  return [...(profile?.startPage?.sections || [])]
    .filter((section: any) => section.enabled)
    .sort((a: any, b: any) => a.order - b.order)
}

export function buildResolvedCoachStartPage(profile: any) {
  const settings = profile?.settings || {}
  const startPage = profile?.startPage || {}
  const startSettings = startPage.settings || {}

  return {
    enabled: startPage.enabled !== false,
    settings: {
      headline:
        startSettings.headline ||
        `Start with ${settings.displayName || settings.coachingBrand || 'this coach'}`,
      intro:
        startSettings.intro ||
        'Learn how this coach works, answer a few intake questions, and send a coaching request.',
      submitLabel: startSettings.submitLabel || 'Submit coaching request',
      loginLabel: startSettings.loginLabel || 'Continue to create account',
      successTitle: startSettings.successTitle || 'Request submitted',
      successMessage:
        startSettings.successMessage ||
        'Your request is now pending coach approval. You will be able to continue once the coach reviews it.'
    },
    sections: getVisibleStartSections(profile),
    introBody:
      startPage.introBody ||
      'Use this page to introduce how you coach, set expectations, and collect enough context to decide who you want to work with.',
    steps: Array.isArray(startPage.steps) ? startPage.steps : [],
    faq: Array.isArray(startPage.faq) ? startPage.faq : [],
    trustNote:
      startPage.trustNote ||
      'This request goes directly to the coach so they can decide whether the fit is right before starting together.',
    form: {
      title: startPage.form?.title || 'Request coaching',
      intro:
        startPage.form?.intro ||
        'Share a few quick answers so the coach knows what you need help with.',
      fields: Array.isArray(startPage.form?.fields) ? startPage.form.fields : []
    }
  }
}

export function buildCoachStartExperience(input: {
  user: any
  profile: any
  viewer?: {
    isOwner?: boolean
    isAuthenticated?: boolean
    hasActiveCoach?: boolean
    activeCoachNames?: string[]
  }
}) {
  const { user, profile, viewer } = input
  const coverImage = getCoachStartCoverImage(profile)
  const startPage = buildResolvedCoachStartPage(profile)

  return {
    coach: {
      id: user.id,
      name: profile?.settings?.displayName || user.name || user.email,
      image: user.image || null,
      brand: profile?.settings?.coachingBrand || null,
      headline: profile?.settings?.headline || null,
      location: profile?.settings?.location || null,
      coverImageUrl: coverImage?.url || null,
      profileUrl: buildPublicCoachPath(profile?.settings?.slug),
      startUrl: buildPublicCoachStartPath(profile?.settings?.slug)
    },
    startPage,
    proof: {
      specialties: profile?.settings?.specialties || [],
      credentials: profile?.settings?.credentials || [],
      testimonial: profile?.testimonials?.[0] || null
    },
    viewer: {
      isOwner: Boolean(viewer?.isOwner),
      isAuthenticated: Boolean(viewer?.isAuthenticated),
      hasActiveCoach: Boolean(viewer?.hasActiveCoach),
      activeCoachNames: viewer?.activeCoachNames || []
    }
  }
}
