export interface HeartRateChartOptions {
  width: number
  height: number
  padding?: number
  transparent?: boolean
  framed?: boolean
  lineColor?: string
  glowColor?: string
}

const DEFAULT_PADDING = 32

export function buildHeartRateChartSvg(
  heartrate: Array<number | null | undefined>,
  options: HeartRateChartOptions
): string | null {
  const points = normalizeHeartRate(heartrate)
  if (points.length < 4) return null

  const width = options.width
  const height = options.height
  const padding = options.padding ?? DEFAULT_PADDING
  const innerWidth = Math.max(width - padding * 2, 1)
  const innerHeight = Math.max(height - padding * 2, 1)
  const minHr = Math.min(...points)
  const maxHr = Math.max(...points)
  const range = Math.max(maxHr - minHr, 1)

  const chartPoints = points.map((value, index) => {
    const x = padding + (index / (points.length - 1)) * innerWidth
    const normalized = (value - minHr) / range
    const y = height - padding - normalized * innerHeight
    return `${round(x)},${round(y)}`
  })

  const areaPath = [
    `M ${chartPoints[0].replace(',', ' ')}`,
    ...chartPoints.slice(1).map((point) => `L ${point.replace(',', ' ')}`),
    `L ${round(padding + innerWidth)} ${round(height - padding)}`,
    `L ${round(padding)} ${round(height - padding)}`,
    'Z'
  ].join(' ')

  const grid = options.transparent
    ? ''
    : [0.25, 0.5, 0.75]
        .map((ratio) => {
          const y = round(padding + innerHeight * ratio)
          return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-width="1" stroke-dasharray="8 10" />`
        })
        .join('')

  const background =
    options.transparent || options.framed === false
      ? ''
      : `<rect x="0" y="0" width="${width}" height="${height}" rx="28" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />`

  return [
    `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
    '<defs>',
    '<linearGradient id="hr-area" x1="0%" y1="0%" x2="0%" y2="100%">',
    `<stop offset="0%" stop-color="${options.glowColor || 'rgba(239,68,68,0.45)'}" />`,
    `<stop offset="100%" stop-color="${options.glowColor || 'rgba(239,68,68,0)'}" />`,
    '</linearGradient>',
    '<filter id="hr-glow" x="-20%" y="-20%" width="140%" height="140%">',
    '<feGaussianBlur stdDeviation="6" />',
    '</filter>',
    '</defs>',
    background,
    grid,
    `<path d="${areaPath}" fill="url(#hr-area)" />`,
    `<polyline points="${chartPoints.join(' ')}" fill="none" stroke="${options.glowColor || 'rgba(239,68,68,0.34)'}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" filter="url(#hr-glow)" />`,
    `<polyline points="${chartPoints.join(' ')}" fill="none" stroke="${options.lineColor || '#EF4444'}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />`,
    '</svg>'
  ].join('')
}

function normalizeHeartRate(values: Array<number | null | undefined>) {
  const valid = values
    .map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null))
    .filter((value): value is number => value != null && value > 0)

  if (valid.length <= 240) return valid

  const step = Math.ceil(valid.length / 240)
  return valid.filter((_, index) => index === 0 || index === valid.length - 1 || index % step === 0)
}

function round(value: number) {
  return value.toFixed(2)
}
