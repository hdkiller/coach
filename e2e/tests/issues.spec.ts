import { expect, test } from '../fixtures/test-fixtures.ts'

test.describe('E2E Issues & Bug Reports Endpoints', () => {
  test('creates, lists, comments on, and fetches issue reports', async ({ authedPage }) => {
    // Issues routes use getServerSession (cookie), not Bearer OAuth tokens.
    const createRes = await authedPage.request.post('/api/issues', {
      data: {
        title: 'E2E Test Sync Glitch',
        description: 'Encountered unexpected latency during Strava sync'
      }
    })
    expect(createRes.ok()).toBeTruthy()
    const issue = await createRes.json()
    expect(issue.id).toBeTruthy()
    expect(issue.title).toBe('E2E Test Sync Glitch')

    const getRes = await authedPage.request.get(`/api/issues/${issue.id}`)
    expect(getRes.ok()).toBeTruthy()
    const fetchedIssue = await getRes.json()
    expect(fetchedIssue.id).toBe(issue.id)

    const commentRes = await authedPage.request.post(`/api/issues/${issue.id}/comments`, {
      data: {
        content: 'Issue reproduced on staging build'
      }
    })
    expect(commentRes.ok()).toBeTruthy()
    const comment = await commentRes.json()
    expect(comment.id).toBeTruthy()

    // User-facing issues API embeds comments on the issue detail payload
    // (there is no separate /comments GET for non-admin callers).
    const withCommentsRes = await authedPage.request.get(`/api/issues/${issue.id}`)
    expect(withCommentsRes.ok()).toBeTruthy()
    const withComments = await withCommentsRes.json()
    expect(Array.isArray(withComments.comments)).toBeTruthy()
    expect(
      withComments.comments.some((c: { id: string }) => c.id === comment.id)
    ).toBeTruthy()
  })
})
