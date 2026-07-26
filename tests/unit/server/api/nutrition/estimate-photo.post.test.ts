import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateObject } from 'ai'

import { requireAuth } from '../../../../../server/utils/auth-guard'
import { getUserNutritionSettings } from '../../../../../server/utils/nutrition/settings'

vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (error: any) => {
  const err = new Error(error.message) as any
  err.statusCode = error.statusCode
  return err
})

let body: any = {}
vi.stubGlobal('readBody', async () => body)

vi.mock('ai', () => ({ generateObject: vi.fn() }))
vi.mock('@ai-sdk/google', () => ({ createGoogle: () => () => 'model' }))
vi.mock('../../../../../server/utils/auth-guard', () => ({ requireAuth: vi.fn() }))
vi.mock('../../../../../server/utils/ai-config', () => ({ resolveModelId: (id: string) => id }))
vi.mock('../../../../../server/utils/nutrition/settings', () => ({
  getUserNutritionSettings: vi.fn()
}))

async function post(payload: Record<string, unknown>) {
  body = payload
  const handler = (await import('../../../../../server/api/nutrition/estimate-photo.post')).default
  return handler({} as any)
}

/** The text part of the prompt the model was called with. */
function promptText() {
  const call = vi.mocked(generateObject).mock.calls[0]?.[0] as any
  return call.messages[0].content.find((part: any) => part.type === 'text').text as string
}

const IMAGE = Buffer.from('fake-jpeg').toString('base64')

describe('POST /api/nutrition/estimate-photo', () => {
  // Most of this suite stubs globals without restoring them; do not add to the pile.
  afterAll(() => {
    vi.unstubAllGlobals()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuth).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(getUserNutritionSettings).mockResolvedValue({} as any)
    vi.mocked(generateObject).mockResolvedValue({ object: { name: 'Porridge' } } as any)
  })

  it('analyses a photo', async () => {
    const result: any = await post({ imageBase64: IMAGE })

    expect(result.success).toBe(true)
    expect(result.estimate.name).toBe('Porridge')
  })

  it('tells the model about the athlete dietary constraints', async () => {
    // Read from settings, not the request body - the coach insight can suggest what to add next
    // time, and every other surface that names food filters on these.
    vi.mocked(getUserNutritionSettings).mockResolvedValue({
      dietaryProfile: ['GLUTEN_FREE'],
      foodAllergies: ['PEANUTS'],
      foodIntolerances: ['LACTOSE'],
      lifestyleExclusions: ['NO_ALCOHOL']
    } as any)

    await post({ imageBase64: IMAGE })

    const prompt = promptText()
    expect(prompt).toContain('GLUTEN_FREE')
    expect(prompt).toContain('PEANUTS')
    expect(prompt).toContain('LACTOSE')
    expect(prompt).toContain('NO_ALCOHOL')
  })

  it('says nothing about constraints when the athlete has none', async () => {
    await post({ imageBase64: IMAGE })

    expect(promptText()).not.toContain('Dietary constraints')
  })

  it('rejects an oversized image rather than forwarding it to the vision model', async () => {
    await expect(post({ imageBase64: 'a'.repeat(11_000_001) })).rejects.toMatchObject({
      statusCode: 400
    })
    expect(generateObject).not.toHaveBeenCalled()
  })

  it('rejects a non-image mime type', async () => {
    await expect(post({ imageBase64: IMAGE, mimeType: 'application/pdf' })).rejects.toMatchObject({
      statusCode: 400
    })
    expect(generateObject).not.toHaveBeenCalled()
  })

  it('rejects an empty image', async () => {
    await expect(post({ imageBase64: '' })).rejects.toMatchObject({ statusCode: 400 })
  })
})
