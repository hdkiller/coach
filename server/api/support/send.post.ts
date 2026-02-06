import { getServerSession } from '../../utils/session'
import { sendEmail } from '../../utils/email'
import { prisma } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const session = await getServerSession(event)

  const { subject, message, email, name } = body

  if (!subject || !message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Subject and message are required'
    })
  }

  // Identify user or guest
  const userId = session?.user?.id
  const userEmail = session?.user?.email || email
  const userName = session?.user?.name || name

  if (!userEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email is required (log in or provide email)'
    })
  }

  // 1. Save to database
  const supportMessage = await prisma.supportMessage.create({
    data: {
      userId: userId || null,
      email: userEmail,
      name: userName,
      subject,
      message,
      status: 'OPEN'
    }
  })

  // 2. Send Email
  const supportEmail = process.env.SUPPORT_EMAIL
  if (!supportEmail) {
    console.error('SUPPORT_EMAIL is not defined')
    throw createError({
      statusCode: 500,
      statusMessage: 'Support email configuration error'
    })
  }

  const htmlContent = `
    <h2>New Support Message</h2>
    <p><strong>From:</strong> ${userName} (${userEmail})</p>
    <p><strong>User ID:</strong> ${userId || 'Guest'}</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <hr />
    <h3>Message:</h3>
    <div style="white-space: pre-wrap;">${message}</div>
  `

  let emailResponse
  try {
    emailResponse = await sendEmail({
      to: supportEmail,
      subject: `Support: ${subject}`,
      html: htmlContent
    })
  } catch (error: any) {
    console.error('Failed to send support email', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send support email'
    })
  }

  // 3. Update database with email ID
  if (emailResponse?.data?.id) {
    await prisma.supportMessage.update({
      where: { id: supportMessage.id },
      data: {
        autotaskTicketId: emailResponse.data.id,
        autotaskTicketNumber: 'RESEND'
      }
    })
  }

  return {
    success: true,
    messageId: supportMessage.id
  }
})
