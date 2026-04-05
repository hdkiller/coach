import { z } from 'zod'
import { sendEmail } from '../../utils/email'
import { prisma } from '../../utils/db'
import { resolveAthletePublicProfile, resolveCoachPublicProfile } from '../../utils/public-presence'

const contactRequestSchema = z.object({
  role: z.enum(['coach', 'athlete']),
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().max(120).nullable().optional(),
  email: z.string().trim().email(),
  subject: z.string().trim().max(160).nullable().optional(),
  message: z.string().trim().min(1).max(5000),
  website: z.string().max(200).optional().default('')
})

const CONTACT_WINDOW_MS = 15 * 60 * 1000
const CONTACT_MAX_ATTEMPTS_PER_WINDOW = 5
const CONTACT_MIN_INTERVAL_MS = 30 * 1000

const submissionTracker = new Map<
  string,
  { count: number; windowStartedAt: number; lastSubmittedAt: number }
>()

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export default defineEventHandler(async (event) => {
  const body = contactRequestSchema.parse(await readBody(event))
  if (body.website?.trim()) {
    throw createError({ statusCode: 400, message: 'Invalid submission.' })
  }

  const forwardedFor = getHeader(event, 'x-forwarded-for')
  const ip =
    forwardedFor?.split(',')[0]?.trim() || getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const rateLimitKey = `${ip}:${body.role}:${body.slug}`
  const now = Date.now()
  const currentEntry = submissionTracker.get(rateLimitKey)

  if (!currentEntry || now - currentEntry.windowStartedAt > CONTACT_WINDOW_MS) {
    submissionTracker.set(rateLimitKey, {
      count: 1,
      windowStartedAt: now,
      lastSubmittedAt: now
    })
  } else {
    if (now - currentEntry.lastSubmittedAt < CONTACT_MIN_INTERVAL_MS) {
      throw createError({
        statusCode: 429,
        message: 'Please wait a moment before sending another message.'
      })
    }
    if (currentEntry.count >= CONTACT_MAX_ATTEMPTS_PER_WINDOW) {
      throw createError({
        statusCode: 429,
        message: 'Too many messages sent recently. Please try again later.'
      })
    }
    currentEntry.count += 1
    currentEntry.lastSubmittedAt = now
    submissionTracker.set(rateLimitKey, currentEntry)
  }

  const where =
    body.role === 'coach'
      ? { coachProfileSlug: body.slug, coachProfileEnabled: true }
      : { athleteProfileSlug: body.slug, athleteProfileEnabled: true }

  const user = await prisma.user.findFirst({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      coachProfileEnabled: true,
      coachProfileSlug: true,
      coachPublicPage: true,
      athleteProfileEnabled: true,
      athleteProfileSlug: true,
      athletePublicPage: true
    }
  })

  if (!user) {
    throw createError({ statusCode: 404, message: 'Public profile not found.' })
  }

  const profile =
    body.role === 'coach' ? resolveCoachPublicProfile(user) : resolveAthletePublicProfile(user)
  const contactSection = [...(profile.sections || [])]
    .filter((section: any) => section.enabled)
    .find((section: any) => section.type === 'contact')

  if (!contactSection?.content?.formEnabled) {
    throw createError({
      statusCode: 400,
      message: 'This profile is not accepting contact form messages.'
    })
  }

  if (!user.email) {
    throw createError({
      statusCode: 500,
      message: 'This profile does not have a contact destination configured.'
    })
  }

  const senderName = body.name?.trim() || 'Website visitor'
  const senderEmail = body.email.trim()
  const subject = body.subject?.trim() || `New ${body.role} page inquiry`
  const message = body.message.trim()
  const profileName = profile.settings.displayName || user.name || 'Public profile'

  const html = `
    <h2>New public profile inquiry</h2>
    <p><strong>Profile:</strong> ${escapeHtml(profileName)}</p>
    <p><strong>Role:</strong> ${escapeHtml(body.role)}</p>
    <p><strong>From:</strong> ${escapeHtml(senderName)} (${escapeHtml(senderEmail)})</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <hr />
    <div style="white-space: pre-wrap;">${escapeHtml(message)}</div>
  `

  await sendEmail({
    to: user.email,
    subject: `[Coach Wattz] ${subject}`,
    html,
    text: `New public profile inquiry\n\nProfile: ${profileName}\nRole: ${body.role}\nFrom: ${senderName} (${senderEmail})\nSubject: ${subject}\n\n${message}`
  })

  return { success: true }
})
