import { createError } from 'h3'
import { checkQuota } from './engine'

export async function assertQuotaAllowed(
  userId: string,
  operation: string,
  fallbackMessage?: string
) {
  try {
    await checkQuota(userId, operation)
  } catch (error: any) {
    if (error?.statusCode === 429) {
      throw createError({
        statusCode: 429,
        statusMessage: error.statusMessage || error.message || fallbackMessage,
        message: error.message || fallbackMessage || 'Quota exceeded.',
        data: error.data
      })
    }

    throw error
  }
}
