export type RecoveryContextKind = 'wellness' | 'journey_event' | 'daily_checkin'
export type RecoveryContextSourceType = 'imported' | 'manual_event' | 'daily_checkin'
export type RecoveryContextOverlayStyle = 'band' | 'marker'

export interface RecoveryContextQuestionSummary {
  id: string
  text: string
  answer: string | null
}

export interface RecoveryContextItem {
  id: string
  sourceRecordId: string
  kind: RecoveryContextKind
  sourceType: RecoveryContextSourceType
  label: string
  description: string | null
  severity: number | null
  startAt: string
  endAt: string
  isRange: boolean
  editable: boolean
  deletable: boolean
  color: string
  icon: string
  overlayStyle: RecoveryContextOverlayStyle
  origin: string
  category: string | null
  rawAnswerSummary?: RecoveryContextQuestionSummary[]
  userNotes?: string | null
  metadata?: Record<string, unknown>
}
