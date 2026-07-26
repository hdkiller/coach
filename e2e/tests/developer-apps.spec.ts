import { expect, test } from '@playwright/test'
import { mintE2eAccessToken } from '../helpers/token.ts'
import { E2E_MOBILE_CLIENT_ID } from '../seed.ts'

test.describe('E2E Developer OAuth Apps Endpoints', () => {
  test('creates, lists, fetches secret, and deletes an OAuth application', async ({ request }) => {
    const token = await mintE2eAccessToken(process.env.E2E_TEST_USER_EMAIL, E2E_MOBILE_CLIENT_ID)
    const headers = { Authorization: `Bearer ${token.access_token}` }

    // 1. List developer apps
    const listRes = await request.get('/api/developer/apps', { headers })
    expect(listRes.ok()).toBeTruthy()
    const apps = await listRes.json()
    expect(Array.isArray(apps)).toBeTruthy()

    // 2. Create developer app
    const createRes = await request.post('/api/developer/apps', {
      headers,
      data: {
        name: 'E2E Test Companion App',
        description: 'Test OAuth integration app',
        redirectUris: ['https://example.com/oauth/callback']
      }
    })
    expect(createRes.ok()).toBeTruthy()
    const app = await createRes.json()
    expect(app.id).toBeTruthy()
    expect(app.name).toBe('E2E Test Companion App')

    // 3. Fetch single app details
    const getRes = await request.get(`/api/developer/apps/${app.id}`, { headers })
    expect(getRes.ok()).toBeTruthy()
    const fetchedApp = await getRes.json()
    expect(fetchedApp.id).toBe(app.id)

    // 4. Generate new client secret
    const secretRes = await request.post(`/api/developer/apps/${app.id}/secret`, { headers })
    expect(secretRes.ok()).toBeTruthy()
    const secretData = await secretRes.json()
    expect(secretData.clientSecret).toBeTruthy()

    // 5. Delete developer app
    const deleteRes = await request.delete(`/api/developer/apps/${app.id}`, { headers })
    expect(deleteRes.ok()).toBeTruthy()
  })
})
