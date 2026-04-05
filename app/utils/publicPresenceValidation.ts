import { normalizeYouTubeUrl } from '~/utils/strengthExerciseLibrary'

type PublicRole = 'coach' | 'athlete'

export type PublicPresenceValidationErrors = Record<string, string>

function isBlank(value: unknown) {
  return typeof value !== 'string' || !value.trim()
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isValidPhone(value: string) {
  return /^[+\d()[\]\-.\s]{6,}$/.test(value)
}

function addOptionalUrlError(
  errors: PublicPresenceValidationErrors,
  path: string,
  label: string,
  value?: string | null
) {
  if (isBlank(value)) return
  if (!isValidHttpUrl(value!.trim())) {
    errors[path] = `${label} must be a valid http or https URL.`
  }
}

function addOptionalYouTubeError(
  errors: PublicPresenceValidationErrors,
  path: string,
  value?: string | null
) {
  if (isBlank(value)) return
  if (!normalizeYouTubeUrl(value!.trim())) {
    errors[path] = 'Enter a valid YouTube URL.'
  }
}

function addContactMethodError(
  errors: PublicPresenceValidationErrors,
  path: string,
  type?: string | null,
  value?: string | null
) {
  if (isBlank(value)) return
  const trimmedValue = value!.trim()

  if (type === 'email' && !isValidEmail(trimmedValue)) {
    errors[path] = 'Enter a valid email address.'
    return
  }

  if (type === 'phone' && !isValidPhone(trimmedValue)) {
    errors[path] = 'Enter a valid phone number.'
    return
  }

  if ((type === 'link' || !type) && !isValidHttpUrl(trimmedValue)) {
    errors[path] = 'Enter a valid http or https URL.'
  }
}

export function validatePublicPresenceSettings(
  profile: any,
  role: PublicRole
): PublicPresenceValidationErrors {
  const errors: PublicPresenceValidationErrors = {}
  addOptionalUrlError(errors, 'settings.ctaUrl', 'Primary CTA URL', profile?.settings?.ctaUrl)

  if (role === 'coach') {
    addOptionalUrlError(errors, 'settings.websiteUrl', 'Website', profile?.settings?.websiteUrl)
  }

  return errors
}

export function validatePublicProfileDraft(
  profile: any,
  role: PublicRole
): PublicPresenceValidationErrors {
  const errors = validatePublicPresenceSettings(profile, role)

  addOptionalUrlError(errors, 'settings.websiteUrl', 'Website', profile?.settings?.websiteUrl)

  for (const [index, link] of (profile?.settings?.socialLinks || []).entries()) {
    addOptionalUrlError(errors, `settings.socialLinks.${index}.url`, 'Social link', link?.url)
  }

  for (const [index, media] of (profile?.media || []).entries()) {
    if (media?.type === 'external') {
      addOptionalUrlError(errors, `media.${index}.url`, 'Image URL', media?.url)
    }
  }

  for (const [sectionIndex, section] of (profile?.sections || []).entries()) {
    if (section?.type === 'videoIntro') {
      addOptionalYouTubeError(
        errors,
        `sections.${sectionIndex}.content.videoUrl`,
        section?.content?.videoUrl
      )
    }

    if (section?.type === 'contact') {
      for (const [methodIndex, method] of (section?.content?.methods || []).entries()) {
        addContactMethodError(
          errors,
          `sections.${sectionIndex}.content.methods.${methodIndex}.value`,
          method?.type,
          method?.value
        )
      }
    }
  }

  return errors
}

export function validateCoachStartPageDraft(startPage: any): PublicPresenceValidationErrors {
  const errors: PublicPresenceValidationErrors = {}

  addOptionalUrlError(
    errors,
    'settings.heroImageUrl',
    'Hero image URL',
    startPage?.settings?.heroImageUrl
  )

  for (const [sectionIndex, section] of (startPage?.sections || []).entries()) {
    if (section?.type !== 'pricing') continue

    for (const [offerIndex, offer] of (section?.content?.offers || []).entries()) {
      addOptionalUrlError(
        errors,
        `sections.${sectionIndex}.content.offers.${offerIndex}.ctaUrl`,
        'Offer CTA URL',
        offer?.ctaUrl
      )
    }
  }

  return errors
}

function humanizePath(path: string) {
  const normalized = path
    .replace(/\.\d+\./g, '.')
    .replace(/\.\d+$/g, '')
    .replace(/^settings\./, '')
    .replace(/^sections\./, '')
    .replace(/^media\./, '')
    .replace(/^content\./, '')

  const labels: Record<string, string> = {
    ctaUrl: 'Primary CTA URL',
    websiteUrl: 'Website',
    videoUrl: 'Video URL',
    url: 'URL',
    value: 'Value'
  }

  const lastSegment = normalized.split('.').filter(Boolean).pop() || normalized
  return (
    labels[lastSegment] ||
    lastSegment.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase())
  )
}

export function getFirstValidationMessage(
  errors: PublicPresenceValidationErrors,
  fallback = 'Please review the highlighted fields.'
) {
  return Object.values(errors)[0] || fallback
}

export function formatPublicPresenceApiError(error: any, fallback: string) {
  const rawMessage = error?.data?.message || error?.data?.statusMessage || error?.message
  if (!rawMessage || typeof rawMessage !== 'string') {
    return fallback
  }

  try {
    const parsed = JSON.parse(rawMessage)
    if (Array.isArray(parsed) && parsed.length) {
      const issue = parsed[0]
      if (issue?.message) {
        const label =
          Array.isArray(issue.path) && issue.path.length
            ? `${humanizePath(issue.path.join('.'))}: `
            : ''
        return `${label}${issue.message}`
      }
    }
  } catch {
    return rawMessage
  }

  return rawMessage
}
