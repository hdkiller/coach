import { describe, it, expect } from 'vitest'
import { resolveEmailSubject } from '../../../../server/utils/email-i18n'

describe('Email i18n Subject Resolution', () => {
  it('resolves English subject by default', () => {
    const subject = resolveEmailSubject('Welcome', 'en')
    expect(subject).toBe('Welcome to Coach Watts!')
  })

  it('resolves Hungarian subject when uiLanguage is hu', () => {
    const subject = resolveEmailSubject('Welcome', 'hu')
    expect(subject).toBe('Üdvözlünk a Coach Watts platformon!')
  })

  it('resolves German subject for DailyRecommendation', () => {
    const subject = resolveEmailSubject('DailyRecommendation', 'de')
    expect(subject).toBe('Heutiges Training')
  })

  it('resolves Spanish subject for ThresholdUpdateDetected', () => {
    const subject = resolveEmailSubject('ThresholdUpdateDetected', 'es')
    expect(subject).toBe('¡Nivel arriba! Nuevo umbral detectado')
  })

  it('falls back to English when language is unsupported', () => {
    const subject = resolveEmailSubject('Welcome', 'sw')
    expect(subject).toBe('Welcome to Coach Watts!')
  })

  it('uses fallback subject when templateKey is unknown', () => {
    const subject = resolveEmailSubject('CustomUnknownKey', 'hu', 'Custom Subject')
    expect(subject).toBe('Custom Subject')
  })
})
