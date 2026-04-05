import { buildPublicCoachPath, buildPublicCoachStartPath } from '../../shared/public-presence'

export function getCoachCoverImage(profile: any) {
  return (profile?.media || []).find((item: any) => item.kind === 'cover') || null
}

export function buildResolvedCoachJoinPage(profile: any) {
  const settings = profile?.settings || {}
  const joinPage = profile?.joinPage || {}

  return {
    enabled: Boolean(joinPage.enabled),
    headline:
      joinPage.headline || `Join ${settings.displayName || settings.coachingBrand || 'this coach'}`,
    intro:
      joinPage.intro ||
      'Create your account or log in to connect with this coach inside Coach Watts.',
    ctaLabel: joinPage.ctaLabel || 'Join this coach',
    welcomeTitle: joinPage.welcomeTitle || 'What joining means',
    welcomeBody:
      joinPage.welcomeBody ||
      'You are joining this coach inside Coach Watts so your communication, plans, and training context all stay connected.',
    trustTitle: joinPage.trustTitle || 'Why join with confidence',
    trustNote:
      joinPage.trustNote ||
      'You will join under this coach inside Coach Watts and continue from there.',
    unavailableMessage:
      joinPage.unavailableMessage ||
      'This coach does not have an active public join link right now. You can still create your account on Coach Watts and join later.',
    steps: Array.isArray(joinPage.steps) ? joinPage.steps : [],
    faq: Array.isArray(joinPage.faq) ? joinPage.faq : []
  }
}

export function buildCoachJoinExperience(input: {
  user: any
  profile: any
  inviteCode?: string | null
  activeInviteAvailable: boolean
}) {
  const { user, profile, inviteCode, activeInviteAvailable } = input
  const coverImage = getCoachCoverImage(profile)
  const resolvedJoinPage = buildResolvedCoachJoinPage(profile)

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
      joinUrl: buildPublicCoachStartPath(profile?.settings?.slug)
    },
    joinPage: resolvedJoinPage,
    proof: {
      specialties: profile?.settings?.specialties || [],
      credentials: profile?.settings?.credentials || [],
      testimonial: profile?.testimonials?.[0] || null
    },
    activeInviteCode: inviteCode || null,
    activeInviteAvailable
  }
}
