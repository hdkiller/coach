import type { Page, Locator } from '@playwright/test'

export class WorkoutUploadPage {
  readonly page: Page
  readonly titleHeading: Locator
  readonly dropzone: Locator
  readonly fileInput: Locator
  readonly uploadButton: Locator

  constructor(page: Page) {
    this.page = page
    this.titleHeading = page.getByRole('heading', { level: 1 })
    this.dropzone = page
      .locator('input[type="file"], [data-testid="file-upload"], form, div')
      .first()
    this.fileInput = page.locator('input[type="file"]').first()
    this.uploadButton = page.getByRole('button', { name: /upload|ingestion|submit/i }).first()
  }

  async goto() {
    await this.page.goto('/workouts/upload', { waitUntil: 'domcontentloaded' })
  }
}
