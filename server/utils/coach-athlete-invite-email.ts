import { EmailDeliveryService } from './services/emailDeliveryService'
import { getEmailTemplateDefinition } from './email-template-registry'

export async function sendCoachAthleteInviteEmail(options: {
  to: string
  coachName: string
  joinUrl: string
  code: string
}) {
  const coachName = options.coachName.trim() || 'A coach'
  const template = getEmailTemplateDefinition('CoachInvite')
  const subject = template?.defaultSubject || `${coachName} invited you to Coach Watts`

  return await EmailDeliveryService.runSendEmail({
    toEmail: options.to,
    templateKey: 'CoachInvite',
    eventKey: 'COACH_ATHLETE_INVITE',
    audience: 'TRANSACTIONAL',
    subject,
    props: {
      coachName,
      joinUrl: options.joinUrl,
      code: options.code.toUpperCase()
    },
    idempotencyKey: `coach-invite:${options.to}:${options.code.toUpperCase()}`
  })
}
