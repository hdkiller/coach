import { z } from 'zod'
import {
  PLAN_ACCESS_STATE_OPTIONS,
  PLAN_SKILL_LEVEL_OPTIONS,
  PLAN_VISIBILITY_OPTIONS,
  PLAN_VOLUME_BAND_OPTIONS,
  PUBLIC_PLAN_ACCESS_MODE_OPTIONS,
  normalizePlanAccessState,
  normalizePlanVisibility,
  slugifyPublicName
} from '../../shared/public-plans'

export const publicSocialLinksSchema = z
  .array(
    z.object({
      label: z.string().min(1).max(60),
      url: z.string().url()
    })
  )
  .max(6)

export const publicAuthorProfileSchema = z.object({
  visibility: z.enum(['Private', 'Public', 'Followers Only']).optional(),
  publicAuthorSlug: z.string().max(80).nullable().optional(),
  publicDisplayName: z.string().max(120).nullable().optional(),
  publicBio: z.string().max(4000).nullable().optional(),
  publicLocation: z.string().max(160).nullable().optional(),
  publicWebsiteUrl: z.string().url().nullable().optional(),
  publicCoachingBrand: z.string().max(160).nullable().optional(),
  publicSocialLinks: publicSocialLinksSchema.nullable().optional()
})

export const planPublicationSchema = z.object({
  visibility: z.enum(PLAN_VISIBILITY_OPTIONS).optional(),
  accessState: z.enum(PLAN_ACCESS_STATE_OPTIONS).optional(),
  slug: z.string().max(80).nullable().optional(),
  primarySport: z.string().max(60).nullable().optional(),
  sportSubtype: z.string().max(80).nullable().optional(),
  skillLevel: z.enum(PLAN_SKILL_LEVEL_OPTIONS).nullable().optional(),
  planLanguage: z.string().max(60).nullable().optional(),
  daysPerWeek: z.number().int().min(1).max(14).nullable().optional(),
  weeklyVolumeBand: z.enum(PLAN_VOLUME_BAND_OPTIONS).nullable().optional(),
  goalLabel: z.string().max(120).nullable().optional(),
  equipmentTags: z.array(z.string().max(60)).max(12).optional(),
  publicHeadline: z.string().max(200).nullable().optional(),
  publicDescription: z.string().max(8000).nullable().optional(),
  methodology: z.string().max(4000).nullable().optional(),
  whoItsFor: z.string().max(3000).nullable().optional(),
  faq: z.string().max(6000).nullable().optional(),
  extraContent: z.string().max(6000).nullable().optional(),
  isFeatured: z.boolean().optional(),
  teamId: z.string().nullable().optional(),
  sampleWeekIds: z.array(z.string()).max(24).optional()
})

export const publicPlansQuerySchema = z.object({
  sport: z.string().optional(),
  subtype: z.string().optional(),
  skillLevel: z.enum(PLAN_SKILL_LEVEL_OPTIONS).optional(),
  language: z.string().optional(),
  daysPerWeek: z.coerce.number().int().min(1).max(14).optional(),
  lengthWeeks: z.coerce.number().int().min(1).max(52).optional(),
  weeklyVolumeBand: z.enum(PLAN_VOLUME_BAND_OPTIONS).optional(),
  accessState: z.enum(PLAN_ACCESS_STATE_OPTIONS).optional(),
  sort: z
    .enum(['newest', 'featured', 'shortest', 'longest', 'easiest', 'hardest'])
    .default('featured'),
  q: z.string().optional()
})

export function normalizePublicAuthorSlug(value?: string | null) {
  return value && value.trim() ? slugifyPublicName(value) : null
}

export function normalizePublicPlanSlug(value?: string | null, fallbackName?: string | null) {
  const base = value && value.trim() ? value : fallbackName || ''
  const slug = slugifyPublicName(base)
  return slug || null
}

export function validatePublicationState(input: {
  visibility?: string | null
  accessState?: string | null
  slug?: string | null
  publicDescription?: string | null
  primarySport?: string | null
  skillLevel?: string | null
  sampleWeekIds?: string[]
}) {
  const visibility = normalizePlanVisibility(input.visibility)
  const accessState = normalizePlanAccessState(input.accessState)

  if (visibility === 'PRIVATE') return

  if (!input.slug) {
    throw createError({
      statusCode: 400,
      message: 'Public plans require a slug.'
    })
  }

  if (!input.publicDescription?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Public plans require a public description.'
    })
  }

  if (!input.primarySport?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Public plans require a primary sport.'
    })
  }

  if (!input.skillLevel?.trim()) {
    throw createError({
      statusCode: 400,
      message: 'Public plans require a skill level.'
    })
  }

  if (accessState === 'RESTRICTED' && (!input.sampleWeekIds || input.sampleWeekIds.length === 0)) {
    throw createError({
      statusCode: 400,
      message: 'Restricted public plans require at least one sample week.'
    })
  }
}

export function resolveShareTokenAccessMode(value?: string | null) {
  return PUBLIC_PLAN_ACCESS_MODE_OPTIONS.includes(value as any) ? value : 'PREVIEW'
}
