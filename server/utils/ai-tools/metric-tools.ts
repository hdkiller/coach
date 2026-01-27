import { tool } from 'ai'
import { z } from 'zod'
import { calculateTrainingMetrics as calcMetrics } from '../chat-tools/metric-tools'

export const metricTools = (userId: string, timezone: string) => ({
  calculate_training_metrics: tool({
    description:
      'Perform accurate calculations for pacing, training zones, optimal cadence, and unit conversions. Use this tool for any math related to training metrics to avoid hallucination.',
    inputSchema: z.object({
      operation: z
        .enum(['calculate_pace', 'calculate_zones', 'convert_units', 'calculate_optimal_cadence'])
        .describe('Type of calculation'),
      distance_meters: z.number().optional().describe('Distance in meters (for pace calc)'),
      duration_seconds: z.number().optional().describe('Duration in seconds (for pace calc)'),
      speed_kmh: z.number().optional().describe('Speed in km/h (for optimal cadence)'),
      height_cm: z
        .number()
        .optional()
        .describe('User height in cm (for optimal cadence adjustment)'),
      leg_length_cm: z
        .number()
        .optional()
        .describe('User leg length in cm (for optimal cadence adjustment)'),
      current_cadence: z.number().optional().describe('User current cadence (for comparison)'),
      goal: z.enum(['technique', 'injury_prevention']).optional().describe('Optimization goal'),
      ftp: z.number().optional().describe('Functional Threshold Power in Watts (for power zones)'),
      lthr: z.number().optional().describe('Lactate Threshold Heart Rate in bpm (for HR zones)'),
      max_hr: z.number().optional().describe('Maximum Heart Rate in bpm (for HR zones)'),
      value: z.number().optional().describe('Value to convert (for unit conversion)'),
      from_unit: z
        .string()
        .optional()
        .describe('Unit to convert from (km, miles, meters, feet, kg, lbs)'),
      to_unit: z
        .string()
        .optional()
        .describe('Unit to convert to (km, miles, meters, feet, kg, lbs)')
    }),
    execute: async (args) => {
      // Reuse the logic from chat-tools
      return await calcMetrics(args)
    }
  })
})
