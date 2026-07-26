import { expect, test } from '@playwright/test'
import { mintE2eAccessToken } from '../helpers/token.ts'
import { E2E_MOBILE_CLIENT_ID } from '../seed.ts'

test.describe('E2E Analytics Endpoints', () => {
  test('fetches analytics presets and summary metrics', async ({ request }) => {
    const token = await mintE2eAccessToken(process.env.E2E_TEST_USER_EMAIL, E2E_MOBILE_CLIENT_ID)
    const headers = { Authorization: `Bearer ${token.access_token}` }

    // 1. Fetch analytics presets
    const presetsRes = await request.get('/api/analytics/presets', { headers })
    expect(presetsRes.ok()).toBeTruthy()

    // 2. Fetch monthly comparison stats
    const statsRes = await request.get('/api/stats/monthly-comparison', { headers })
    expect(statsRes.ok()).toBeTruthy()
  })
})
