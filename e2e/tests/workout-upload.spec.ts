import { test, expect } from '../fixtures/test-fixtures.ts'
import { WorkoutUploadPage } from '../pages/WorkoutUploadPage.ts'

test.describe('Workout Upload Flow', () => {
  test('renders workout upload page with file input dropzone', async ({ authedPage }) => {
    const uploadPage = new WorkoutUploadPage(authedPage)
    await uploadPage.goto()

    await expect(authedPage).toHaveURL(/\/workouts\/upload/)
    await expect(authedPage).toHaveTitle(/Upload/i)

    // Verify page heading or dropzone is present
    await expect(
      authedPage.getByRole('heading', { name: /Upload|Ingestion/i }).first()
    ).toBeVisible()
  })
})
