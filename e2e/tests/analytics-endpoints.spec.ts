import { expect, test } from '@playwright/test'
import { mintE2eAccessToken } from '../helpers/token.ts'
import { E2E_MOBILE_CLIENT_ID } from '../seed.ts'

test.describe('E2E Analytics Endpoints', () => {
  test('fetches analytics fields and dashboard definitions', async ({ request }) => {
    const token = await mintE2eAccessToken(process.env.E2E_TEST_USER_EMAIL, E2E_MOBILE_CLIENT_ID)
    const headers = { Authorization: `Bearer ${token.access_token}` }

    // 1. Fetch analytics fields
    const fieldsRes = await request.get('/api/analytics/fields', { headers })
    expect(fieldsRes.ok()).toBeTruthy()

    // 2. Fetch analytics dashboards
    const dashboardsRes = await request.get('/api/analytics/dashboards', { headers })
    expect(dashboardsRes.ok()).toBeTruthy()
  })
})
