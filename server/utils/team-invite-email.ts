import { EmailDeliveryService } from './services/emailDeliveryService'
import { getEmailTemplateDefinition } from './email-template-registry'

function formatRoleLabel(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'an admin'
    case 'COACH':
      return 'a coach'
    case 'ATHLETE':
      return 'an athlete'
    default:
      return 'a member'
  }
}

export async function sendTeamInviteEmail(options: {
  to: string
  teamName: string
  role: string
  joinUrl: string
  code: string
}) {
  const teamName = options.teamName.trim() || 'A team'
  const roleLabel = formatRoleLabel(options.role)
  const template = getEmailTemplateDefinition('TeamInvite')
  const subject = template?.defaultSubject || `You're invited to join ${teamName} on Coach Watts`

  return await EmailDeliveryService.runSendEmail({
    toEmail: options.to,
    templateKey: 'TeamInvite',
    eventKey: 'TEAM_INVITE',
    audience: 'TRANSACTIONAL',
    subject,
    props: {
      teamName,
      roleLabel,
      joinUrl: options.joinUrl,
      code: options.code.toUpperCase()
    },
    idempotencyKey: `team-invite:${options.to}:${options.code.toUpperCase()}`
  })
}
