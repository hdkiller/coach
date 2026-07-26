import { expect, test } from '../fixtures/test-fixtures.ts'

test.describe('E2E Goals Endpoints', () => {
  test('creates, lists, updates, and deletes a user goal', async ({ authedPage }) => {
    // Goals list/create/update use requireAuth; delete is session-based.
    // Use cookie session auth so the full CRUD path works against the live APIs.

    const listRes = await authedPage.request.get('/api/goals')
    expect(listRes.ok()).toBeTruthy()
    const initial = await listRes.json()
    expect(initial.success).toBeTruthy()
    expect(Array.isArray(initial.goals)).toBeTruthy()

    const createRes = await authedPage.request.post('/api/goals', {
      data: {
        type: 'PERFORMANCE',
        title: 'Run Sub-3 Marathon',
        targetDate: new Date(Date.now() + 86400000 * 90).toISOString(),
        targetValue: 180,
        metric: 'minutes',
        priority: 'MEDIUM'
      }
    })
    expect(createRes.ok()).toBeTruthy()
    const created = await createRes.json()
    expect(created.success).toBeTruthy()
    expect(created.goal?.id).toBeTruthy()
    expect(created.goal?.title).toBe('Run Sub-3 Marathon')
    const goalId = created.goal.id as string

    const listedRes = await authedPage.request.get('/api/goals')
    expect(listedRes.ok()).toBeTruthy()
    const listed = await listedRes.json()
    expect(listed.goals.some((g: { id: string }) => g.id === goalId)).toBeTruthy()

    const updateRes = await authedPage.request.patch(`/api/goals/${goalId}`, {
      data: {
        title: 'Run Sub-2:55 Marathon'
      }
    })
    expect(updateRes.ok()).toBeTruthy()
    const updated = await updateRes.json()
    expect(updated.success).toBeTruthy()
    expect(updated.goal?.title).toBe('Run Sub-2:55 Marathon')

    const deleteRes = await authedPage.request.delete(`/api/goals/${goalId}`)
    expect(deleteRes.ok()).toBeTruthy()
  })
})
