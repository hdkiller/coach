export interface QuotaStatus {
  operation: string
  allowed: boolean
  used: number
  limit: number
  remaining: number
  window: string
  resetsAt: Date | string | null
  enforcement: 'STRICT' | 'MEASURE'
}
