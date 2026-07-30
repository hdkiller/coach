import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('readBody', async (event: any) => event.body)

const getServerSession = vi.fn()
const sendEmail = vi.fn()
const supportMessageCreate = vi.fn()
const supportMessageUpdate = vi.fn()

vi.mock('../../../../server/utils/session', () => ({
  getServerSession
}))

vi.mock('../../../../server/utils/email', () => ({
  sendEmail
}))

vi.mock('../../../../server/utils/db', () => ({
  prisma: {
    supportMessage: {
      create: supportMessageCreate,
      update: supportMessageUpdate
    }
  }
}))

describe('POST /api/support/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPPORT_EMAIL = 'support@coachwatts.com'
  })

  it('escapes HTML tags and special characters in user input fields', async () => {
    getServerSession.mockResolvedValue(null)
    supportMessageCreate.mockResolvedValue({ id: 'msg-1' })
    sendEmail.mockResolvedValue({ data: { id: 'email-123' } })

    const mod = await import('../../../../server/api/support/send.post')
    const result = await mod.default({
      body: {
        name: '<script>alert("xss")</script>',
        email: 'user&test@example.com',
        subject: 'Help <urgency="high"> & "now"',
        message: 'Hello <iframe src="evil.com"></iframe> & \'world\''
      }
    } as any)

    expect(result).toEqual({ success: true, messageId: 'msg-1' })
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@coachwatts.com',
        subject: 'Support: Help <urgency="high"> & "now"',
        html: expect.stringContaining('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
      })
    )

    const callArgs = sendEmail.mock.calls[0][0]
    expect(callArgs.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(callArgs.html).toContain('user&amp;test@example.com')
    expect(callArgs.html).toContain('Help &lt;urgency=&quot;high&quot;&gt; &amp; &quot;now&quot;')
    expect(callArgs.html).toContain(
      'Hello &lt;iframe src=&quot;evil.com&quot;&gt;&lt;/iframe&gt; &amp; &#39;world&#39;'
    )
  })

  it('throws 400 when subject or message is missing', async () => {
    getServerSession.mockResolvedValue(null)

    const mod = await import('../../../../server/api/support/send.post')

    await expect(
      mod.default({
        body: {
          email: 'user@example.com',
          subject: ''
        }
      } as any)
    ).rejects.toThrow('Subject and message are required')
  })
})
