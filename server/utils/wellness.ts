export function getMoodLabel(score: number): string {
  if (score >= 8) return 'Great'
  if (score >= 6) return 'Good'
  if (score >= 4) return 'OK'
  return 'Grumpy'
}

export function getStressLabel(score: number): string {
  if (score >= 8) return 'Extreme'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Average'
  return 'Low'
}

export function getSorenessLabel(score: number): string {
  if (score >= 8) return 'Extreme'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Average'
  return 'Low'
}

export function getFatigueLabel(score: number): string {
  if (score >= 8) return 'Extreme'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Average'
  return 'Low'
}

export function getMotivationLabel(score: number): string {
  if (score >= 8) return 'Extreme'
  if (score >= 6) return 'High'
  if (score >= 4) return 'Average'
  return 'Low'
}

export function getHydrationLabel(val: string | number | null | undefined): string {
  const score = typeof val === 'string' ? parseInt(val) : val
  if (!score) return ''
  const map: Record<number, string> = {
    1: 'Good',
    2: 'OK',
    3: 'Poor',
    4: 'Bad'
  }
  return map[score] || ''
}

export function getInjuryLabel(val: string | number | null | undefined): string {
  const score = typeof val === 'string' ? parseInt(val) : val
  if (!score) return ''
  const map: Record<number, string> = {
    1: 'None',
    2: 'Niggle',
    3: 'Poor',
    4: 'Injured'
  }
  return map[score] || ''
}
