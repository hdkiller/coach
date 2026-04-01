import { z } from 'zod'
import { requireAuth } from '../../../utils/auth-guard'
import { sendCoachAthleteInviteEmail } from '../../../utils/coach-athlete-invite-email'

const createInviteSchema = z.object({
  email: z.preprocess((val) => (val === '' ? undefined : val), z.string().trim().email().optional())
})

defineRouteMeta({
  openAPI: {
    tags: ['Coaching'],
    summary: 'Create athlete invite',
    description:
      'Creates a coach-generated athlete invite. If an email is provided, the join link is emailed to the athlete; otherwise a shareable public invite link is created.',
    responses: {
      201: { description: 'Created' },
      401: { description: 'Unauthorized' }
    }
  }
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event, ['coaching:write'])
  const body = await readValidatedBody(event, createInviteSchema.parse)
  const invite = await coachingRepository.createAthleteInviteForCoach(user.id, body.email)

  if (!invite || !invite.id || !invite.code) {
    throw createError({
      statusCode: 500,
      message: 'Failed to create invitation'
    })
  }

  const baseUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://coachwatts.com'
  const joinUrl = `${baseUrl}/join/${invite.code}`

  if (invite.email) {
    try {
      await sendCoachAthleteInviteEmail({
        to: invite.email,
        coachName: invite.coach.name || invite.coach.email,
        joinUrl,
        code: invite.code
      })
    } catch (error: any) {
      await coachingRepository.revokeAthleteInviteForCoach(user.id, invite.id)
      throw createError({
        statusCode: 500,
        message: error.message || 'Failed to send invitation email'
      })
    }
  }

  setResponseStatus(event, 201)
  return invite
})
