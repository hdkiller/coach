export interface AttributionRule {
  logoLight: string
  logoDark: string
  requiresDeviceName: boolean
  // Function to format the text displayed next to the logo
  textFormat: (deviceName?: string) => string
  // Height and width constraints to keep logos readable without overflowing narrow layouts
  logoHeightClass: string
  logoWidthClass?: string
  // Whether to invert the logo colors in dark mode (useful for SVGs with black text)
  invertInDarkMode?: boolean
}

export const ATTRIBUTION_RULES: Record<string, AttributionRule> = {
  garmin: {
    logoLight: '/images/logos/WorksWithGarmin-Black.svg',
    logoDark: '/images/logos/WorksWithGarmin-White.svg',
    requiresDeviceName: true,
    textFormat: (deviceName) => deviceName || 'Device',
    logoHeightClass: 'h-6'
  },
  strava: {
    logoLight: '/images/logos/strava_powered_by.png',
    logoDark: '/images/logos/strava_powered_by.png', // Strava usually has a single "Powered by" asset
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-5 sm:h-6',
    logoWidthClass: 'max-w-[120px] sm:max-w-[150px]'
  },
  zwift: {
    logoLight: '/images/logos/zwift_dark.webp',
    logoDark: '/images/logos/zwift_white.webp',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-5 sm:h-6',
    logoWidthClass: 'max-w-[104px] sm:max-w-[132px]'
  },
  whoop: {
    logoLight: '/images/logos/WHOOP_Logo_Black.svg',
    logoDark: '/images/logos/WHOOP_Logo_White.svg',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-6'
  },
  intervals: {
    logoLight: '/images/logos/intervals.png',
    logoDark: '/images/logos/intervals.png',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-6'
  },
  withings: {
    logoLight: '/images/logos/withings.svg',
    logoDark: '/images/logos/withings.svg',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-6',
    invertInDarkMode: true
  },
  hevy: {
    logoLight: '/images/logos/Hevy.svg',
    logoDark: '/images/logos/Hevy.svg',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-6',
    invertInDarkMode: true
  },
  rouvy: {
    logoLight: '/images/logos/rouvy-logo-dark-ink-blue-rgb.svg',
    logoDark: '/images/logos/rouvy-logo-dark-ink-blue-rgb.svg',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-5'
  },
  apple_health: {
    logoLight: '/images/logos/apple-watch-logo.svg',
    logoDark: '/images/logos/apple-watch-logo.svg',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-6 sm:h-8',
    logoWidthClass: 'max-w-[72px] sm:max-w-[96px]',
    invertInDarkMode: true
  },
  wahoo: {
    logoLight: '/images/logos/wahoo_logo_white.webp',
    logoDark: '/images/logos/wahoo_logo_white.webp',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-4',
    invertInDarkMode: true
  }
  // Future providers can be added here
}

export function getAttributionRule(provider: string): AttributionRule | undefined {
  return ATTRIBUTION_RULES[provider?.toLowerCase()]
}
