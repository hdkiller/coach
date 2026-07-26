/**
 * Formats errors cleanly for server logging.
 * Prevents Vercel AI SDK errors and Zod validation errors from dumping
 * massive internal symbol trees, ASTs, and context arrays into container logs.
 */
export function formatErrorForLog(error: unknown): Record<string, any> | string {
  if (!(error instanceof Error)) {
    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, any>
      if (errObj.name || errObj.message) {
        return {
          name: errObj.name || 'UnknownError',
          message: String(errObj.message || 'No error message provided')
        }
      }
    }
    return String(error)
  }

  const errName = error.name || 'Error'
  const isAiSdkError =
    errName.startsWith('AI_') ||
    Boolean((error as any)[Symbol.for('vercel.ai.error')]) ||
    Boolean((error as any)['Symbol(vercel.ai.error)'])

  if (isAiSdkError) {
    const summary: Record<string, any> = {
      name: errName,
      message: error.message
    }

    if (error.cause) {
      summary.cause = error.cause instanceof Error ? error.cause.message : String(error.cause)
    }

    return summary
  }

  return {
    name: errName,
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 3).join('\n')
  }
}
