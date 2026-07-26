import { expect, test } from '../fixtures/test-fixtures.ts'

test.describe('E2E Analytics Endpoints', () => {
  test('fetches analytics presets and summary metrics', async ({ authedPage }) => {
    // Presets are session-auth POST routes under /api/analytics/presets/:preset
    const presetsRes = await authedPage.request.post('/api/analytics/presets/compliance', {
      data: {
        timeRange: {
          startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
          endDate: new Date().toISOString()
        }
      }
    })
    expect(presetsRes.ok()).toBeTruthy()
    const presetBody = await presetsRes.json()
    expect(presetBody).toBeTruthy()

    const statsRes = await authedPage.request.get('/api/stats/monthly-comparison')
    expect(statsRes.ok()).toBeTruthy()
  })
})
