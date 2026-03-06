import { z } from 'zod'

export const profileUpdateSchema = z.object({
  // Basic Settings
  name: z.string().min(2).nullable().optional(),
  nickname: z.string().max(50).nullable().optional(),
  language: z.string().optional(),
  uiLanguage: z.string().optional(),
  weight: z.number().nullable().optional(),
  weightUnits: z.enum(['Kilograms', 'Pounds']).optional(),
  weightSourceMode: z.enum(['AUTO', 'PROFILE_LOCK']).optional(),
  height: z.number().nullable().optional(),
  heightUnits: z.enum(['cm', 'ft/in']).optional(),
  distanceUnits: z.enum(['Kilometers', 'Miles']).optional(),
  temperatureUnits: z.enum(['Celsius', 'Fahrenheit']).optional(),
  restingHr: z.number().nullable().optional(),
  maxHr: z.number().nullable().optional(),
  lthr: z.number().nullable().optional(),
  ftp: z.number().nullable().optional(),
  visibility: z.enum(['Private', 'Public', 'Followers Only']).optional(),
  sex: z.enum(['Male', 'Female', 'Other', 'M', 'F']).nullable().optional(),
  dob: z.string().nullable().optional(), // YYYY-MM-DD
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),

  // AI Context
  aiContext: z.string().nullable().optional(),

  // Deprecated: Custom Zones (handled via Sport Settings now)
  hrZones: z.any().nullable().optional(),
  powerZones: z.any().nullable().optional(),

  // Sport Specific Settings
  sportSettings: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().nullable().optional(),
        types: z.array(z.string()),
        isDefault: z.boolean().optional(),

        // Power
        ftp: z.number().nullable().optional(),
        indoorFtp: z.number().nullable().optional(),
        wPrime: z.number().nullable().optional(),
        powerZones: z.any().optional(),
        eFtp: z.number().nullable().optional(),
        eWPrime: z.number().nullable().optional(),
        pMax: z.number().nullable().optional(),
        ePMax: z.number().nullable().optional(),
        powerSpikeThreshold: z.number().nullable().optional(),
        eftpMinDuration: z.number().nullable().optional(),

        // HR
        lthr: z.number().nullable().optional(),
        maxHr: z.number().nullable().optional(),
        hrZones: z.any().optional(),
        restingHr: z.number().nullable().optional(),
        hrLoadType: z.string().nullable().optional(),

        // Pace
        thresholdPace: z.number().nullable().optional(),
        paceZones: z.any().optional(),

        // General
        warmupTime: z.number().nullable().optional(),
        cooldownTime: z.number().nullable().optional(),
        loadPreference: z.string().nullable().optional(),
        targetPolicy: z
          .object({
            primaryMetric: z.enum(['heartRate', 'power', 'pace', 'rpe']).optional(),
            fallbackOrder: z
              .array(z.enum(['heartRate', 'power', 'pace', 'rpe']))
              .min(1)
              .max(4)
              .optional(),
            strictPrimary: z.boolean().optional(),
            allowMixedTargetsPerStep: z.boolean().optional(),
            defaultTargetStyle: z.enum(['value', 'range']).optional(),
            preferRangesForSteady: z.boolean().optional()
          })
          .nullable()
          .optional(),
        targetFormatPolicy: z
          .object({
            heartRate: z
              .object({
                mode: z.enum(['percentLthr', 'percentMaxHr', 'zone', 'bpm']).optional(),
                preferRange: z.boolean().optional()
              })
              .optional(),
            power: z
              .object({
                mode: z.enum(['percentFtp', 'zone', 'watts']).optional(),
                preferRange: z.boolean().optional()
              })
              .optional(),
            pace: z
              .object({
                mode: z.enum(['percentPace', 'zone', 'absolutePace']).optional(),
                preferRange: z.boolean().optional()
              })
              .optional(),
            cadence: z
              .object({
                mode: z.enum(['none', 'rpm', 'rpmRange']).optional()
              })
              .optional()
          })
          .nullable()
          .optional(),

        // Metadata
        source: z.string().optional(),
        externalId: z.string().optional()
      })
    )
    .optional()
})
