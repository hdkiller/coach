import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import { formatPace } from '../pacing'
import { buildHeartRateChartSvg } from './hr-chart'
import { buildStaticMapSvg } from './static-map'

interface WorkoutData {
  title: string
  type: string | null
  date: Date
  durationSec: number
  distanceMeters: number | null
  averageHr: number | null
  averageWatts: number | null
  averageSpeed: number | null
  streams?: {
    latlng?: Array<[number, number] | { lat: number; lng: number } | null> | null
    heartrate?: Array<number | null | undefined> | null
  } | null
}

export type WorkoutImageVariant = 'default' | 'flat' | 'transparent'
export type WorkoutImageStyle = 'map' | 'poster' | 'crest' | 'pulse'
export type WorkoutImageRatio = 'story' | 'square' | 'post'

interface GenerateWorkoutImageOptions {
  templateName?: string
  variant?: WorkoutImageVariant
  style?: WorkoutImageStyle
  ratio?: WorkoutImageRatio
}

interface WorkoutImageTextData {
  titleLine1: string
  titleLine2: string
  subtitle: string
  heroLabel: string
  heroValue: string
  heroUnit: string
  stat1Label: string
  stat1Value: string | number
  stat1Unit: string
  stat2Label: string
  stat2Value: string | number
  stat2Unit: string
  stat3Label: string
  stat3Value: string | number
  stat3Unit: string
  titleFontSizeMap: string
  titleFontSizeModern: string
  titleFontSizePoster: string
  titleFontSizeCrest: string
  titleLineHeightMap: string
  titleLineHeightModern: string
  titleLineHeightPoster: string
  titleLineHeightCrest: string
  heroFontSizeMap: string
  heroFontSizeModern: string
  heroFontSizePoster: string
  heroFontSizeCrest: string
  heroUnitFontSizeMap: string
  heroUnitFontSizeModern: string
  heroUnitFontSizePoster: string
  heroUnitFontSizeCrest: string
}

interface RatioSpec {
  ratio: WorkoutImageRatio
  width: number
  height: number
  label: string
}

interface ThemeSpec {
  accent: string
  accentSoft: string
  accentStrong: string
  accentGlow: string
  textSoft: string
  watermark: string
}

interface VisualSizeSpec {
  width: number
  height: number
  padding: number
}

const RATIO_SPECS: Record<WorkoutImageRatio, RatioSpec> = {
  story: { ratio: 'story', width: 1080, height: 1920, label: 'Story' },
  square: { ratio: 'square', width: 1080, height: 1080, label: 'Square' },
  post: { ratio: 'post', width: 1080, height: 1350, label: 'Post' }
}

const THEMES: Record<WorkoutImageStyle, ThemeSpec> = {
  map: {
    accent: '#00C16A',
    accentSoft: '#7CFFCB',
    accentStrong: '#00DC82',
    accentGlow: 'rgba(0,193,106,0.22)',
    textSoft: '#8F99A5',
    watermark: '#7CFFCB'
  },
  poster: {
    accent: '#00C16A',
    accentSoft: '#B8FFE3',
    accentStrong: '#00DC82',
    accentGlow: 'rgba(0,220,130,0.24)',
    textSoft: '#9AA1AE',
    watermark: '#7CFFCB'
  },
  crest: {
    accent: '#00C16A',
    accentSoft: '#D1FADF',
    accentStrong: '#00DC82',
    accentGlow: 'rgba(0,220,130,0.18)',
    textSoft: '#9AA1AE',
    watermark: '#B8FFE3'
  },
  pulse: {
    accent: '#EF4444',
    accentSoft: '#FCA5A5',
    accentStrong: '#FB7185',
    accentGlow: 'rgba(239,68,68,0.24)',
    textSoft: '#A1A1AA',
    watermark: '#FCA5A5'
  }
}

const FONT_FILES = [
  path.resolve(process.cwd(), 'server/assets/fonts/Inter.ttf'),
  path.resolve(process.cwd(), 'server/assets/fonts/Inter-Italic.ttf'),
  path.resolve(process.cwd(), 'server/assets/fonts/Oswald.ttf')
]

const FONT_FAMILY_DISPLAY = 'Oswald'
const FONT_FAMILY_BODY = 'Inter'

export function selectWorkoutImageTemplate(
  workout: WorkoutData
): 'activity-map' | 'activity-modern' {
  return hasWorkoutMap(workout) ? 'activity-map' : 'activity-modern'
}

export function normalizeWorkoutImageVariant(value?: string | null): WorkoutImageVariant {
  if (value === 'flat') return 'flat'
  return value === 'transparent' ? 'transparent' : 'default'
}

export function normalizeWorkoutImageStyle(value?: string | null): WorkoutImageStyle {
  if (value === 'poster') return 'poster'
  if (value === 'crest') return 'crest'
  if (value === 'pulse') return 'pulse'
  return 'map'
}

export function normalizeWorkoutImageRatio(value?: string | null): WorkoutImageRatio {
  if (value === 'square') return 'square'
  if (value === 'post') return 'post'
  return 'story'
}

export const imageGenerator = {
  async generateWorkoutImage(
    workout: WorkoutData,
    options: GenerateWorkoutImageOptions = {}
  ): Promise<Buffer> {
    const style = normalizeWorkoutImageStyle(options.style)
    const variant = normalizeWorkoutImageVariant(options.variant)
    const ratio = normalizeWorkoutImageRatio(options.ratio)
    const spec = RATIO_SPECS[ratio]
    const renderStyle = style === 'map' && !hasWorkoutMap(workout) ? 'map-fallback' : style
    const data = this.prepareImageData(workout, ratio)
    const theme = THEMES[style]
    const mapSvg = getWorkoutMapMarkup(workout, variant, style, ratio)
    const hrChartSvg = getHeartRateChartMarkup(workout, variant, style, ratio)
    const svgContent = renderWorkoutSvg({
      ratio: spec,
      variant,
      style,
      renderStyle,
      theme,
      data,
      mapSvg,
      hrChartSvg
    })

    const resvg = new Resvg(svgContent, {
      fitTo: {
        mode: 'width',
        value: spec.width
      },
      font: {
        fontFiles: FONT_FILES,
        loadSystemFonts: false,
        defaultFontFamily: FONT_FAMILY_BODY,
        sansSerifFamily: FONT_FAMILY_BODY
      }
    })

    return resvg.render().asPng()
  },

  prepareImageData(workout: WorkoutData, ratio: WorkoutImageRatio = 'story'): WorkoutImageTextData {
    const ratioScale = ratio === 'square' ? 0.74 : ratio === 'post' ? 0.86 : 1
    const distanceKm = workout.distanceMeters ? (workout.distanceMeters / 1000).toFixed(1) : '0.0'
    const paceStr = getPaceString(workout)
    const fittedTitle = fitTitle(workout.title || 'Untitled Activity')
    const heroScale = getHeroScale(distanceKm)

    return {
      titleLine1: fittedTitle.line1,
      titleLine2: fittedTitle.line2,
      subtitle: workout.type || 'Activity',
      heroLabel: 'Total Distance',
      heroValue: distanceKm,
      heroUnit: 'KM',
      stat1Label: 'Avg Pace',
      stat1Value: paceStr,
      stat1Unit: '/KM',
      stat2Label: 'Heart Rate',
      stat2Value: workout.averageHr ? Math.round(workout.averageHr) : '--',
      stat2Unit: 'BPM',
      stat3Label: 'Avg Power',
      stat3Value: workout.averageWatts ? Math.round(workout.averageWatts) : '--',
      stat3Unit: 'W',
      titleFontSizeMap: scaleFontByRatio(
        getTitleFontSize(72, fittedTitle.longestLine, fittedTitle.hasSecondLine),
        ratioScale
      ),
      titleFontSizeModern: scaleFontByRatio(
        getTitleFontSize(82, fittedTitle.longestLine, fittedTitle.hasSecondLine),
        ratioScale
      ),
      titleFontSizePoster: scaleFontByRatio(
        getTitleFontSize(96, fittedTitle.longestLine, fittedTitle.hasSecondLine),
        ratioScale
      ),
      titleFontSizeCrest: scaleFontByRatio(
        getTitleFontSize(88, fittedTitle.longestLine, fittedTitle.hasSecondLine),
        ratioScale
      ),
      titleLineHeightMap: scaleFontByRatio(72, ratioScale),
      titleLineHeightModern: scaleFontByRatio(82, ratioScale),
      titleLineHeightPoster: scaleFontByRatio(88, ratioScale),
      titleLineHeightCrest: scaleFontByRatio(84, ratioScale),
      heroFontSizeMap: scaleFont(132, heroScale, ratioScale),
      heroFontSizeModern: scaleFont(180, heroScale, ratioScale),
      heroFontSizePoster: scaleFont(164, heroScale, ratioScale),
      heroFontSizeCrest: scaleFont(138, heroScale, ratioScale),
      heroUnitFontSizeMap: scaleFont(42, Math.min(heroScale + 0.08, 1), ratioScale),
      heroUnitFontSizeModern: scaleFont(56, Math.min(heroScale + 0.08, 1), ratioScale),
      heroUnitFontSizePoster: scaleFont(38, Math.min(heroScale + 0.08, 1), ratioScale),
      heroUnitFontSizeCrest: scaleFont(34, Math.min(heroScale + 0.08, 1), ratioScale)
    }
  }
}

function renderWorkoutSvg(input: {
  ratio: RatioSpec
  variant: WorkoutImageVariant
  style: WorkoutImageStyle
  renderStyle: WorkoutImageStyle | 'map-fallback'
  theme: ThemeSpec
  data: WorkoutImageTextData
  mapSvg: string | null
  hrChartSvg: string | null
}) {
  const { ratio, variant, style, renderStyle, theme, data, mapSvg, hrChartSvg } = input
  const defs = renderBaseDefs(theme, variant)
  const background = renderBackground(ratio, theme, variant)
  const watermark = renderWatermark(ratio, theme)

  const body =
    renderStyle === 'poster'
      ? renderPosterCard(ratio, theme, variant, data, mapSvg, watermark)
      : renderStyle === 'crest'
        ? renderCrestCard(ratio, theme, variant, data, mapSvg, watermark)
        : renderStyle === 'pulse'
          ? renderPulseCard(ratio, theme, variant, data, mapSvg, hrChartSvg, watermark)
          : renderStyle === 'map-fallback'
            ? renderModernCard(ratio, theme, variant, data, watermark)
            : renderMapCard(ratio, theme, variant, data, mapSvg, watermark)

  return [
    `<svg viewBox="0 0 ${ratio.width} ${ratio.height}" width="${ratio.width}" height="${ratio.height}" xmlns="http://www.w3.org/2000/svg">`,
    defs,
    background,
    body,
    '</svg>'
  ].join('')
}

function renderBaseDefs(theme: ThemeSpec, variant: WorkoutImageVariant) {
  return [
    '<defs>',
    '<radialGradient id="meshGradA" cx="20%" cy="22%" r="82%">',
    '<stop offset="0%" stop-color="#141A1E" />',
    '<stop offset="65%" stop-color="#0A0E12" />',
    '<stop offset="100%" stop-color="#05070A" />',
    '</radialGradient>',
    '<radialGradient id="meshGradB" cx="78%" cy="18%" r="58%">',
    `<stop offset="0%" stop-color="${theme.accentGlow}" />`,
    '<stop offset="100%" stop-color="rgba(0,0,0,0)" />',
    '</radialGradient>',
    '<radialGradient id="meshGradC" cx="42%" cy="82%" r="62%">',
    '<stop offset="0%" stop-color="rgba(0, 114, 255, 0.16)" />',
    '<stop offset="100%" stop-color="rgba(0,0,0,0)" />',
    '</radialGradient>',
    '<linearGradient id="panelStroke" x1="0%" y1="0%" x2="100%" y2="100%">',
    '<stop offset="0%" stop-color="rgba(255,255,255,0.16)" />',
    `<stop offset="100%" stop-color="${theme.accentGlow}" />`,
    '</linearGradient>',
    '<linearGradient id="fadeMask" x1="0%" y1="0%" x2="0%" y2="100%">',
    '<stop offset="0%" stop-color="rgba(9,11,14,0)" />',
    '<stop offset="100%" stop-color="rgba(9,11,14,1)" />',
    '</linearGradient>',
    '<filter id="grain">',
    '<feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />',
    '</filter>',
    '<filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">',
    '<feGaussianBlur stdDeviation="24" />',
    '</filter>',
    '<filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">',
    '<feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="rgba(0,0,0,0.35)" />',
    '</filter>',
    ...(variant === 'transparent'
      ? []
      : [
          '<filter id="innerGlow" x="-20%" y="-20%" width="140%" height="140%">',
          '<feDropShadow dx="0" dy="0" stdDeviation="30" flood-color="rgba(255,255,255,0.05)" />',
          '</filter>'
        ]),
    '</defs>'
  ].join('')
}

function renderBackground(ratio: RatioSpec, theme: ThemeSpec, variant: WorkoutImageVariant) {
  if (variant === 'transparent') return ''

  return [
    `<rect width="${ratio.width}" height="${ratio.height}" fill="url(#meshGradA)" />`,
    `<rect width="${ratio.width}" height="${ratio.height}" fill="url(#meshGradB)" />`,
    `<rect width="${ratio.width}" height="${ratio.height}" fill="url(#meshGradC)" opacity="${variant === 'flat' ? '0.35' : '1'}" />`,
    variant === 'flat'
      ? ''
      : `<circle cx="${round(ratio.width * 0.62)}" cy="${round(ratio.height * 0.22)}" r="${round(Math.min(ratio.width, ratio.height) * 0.32)}" fill="${theme.accentGlow}" filter="url(#softBlur)" />`,
    `<rect width="${ratio.width}" height="${ratio.height}" filter="url(#grain)" opacity="0.02" style="mix-blend-mode:overlay;" />`
  ].join('')
}

function renderMapCard(
  ratio: RatioSpec,
  theme: ThemeSpec,
  variant: WorkoutImageVariant,
  data: WorkoutImageTextData,
  mapSvg: string | null,
  watermark: string
) {
  const mapSize = getMapSize(ratio.ratio, 'map')
  const contentX = ratio.width * 0.08
  const contentWidth = ratio.width * 0.84
  const titleY = ratio.ratio === 'square' ? 170 : ratio.ratio === 'post' ? 210 : 230
  const mapY = ratio.ratio === 'square' ? 210 : ratio.ratio === 'post' ? 250 : 300
  const mapHeight = ratio.ratio === 'square' ? 520 : ratio.ratio === 'post' ? 620 : 820
  const heroPlateY =
    mapY + mapHeight - (ratio.ratio === 'square' ? 170 : ratio.ratio === 'post' ? 190 : 220)
  const heroY = heroPlateY + (ratio.ratio === 'square' ? 120 : ratio.ratio === 'post' ? 136 : 150)
  const statsY = ratio.height - (ratio.ratio === 'square' ? 118 : 220)
  const statGap = contentWidth / 3

  return [
    renderOuterShell(ratio, variant),
    text(data.subtitle, ratio.width / 2, titleY - 54, {
      anchor: 'middle',
      fill: theme.accentStrong,
      size: ratio.ratio === 'square' ? 20 : 28,
      weight: 700,
      letterSpacing: 6,
      uppercase: true
    }),
    renderTitle(data, ratio.width / 2, titleY, 'middle', {
      fontSize: Number(data.titleFontSizeMap),
      lineHeight: Number(data.titleLineHeightMap)
    }),
    renderMapAmbientGlow(ratio, theme, mapY, mapHeight, variant, styleMapGlowOpacity(variant)),
    mapSvg
      ? `<g transform="translate(${round((ratio.width - mapSize.width) / 2)}, ${round(mapY)})">${mapSvg}</g>`
      : '',
    renderMapHeroFade(ratio, contentX, contentWidth, heroPlateY, variant),
    text(data.heroLabel, ratio.width / 2, heroY - 92, {
      anchor: 'middle',
      fill: theme.textSoft,
      size: ratio.ratio === 'square' ? 20 : 24,
      weight: 700,
      letterSpacing: 2,
      uppercase: true
    }),
    renderHero(data.heroValue, data.heroUnit, ratio.width / 2, heroY, 'middle', {
      valueSize: Number(data.heroFontSizeMap),
      unitSize: Number(data.heroUnitFontSizeMap)
    }),
    renderMetricRow(
      [
        [data.stat1Label, String(data.stat1Value), data.stat1Unit],
        [data.stat2Label, String(data.stat2Value), data.stat2Unit],
        [data.stat3Label, String(data.stat3Value), data.stat3Unit]
      ],
      contentX,
      statsY,
      statGap,
      theme,
      ratio
    ),
    watermark
  ].join('')
}

function renderModernCard(
  ratio: RatioSpec,
  theme: ThemeSpec,
  variant: WorkoutImageVariant,
  data: WorkoutImageTextData,
  watermark: string
) {
  const contentX = ratio.width * 0.1
  const chartTop = ratio.ratio === 'square' ? 150 : ratio.ratio === 'post' ? 170 : 190
  const titleY = ratio.ratio === 'square' ? 490 : ratio.ratio === 'post' ? 580 : 830
  const heroY = ratio.ratio === 'square' ? 690 : ratio.ratio === 'post' ? 860 : 1240
  const statsY = ratio.height - (ratio.ratio === 'square' ? 112 : 220)

  return [
    renderOuterShell(ratio, variant),
    `<g transform="translate(0, ${round(chartTop)})">`,
    `<circle cx="${round(ratio.width * 0.52)}" cy="${round(ratio.ratio === 'square' ? 150 : 220)}" r="${round(ratio.width * 0.28)}" fill="${theme.accentGlow}" filter="url(#softBlur)" />`,
    `<path d="M ${round(ratio.width * 0.18)} ${round(ratio.ratio === 'square' ? 230 : ratio.ratio === 'post' ? 320 : 520)} L ${round(ratio.width * 0.31)} ${round(ratio.ratio === 'square' ? 120 : ratio.ratio === 'post' ? 210 : 380)} L ${round(ratio.width * 0.46)} ${round(ratio.ratio === 'square' ? 180 : ratio.ratio === 'post' ? 270 : 440)} L ${round(ratio.width * 0.57)} ${round(ratio.ratio === 'square' ? 80 : ratio.ratio === 'post' ? 120 : 220)} L ${round(ratio.width * 0.7)} ${round(ratio.ratio === 'square' ? 145 : ratio.ratio === 'post' ? 220 : 320)} L ${round(ratio.width * 0.83)} ${round(ratio.ratio === 'square' ? 42 : ratio.ratio === 'post' ? 78 : 140)}" fill="none" stroke="${theme.accent}" stroke-width="${ratio.ratio === 'square' ? 10 : 12}" stroke-linecap="round" stroke-linejoin="round" filter="${variant === 'transparent' ? '' : 'url(#textShadow)'}" />`,
    '</g>',
    text(data.subtitle, ratio.width / 2, titleY - 80, {
      anchor: 'middle',
      fill: theme.accentSoft,
      size: ratio.ratio === 'square' ? 22 : 30,
      weight: 700,
      letterSpacing: 6,
      uppercase: true
    }),
    renderTitle(data, ratio.width / 2, titleY, 'middle', {
      fontSize: Number(data.titleFontSizeModern),
      lineHeight: Number(data.titleLineHeightModern)
    }),
    text(data.heroLabel, ratio.width / 2, heroY - 92, {
      anchor: 'middle',
      fill: theme.textSoft,
      size: ratio.ratio === 'square' ? 19 : 24,
      weight: 700,
      letterSpacing: 2,
      uppercase: true
    }),
    renderHero(data.heroValue, data.heroUnit, ratio.width / 2, heroY, 'middle', {
      valueSize: Number(data.heroFontSizeModern),
      unitSize: Number(data.heroUnitFontSizeModern)
    }),
    renderMetricRow(
      [
        [data.stat1Label, String(data.stat1Value), data.stat1Unit],
        [data.stat2Label, String(data.stat2Value), data.stat2Unit],
        [data.stat3Label, String(data.stat3Value), data.stat3Unit]
      ],
      contentX,
      statsY,
      ratio.width * 0.27,
      theme,
      ratio
    ),
    watermark
  ].join('')
}

function renderPosterCard(
  ratio: RatioSpec,
  theme: ThemeSpec,
  variant: WorkoutImageVariant,
  data: WorkoutImageTextData,
  mapSvg: string | null,
  watermark: string
) {
  const contentX = ratio.width * 0.08
  const titleY = ratio.ratio === 'square' ? 200 : ratio.ratio === 'post' ? 222 : 266
  const mapY = ratio.ratio === 'square' ? 28 : ratio.ratio === 'post' ? 60 : 120
  const bottomFadeY = ratio.ratio === 'square' ? 330 : ratio.ratio === 'post' ? 500 : 760
  const centerY =
    ratio.height * (ratio.ratio === 'square' ? 0.56 : ratio.ratio === 'post' ? 0.55 : 0.58)
  const metricBaseY = ratio.height - (ratio.ratio === 'square' ? 142 : 168)
  const statGap = ratio.width * 0.29

  return [
    renderOuterShell(ratio, variant),
    mapSvg
      ? `<g transform="translate(${round((ratio.width - 840) / 2)}, ${round(mapY)})">${mapSvg}</g>`
      : '',
    variant === 'transparent'
      ? ''
      : `<rect x="0" y="${round(bottomFadeY)}" width="${ratio.width}" height="${ratio.height - bottomFadeY}" fill="url(#fadeMask)" opacity="0.92" />`,
    text(data.subtitle, contentX, titleY - 42, {
      fill: theme.accentSoft,
      size: ratio.ratio === 'square' ? 18 : 24,
      weight: 700,
      letterSpacing: 7,
      uppercase: true
    }),
    renderTitle(data, contentX, titleY, 'start', {
      fontSize: Number(data.titleFontSizePoster),
      lineHeight: Number(data.titleLineHeightPoster)
    }),
    text(data.heroLabel, ratio.width / 2, centerY - 96, {
      anchor: 'middle',
      fill: theme.textSoft,
      size: ratio.ratio === 'square' ? 18 : 22,
      weight: 700,
      letterSpacing: 4,
      uppercase: true
    }),
    renderHero(data.heroValue, data.heroUnit, ratio.width / 2, centerY, 'middle', {
      valueSize: Number(data.heroFontSizePoster),
      unitSize: Number(data.heroUnitFontSizePoster),
      tracking: 4
    }),
    renderMetricColumn(
      [data.stat1Label, String(data.stat1Value), data.stat1Unit],
      contentX,
      metricBaseY,
      theme,
      ratio
    ),
    renderMetricColumn(
      [data.stat2Label, String(data.stat2Value), data.stat2Unit],
      contentX + statGap,
      metricBaseY,
      theme,
      ratio
    ),
    renderMetricColumn(
      [data.stat3Label, String(data.stat3Value), data.stat3Unit],
      contentX + statGap * 2,
      metricBaseY,
      theme,
      ratio
    ),
    watermark
  ].join('')
}

function renderCrestCard(
  ratio: RatioSpec,
  theme: ThemeSpec,
  variant: WorkoutImageVariant,
  data: WorkoutImageTextData,
  mapSvg: string | null,
  watermark: string
) {
  const mapSize = getMapSize(ratio.ratio, 'crest')
  const centerX = ratio.width / 2
  const titleY = ratio.ratio === 'square' ? 192 : ratio.ratio === 'post' ? 230 : 276
  const ringCenterY = ratio.ratio === 'square' ? 410 : ratio.ratio === 'post' ? 520 : 760
  const ringRadius = ratio.ratio === 'square' ? 240 : ratio.ratio === 'post' ? 284 : 326
  const metricsY = ratio.height - (ratio.ratio === 'square' ? 112 : 162)
  const labelY = ringCenterY + ringRadius - (ratio.ratio === 'square' ? 28 : 6)
  const heroY = labelY + (ratio.ratio === 'square' ? 82 : 102)

  return [
    renderOuterShell(ratio, variant),
    renderMapAmbientGlow(
      ratio,
      theme,
      ringCenterY - ringRadius,
      ringRadius * 2,
      variant,
      variant === 'transparent' ? 0 : 0.7
    ),
    `<circle cx="${centerX}" cy="${round(ringCenterY)}" r="${ringRadius}" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="2" stroke-dasharray="14 18" />`,
    `<circle cx="${centerX}" cy="${round(ringCenterY)}" r="${ringRadius - 34}" fill="none" stroke="${theme.accentGlow}" stroke-width="10" />`,
    mapSvg
      ? `<g transform="translate(${round(centerX - mapSize.width / 2)}, ${round(ringCenterY - mapSize.height / 2)})">${mapSvg}</g>`
      : '',
    text(data.subtitle, centerX, titleY - 48, {
      anchor: 'middle',
      fill: theme.accentSoft,
      size: ratio.ratio === 'square' ? 18 : 24,
      weight: 700,
      letterSpacing: 8,
      uppercase: true
    }),
    renderTitle(data, centerX, titleY, 'middle', {
      fontSize: Number(data.titleFontSizeCrest),
      lineHeight: Number(data.titleLineHeightCrest)
    }),
    text(data.heroLabel, centerX, labelY, {
      anchor: 'middle',
      fill: theme.textSoft,
      size: ratio.ratio === 'square' ? 18 : 22,
      weight: 700,
      letterSpacing: 2,
      uppercase: true
    }),
    renderMapHeroFade(
      ratio,
      ratio.width * 0.18,
      ratio.width * 0.64,
      heroY - (ratio.ratio === 'square' ? 104 : 122),
      variant
    ),
    renderHero(data.heroValue, data.heroUnit, centerX, heroY, 'middle', {
      valueSize: Number(data.heroFontSizeCrest),
      unitSize: Number(data.heroUnitFontSizeCrest)
    }),
    renderMetricRow(
      [
        [data.stat1Label, String(data.stat1Value), data.stat1Unit],
        [data.stat2Label, String(data.stat2Value), data.stat2Unit],
        [data.stat3Label, String(data.stat3Value), data.stat3Unit]
      ],
      ratio.width * 0.12,
      metricsY,
      ratio.width * 0.26,
      theme,
      ratio
    ),
    watermark
  ].join('')
}

function renderPulseCard(
  ratio: RatioSpec,
  theme: ThemeSpec,
  variant: WorkoutImageVariant,
  data: WorkoutImageTextData,
  mapSvg: string | null,
  hrChartSvg: string | null,
  watermark: string
) {
  const mapSize = getMapSize(ratio.ratio, 'pulse')
  const chartSize = getHeartRateChartSize(ratio.ratio, 'pulse')
  const contentX = ratio.width * 0.08
  const mapY = ratio.ratio === 'square' ? 70 : ratio.ratio === 'post' ? 94 : 124
  const mapHeight = ratio.ratio === 'square' ? 520 : ratio.ratio === 'post' ? 620 : 820
  const chartY =
    mapY + mapHeight - (ratio.ratio === 'square' ? 120 : ratio.ratio === 'post' ? 96 : 110)
  const titleY = ratio.ratio === 'square' ? 164 : ratio.ratio === 'post' ? 220 : 268
  const heroPlateY = chartY + (ratio.ratio === 'square' ? 210 : ratio.ratio === 'post' ? 234 : 264)
  const heroY = heroPlateY + (ratio.ratio === 'square' ? 98 : ratio.ratio === 'post' ? 110 : 126)
  const metricsY = ratio.height - (ratio.ratio === 'square' ? 108 : 150)
  const statGap = ratio.width * 0.29

  return [
    renderOuterShell(ratio, variant),
    renderMapAmbientGlow(
      ratio,
      theme,
      mapY,
      mapHeight,
      variant,
      variant === 'transparent' ? 0 : 0.65
    ),
    mapSvg
      ? `<g transform="translate(${round((ratio.width - mapSize.width) / 2)}, ${round(mapY)})" opacity="${ratio.ratio === 'square' ? '0.36' : '0.44'}">${mapSvg}</g>`
      : '',
    hrChartSvg
      ? `<g transform="translate(${round((ratio.width - chartSize.width) / 2)}, ${round(chartY)})">${hrChartSvg}</g>`
      : '',
    text(data.subtitle, contentX, titleY - 40, {
      fill: theme.accentSoft,
      size: ratio.ratio === 'square' ? 18 : 24,
      weight: 700,
      letterSpacing: 8,
      uppercase: true
    }),
    renderTitle(data, contentX, titleY, 'start', {
      fontSize: Number(data.titleFontSizePoster),
      lineHeight: Number(data.titleLineHeightPoster)
    }),
    renderMapHeroFade(ratio, contentX, ratio.width * 0.5, heroPlateY - 94, variant),
    text(data.heroLabel, contentX, heroY - 82, {
      fill: theme.textSoft,
      size: ratio.ratio === 'square' ? 18 : 22,
      weight: 700,
      letterSpacing: 2,
      uppercase: true
    }),
    renderHero(data.heroValue, data.heroUnit, contentX, heroY, 'start', {
      valueSize: Number(data.heroFontSizePoster),
      unitSize: Number(data.heroUnitFontSizePoster)
    }),
    renderMetricColumn(
      [data.stat1Label, String(data.stat1Value), data.stat1Unit],
      contentX,
      metricsY,
      theme,
      ratio
    ),
    renderMetricColumn(
      [data.stat2Label, String(data.stat2Value), data.stat2Unit],
      contentX + statGap,
      metricsY,
      theme,
      ratio
    ),
    renderMetricColumn(
      [data.stat3Label, String(data.stat3Value), data.stat3Unit],
      contentX + statGap * 2,
      metricsY,
      theme,
      ratio
    ),
    watermark
  ].join('')
}

function renderOuterShell(ratio: RatioSpec, variant: WorkoutImageVariant) {
  if (variant === 'transparent') return ''

  const inset = ratio.ratio === 'square' ? 32 : 46
  const radius = ratio.ratio === 'square' ? 34 : 42
  return [
    `<rect x="${inset}" y="${inset}" width="${ratio.width - inset * 2}" height="${ratio.height - inset * 2}" rx="${radius}" fill="rgba(255,255,255,0.03)" stroke="url(#panelStroke)" stroke-width="2" filter="url(#innerGlow)" />`,
    `<rect x="${inset + 28}" y="${inset + 28}" width="${ratio.width - (inset + 28) * 2}" height="6" rx="3" fill="rgba(255,255,255,0.06)" />`
  ].join('')
}

function renderMapAmbientGlow(
  ratio: RatioSpec,
  theme: ThemeSpec,
  mapY: number,
  mapHeight: number,
  variant: WorkoutImageVariant,
  opacity: number
) {
  if (variant === 'transparent' || opacity <= 0) return ''

  return `<ellipse cx="${round(ratio.width / 2)}" cy="${round(mapY + mapHeight * 0.48)}" rx="${round(ratio.width * 0.29)}" ry="${round(mapHeight * 0.28)}" fill="${theme.accentGlow}" opacity="${opacity}" filter="url(#softBlur)" />`
}

function renderMapHeroFade(
  ratio: RatioSpec,
  x: number,
  width: number,
  y: number,
  variant: WorkoutImageVariant
) {
  if (variant === 'transparent') return ''

  const height = ratio.ratio === 'square' ? 164 : ratio.ratio === 'post' ? 186 : 214
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${height}" fill="url(#fadeMask)" opacity="0.92" />`
}

function styleMapGlowOpacity(variant: WorkoutImageVariant) {
  return variant === 'flat' ? 0.42 : 0.62
}

function renderTitle(
  data: WorkoutImageTextData,
  x: number,
  y: number,
  anchor: 'start' | 'middle',
  options: { fontSize: number; lineHeight: number }
) {
  const textAnchor = anchor === 'middle' ? 'middle' : 'start'
  return [
    `<text x="${round(x)}" y="${round(y)}" text-anchor="${textAnchor}" fill="#FFFFFF" font-family="'${FONT_FAMILY_DISPLAY}'" font-weight="700" font-size="${options.fontSize}" letter-spacing="-1.5" text-transform="uppercase">`,
    `<tspan x="${round(x)}">${escapeSvgText(data.titleLine1)}</tspan>`,
    data.titleLine2
      ? `<tspan x="${round(x)}" dy="${options.lineHeight}">${escapeSvgText(data.titleLine2)}</tspan>`
      : '',
    '</text>'
  ].join('')
}

function renderHero(
  value: string,
  unit: string,
  x: number,
  y: number,
  anchor: 'start' | 'middle',
  options: { valueSize: number; unitSize: number; tracking?: number }
) {
  return [
    `<text x="${round(x)}" y="${round(y)}" text-anchor="${anchor === 'middle' ? 'middle' : 'start'}" fill="#FFFFFF" filter="url(#textShadow)">`,
    `<tspan font-family="'${FONT_FAMILY_DISPLAY}'" font-weight="700" font-size="${options.valueSize}" letter-spacing="${options.tracking || 0}">${escapeSvgText(value)}</tspan>`,
    `<tspan dx="16" font-family="'${FONT_FAMILY_BODY}'" font-weight="700" font-size="${options.unitSize}" fill="#9AA1AE" letter-spacing="3">${escapeSvgText(unit)}</tspan>`,
    '</text>'
  ].join('')
}

function renderMetricRow(
  items: Array<[string, string, string]>,
  startX: number,
  baselineY: number,
  gap: number,
  theme: ThemeSpec,
  ratio: RatioSpec
) {
  return items
    .map(([label, value, unit], index) =>
      renderMetricColumn([label, value, unit], startX + gap * index, baselineY, theme, ratio)
    )
    .join('')
}

function renderMetricColumn(
  [label, value, unit]: [string, string, string],
  x: number,
  baselineY: number,
  theme: ThemeSpec,
  ratio: RatioSpec
) {
  const labelSize = ratio.ratio === 'square' ? 16 : 20
  const valueSize = ratio.ratio === 'square' ? 48 : ratio.ratio === 'post' ? 58 : 64
  const unitSize = ratio.ratio === 'square' ? 18 : 22

  return [
    text(label, x, baselineY - 56, {
      fill: theme.textSoft,
      size: labelSize,
      weight: 700,
      letterSpacing: 2,
      uppercase: true
    }),
    `<text x="${round(x)}" y="${round(baselineY)}" fill="#FFFFFF">`,
    `<tspan font-family="'${FONT_FAMILY_DISPLAY}'" font-weight="700" font-size="${valueSize}">${escapeSvgText(value)}</tspan>`,
    `<tspan dx="10" font-family="'${FONT_FAMILY_BODY}'" font-weight="700" font-size="${unitSize}" fill="#A1A1AA" letter-spacing="2">${escapeSvgText(unit)}</tspan>`,
    '</text>'
  ].join('')
}

function text(
  value: string,
  x: number,
  y: number,
  options: {
    anchor?: 'start' | 'middle' | 'end'
    fill?: string
    size?: number
    weight?: number
    letterSpacing?: number
    uppercase?: boolean
  }
) {
  return `<text x="${round(x)}" y="${round(y)}" text-anchor="${options.anchor || 'start'}" fill="${options.fill || '#FFFFFF'}" font-family="'${FONT_FAMILY_BODY}'" font-size="${options.size || 24}" font-weight="${options.weight || 600}" letter-spacing="${options.letterSpacing || 0}"${options.uppercase ? ' text-transform="uppercase"' : ''}>${escapeSvgText(options.uppercase ? value.toUpperCase() : value)}</text>`
}

function renderWatermark(ratio: RatioSpec, theme: ThemeSpec) {
  return `<text x="${round(ratio.width / 2)}" y="${round(ratio.height - 48)}" text-anchor="middle" fill="${theme.watermark}" opacity="0.4" font-family="'${FONT_FAMILY_BODY}'" font-size="${ratio.ratio === 'square' ? 20 : 26}" font-weight="700" letter-spacing="6" text-transform="uppercase">CoachWatts.com</text>`
}

function fitTitle(title: string) {
  const normalized = title.replace(/\s+/g, ' ').trim()
  const words = normalized.split(' ')
  const maxLineLength = 20
  let line1 = ''
  let line2 = ''

  for (const word of words) {
    if (`${line1} ${word}`.trim().length <= maxLineLength || line1.length === 0) {
      line1 = `${line1} ${word}`.trim()
      continue
    }

    line2 = `${line2} ${word}`.trim()
  }

  if (!line2 && line1.length > maxLineLength) {
    line1 = `${line1.slice(0, maxLineLength - 1)}…`
  }

  if (line2.length > maxLineLength + 3) {
    line2 = `${line2.slice(0, maxLineLength + 2).trim()}…`
  }

  return {
    line1,
    line2,
    longestLine: Math.max(line1.length, line2.length),
    hasSecondLine: line2.length > 0
  }
}

function getTitleFontSize(base: number, longestLine: number, multiline: boolean): number {
  if (longestLine <= 12) return base - 6
  if (longestLine <= 16) return multiline ? base - 12 : base - 10
  if (longestLine <= 20) return multiline ? base - 18 : base - 16
  return multiline ? base - 24 : base - 22
}

function getHeroScale(value: string): number {
  if (value.length <= 4) return 0.86
  if (value.length === 5) return 0.78
  if (value.length === 6) return 0.7
  return 0.62
}

function scaleFont(base: number, scale: number, ratioScale = 1): string {
  return String(Math.round(base * scale * ratioScale))
}

function scaleFontByRatio(value: number, ratioScale = 1) {
  return String(Math.round(value * ratioScale))
}

function getPaceString(workout: WorkoutData) {
  if (workout.averageSpeed && workout.averageSpeed > 0) {
    const paceMinPerKm = 16.666667 / workout.averageSpeed
    return formatPace(paceMinPerKm).replace('/km', '')
  }

  if (workout.durationSec > 0 && workout.distanceMeters && workout.distanceMeters > 0) {
    const paceMinPerKm = workout.durationSec / 60 / (workout.distanceMeters / 1000)
    return formatPace(paceMinPerKm).replace('/km', '')
  }

  return 'N/A'
}

function hasWorkoutMap(workout: WorkoutData) {
  return Array.isArray(workout.streams?.latlng) && workout.streams!.latlng!.length >= 2
}

function getWorkoutMapMarkup(
  workout: WorkoutData,
  variant: WorkoutImageVariant,
  style: WorkoutImageStyle,
  ratio: WorkoutImageRatio
) {
  const coordinates = workout.streams?.latlng
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null

  const size = getMapSize(ratio, style)

  return buildStaticMapSvg(coordinates, {
    ...size,
    maxPoints: 1400,
    transparent: variant === 'transparent',
    framed: false,
    routeColor: style === 'pulse' ? '#FB7185' : '#00C16A',
    routeGlowColor: style === 'pulse' ? 'rgba(251,113,133,0.22)' : 'rgba(0,193,106,0.22)',
    glow: variant !== 'transparent'
  })
}

function getHeartRateChartMarkup(
  workout: WorkoutData,
  variant: WorkoutImageVariant,
  style: WorkoutImageStyle,
  ratio: WorkoutImageRatio
) {
  const heartrate = workout.streams?.heartrate
  if (!Array.isArray(heartrate) || heartrate.length < 4) return null

  const size = getHeartRateChartSize(ratio, style)

  return buildHeartRateChartSvg(heartrate, {
    ...size,
    transparent: variant === 'transparent',
    framed: false,
    lineColor: style === 'pulse' ? '#FB7185' : '#EF4444',
    glowColor: style === 'pulse' ? 'rgba(251,113,133,0.36)' : 'rgba(239,68,68,0.34)'
  })
}

function getMapSize(ratio: WorkoutImageRatio, style: WorkoutImageStyle): VisualSizeSpec {
  if (style === 'crest') {
    if (ratio === 'square') return { width: 560, height: 560, padding: 12 }
    if (ratio === 'post') return { width: 640, height: 640, padding: 14 }
    return { width: 720, height: 720, padding: 18 }
  }

  if (style === 'pulse') {
    if (ratio === 'square') return { width: 960, height: 520, padding: 20 }
    if (ratio === 'post') return { width: 960, height: 620, padding: 24 }
    return { width: 980, height: 760, padding: 28 }
  }

  if (ratio === 'square') return { width: 960, height: 520, padding: 22 }
  if (ratio === 'post') return { width: 960, height: 620, padding: 26 }
  return { width: 980, height: 760, padding: 30 }
}

function getHeartRateChartSize(ratio: WorkoutImageRatio, style: WorkoutImageStyle): VisualSizeSpec {
  if (style === 'pulse') {
    if (ratio === 'square') return { width: 996, height: 232, padding: 8 }
    if (ratio === 'post') return { width: 1000, height: 268, padding: 10 }
    return { width: 1008, height: 304, padding: 12 }
  }

  if (ratio === 'square') return { width: 840, height: 240, padding: 22 }
  if (ratio === 'post') return { width: 840, height: 280, padding: 24 }
  return { width: 840, height: 320, padding: 28 }
}

function escapeSvgText(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function round(value: number) {
  return value.toFixed(2)
}
