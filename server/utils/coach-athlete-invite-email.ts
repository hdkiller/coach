import { sendEmail } from './email'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function sendCoachAthleteInviteEmail(options: {
  to: string
  coachName: string
  joinUrl: string
  code: string
}) {
  const coachName = options.coachName.trim() || 'A coach'
  const safeCoachName = escapeHtml(coachName)
  const safeJoinUrl = escapeHtml(options.joinUrl)
  const safeCode = escapeHtml(options.code.toUpperCase())

  const subject = `${coachName} invited you to Coach Watts`
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 560px; margin: 0 auto; padding: 24px;">
      <p style="font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #2563eb; margin: 0 0 12px;">
        Coach Invitation
      </p>
      <h1 style="font-size: 28px; line-height: 1.1; margin: 0 0 16px;">${safeCoachName} wants to coach you</h1>
      <p style="margin: 0 0 24px; color: #4b5563;">
        Open the invitation below to connect your athlete account with your coach inside Coach Watts.
      </p>
      <p style="margin: 0 0 24px;">
        <a href="${safeJoinUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 10px; font-weight: 700;">
          Accept Invitation
        </a>
      </p>
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; font-weight: 700;">
          Invite Code
        </p>
        <p style="margin: 0; font-size: 24px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; color: #1d4ed8;">
          ${safeCode}
        </p>
      </div>
      <p style="margin: 0 0 8px; color: #4b5563;">If the button does not work, use this link:</p>
      <p style="margin: 0; word-break: break-all;">
        <a href="${safeJoinUrl}" style="color: #2563eb;">${safeJoinUrl}</a>
      </p>
    </div>
  `

  const text = `${coachName} invited you to Coach Watts.\n\nAccept the invitation: ${options.joinUrl}\n\nInvite code: ${options.code.toUpperCase()}`

  return await sendEmail({
    to: options.to,
    subject,
    html,
    text
  })
}
