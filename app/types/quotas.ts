export interface QuotaStatus {
  operation: string
  allowed: boolean
  used: number
  limit: number
  remaining: number
  window: string
  resetsAt: Date | string | null
  enforcement: 'STRICT' | 'MEASURE'
  /** Client-facing feature code, matching the 429 payload. */
  feature?: string | null
  nextTier?: 'SUPPORTER' | 'PRO' | null
  nextTierLimit?: number | null
}
