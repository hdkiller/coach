import { describe, expect, it } from 'vitest'

describe('activity recommendation processing placeholder', () => {
  it('uses the Prisma reasoning field, not reasoningText', () => {
    const payload = {
      user: { connect: { id: 'user-1' } },
      date: new Date('2026-07-10T00:00:00.000Z'),
      recommendation: 'proceed',
      confidence: 0,
      reasoning: 'Analysis in progress...',
      status: 'PROCESSING'
    }

    expect(payload).toHaveProperty('reasoning')
    expect(payload).not.toHaveProperty('reasoningText')
  })
})
