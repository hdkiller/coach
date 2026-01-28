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
