import { Resend } from 'resend'

let resendInstance: Resend | null = null

export const getResend = () => {
  if (resendInstance) return resendInstance

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Only throw if we try to use it and it's missing.
    // This allows the app to start even if key is missing (though email sending will fail)
    console.warn('RESEND_API_KEY is not defined. Email sending will fail.')
    return null
  }

  resendInstance = new Resend(apiKey)
  return resendInstance
}

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  text?: string
}

export const sendEmail = async (options: SendEmailOptions) => {
  const resend = getResend()
  if (!resend) {
    throw new Error('Email configuration missing (RESEND_API_KEY)')
  }

  const from =
    options.from ||
    process.env.MAIL_FROM_ADDRESS ||
    process.env.EMAIL_FROM ||
    'Coach Watts <onboarding@resend.dev>'

  const response = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text
  })

  if (response.error) {
    throw new Error('Error sending email: ' + response.error.message)
  }

  return response
}
