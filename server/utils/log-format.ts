/** Short, single-line error text safe for production logs (avoids Prisma/BullMQ payload dumps). */
export function formatErrorMessage(error: unknown, maxLength = 400): string {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error)
  const line = raw.split('\n')[0]?.trim() || 'Unknown error'
  return line.length > maxLength ? `${line.slice(0, maxLength)}…` : line
}
