export interface AttributionRule {
  logoLight: string
  logoDark: string
  requiresDeviceName: boolean
  // Function to format the text displayed next to the logo
  textFormat: (deviceName?: string) => string
  // Optional width constraint for the logo to ensure visual consistency
  logoHeightClass: string
  // Whether to invert the logo colors in dark mode (useful for SVGs with black text)
  invertInDarkMode?: boolean
}

export const ATTRIBUTION_RULES: Record<string, AttributionRule> = {
  garmin: {
    logoLight: '/images/logos/Garmin-Tag-black-high-res.png',
    logoDark: '/images/logos/Garmin-Tag-white-high-res.png',
    requiresDeviceName: true,
    textFormat: (deviceName) => deviceName || 'Device',
    logoHeightClass: 'h-6'
  },
  strava: {
    logoLight: '/images/logos/strava_powered_by.png',
    logoDark: '/images/logos/strava_powered_by.png', // Strava usually has a single "Powered by" asset
    requiresDeviceName: false,
    textFormat: () => '', // Text is embedded in the logo
    logoHeightClass: 'h-8' // Strava logo often needs to be slightly larger to be legible
  },
  zwift: {
    logoLight: '/images/logos/zwift_dark.webp',
    logoDark: '/images/logos/zwift_white.webp',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-6'
  },
  apple_health: {
    logoLight: '/images/logos/apple-watch-logo.svg',
    logoDark: '/images/logos/apple-watch-logo.svg',
    requiresDeviceName: false,
    textFormat: () => '',
    logoHeightClass: 'h-8',
    invertInDarkMode: true
  }
  // Future providers can be added here
}

export function getAttributionRule(provider: string): AttributionRule | undefined {
  return ATTRIBUTION_RULES[provider?.toLowerCase()]
}
