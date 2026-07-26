import { expect, test } from '@playwright/test'
import { mintE2eAccessToken } from '../helpers/token.ts'
import { E2E_MOBILE_CLIENT_ID } from '../seed.ts'

test.describe('E2E Goals Endpoints', () => {
  test('creates, lists, updates, and deletes a user goal', async ({ request }) => {
    const token = await mintE2eAccessToken(process.env.E2E_TEST_USER_EMAIL, E2E_MOBILE_CLIENT_ID)
    const headers = { Authorization: `Bearer ${token.access_token}` }

    // 1. List goals
    const listRes = await request.get('/api/goals', { headers })
    expect(listRes.ok()).toBeTruthy()
    const listData = await listRes.json()
    const goals = Array.isArray(listData) ? listData : listData.goals
    expect(Array.isArray(goals)).toBeTruthy()

    // 2. Create goal
    const createRes = await request.post('/api/goals', {
      headers,
      data: {
        type: 'PERFORMANCE',
        title: 'Run Sub-3 Marathon',
        targetDate: new Date(Date.now() + 86400000 * 90).toISOString(),
        targetValue: 180
      }
    })
    expect(createRes.ok()).toBeTruthy()
    const createData = await createRes.json()
    const newGoal = createData.goal || createData
    expect(newGoal.id).toBeTruthy()
    expect(newGoal.title).toBe('Run Sub-3 Marathon')

    // 3. Get single goal
    const getRes = await request.get(`/api/goals/${newGoal.id}`, { headers })
    expect(getRes.ok()).toBeTruthy()
    const fetchedGoal = await getRes.json()
    expect(fetchedGoal.id).toBe(newGoal.id)

    // 4. Update goal
    const updateRes = await request.patch(`/api/goals/${newGoal.id}`, {
      headers,
      data: {
        title: 'Run Sub-2:55 Marathon'
      }
    })
    expect(updateRes.ok()).toBeTruthy()
    const updatedGoal = await updateRes.json()
    expect(updatedGoal.title).toBe('Run Sub-2:55 Marathon')

    // 5. Delete goal
    const deleteRes = await request.delete(`/api/goals/${newGoal.id}`, { headers })
    expect(deleteRes.ok()).toBeTruthy()
  })
})
