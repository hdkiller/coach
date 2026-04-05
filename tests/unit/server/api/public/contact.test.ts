import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (err: any) => {
  const error = new Error(err.message || err.statusMessage)
  ;(error as any).statusCode = err.statusCode
  return error
})
vi.stubGlobal('readBody', async (event: any) => event.body)
vi.stubGlobal('getHeader', (event: any, key: string) => event.node?.req?.headers?.[key])
vi.stubGlobal('getRequestIP', () => '127.0.0.1')

const findFirst = vi.fn()
const sendEmail = vi.fn()

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    user: {
      findFirst
    }
  }
}))

vi.mock('../../../../../server/utils/email', () => ({
  sendEmail
}))

describe('public contact endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emails the profile owner when the contact form is enabled', async () => {
    findFirst.mockResolvedValue({
      id: 'user-1',
      name: 'Coach Jane',
      email: 'coach@example.com',
      coachProfileEnabled: true,
      coachProfileSlug: 'coach-jane',
      coachPublicPage: {
        settings: {
          enabled: true,
          slug: 'coach-jane',
          displayName: 'Coach Jane'
        },
        sections: [
          { id: 'coach-hero', type: 'hero', enabled: true, order: 0, content: {} },
          {
            id: 'coach-contact',
            type: 'contact',
            enabled: true,
            order: 1,
            content: { formEnabled: true }
          }
        ]
      }
    })

    const mod = await import('../../../../../server/api/public/contact.post')
    const result = await mod.default({
      body: {
        role: 'coach',
        slug: 'coach-jane',
        name: 'Runner Sam',
        email: 'sam@example.com',
        subject: 'Coaching inquiry',
        message: 'I would love help preparing for my first marathon.'
      }
    })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'coach@example.com',
        subject: '[Coach Wattz] Coaching inquiry'
      })
    )
    expect(result).toEqual({ success: true })
  })

  it('rejects honeypot submissions', async () => {
    findFirst.mockResolvedValue({
      id: 'user-1',
      name: 'Coach Jane',
      email: 'coach@example.com',
      coachProfileEnabled: true,
      coachProfileSlug: 'coach-jane',
      coachPublicPage: {
        settings: {
          enabled: true,
          slug: 'coach-jane',
          displayName: 'Coach Jane'
        },
        sections: [
          { id: 'coach-hero', type: 'hero', enabled: true, order: 0, content: {} },
          {
            id: 'coach-contact',
            type: 'contact',
            enabled: true,
            order: 1,
            content: { formEnabled: true }
          }
        ]
      }
    })

    const mod = await import('../../../../../server/api/public/contact.post')

    await expect(
      mod.default({
        node: { req: { headers: {} } },
        body: {
          role: 'coach',
          slug: 'coach-jane',
          name: 'Runner Sam',
          email: 'sam@example.com',
          subject: 'Coaching inquiry',
          message: 'Hello there',
          website: 'spam'
        }
      })
    ).rejects.toThrow(/invalid submission/i)
  })
})
