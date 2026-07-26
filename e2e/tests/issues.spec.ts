import { expect, test } from '@playwright/test'
import { mintE2eAccessToken } from '../helpers/token.ts'
import { E2E_MOBILE_CLIENT_ID } from '../seed.ts'

test.describe('E2E Issues & Bug Reports Endpoints', () => {
  test('creates, lists, comments on, and fetches issue reports', async ({ request }) => {
    const token = await mintE2eAccessToken(process.env.E2E_TEST_USER_EMAIL, E2E_MOBILE_CLIENT_ID)
    const headers = { Authorization: `Bearer ${token.access_token}` }

    // 1. Create issue
    const createRes = await request.post('/api/issues', {
      headers,
      data: {
        title: 'E2E Test Sync Glitch',
        description: 'Encountered unexpected latency during Strava sync',
        category: 'BUG',
        priority: 'MEDIUM'
      }
    })
    expect(createRes.ok()).toBeTruthy()
    const issue = await createRes.json()
    expect(issue.id).toBeTruthy()
    expect(issue.title).toBe('E2E Test Sync Glitch')

    // 2. Fetch issue details
    const getRes = await request.get(`/api/issues/${issue.id}`, { headers })
    expect(getRes.ok()).toBeTruthy()
    const fetchedIssue = await getRes.json()
    expect(fetchedIssue.id).toBe(issue.id)

    // 3. Add comment to issue
    const commentRes = await request.post(`/api/issues/${issue.id}/comments`, {
      headers,
      data: {
        content: 'Issue reproduced on staging build'
      }
    })
    expect(commentRes.ok()).toBeTruthy()
    const comment = await commentRes.json()
    expect(comment.id).toBeTruthy()

    // 4. Fetch user issues list
    const listRes = await request.get('/api/issues', { headers })
    expect(listRes.ok()).toBeTruthy()
  })
})
