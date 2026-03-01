import { tool } from 'ai'
import { z } from 'zod'
import {
  adjustCalendarDate,
  resolveRelativeDateReference,
  buildInvalidCalendarDateResult
} from '../date'

export const temporalTools = (_userId: string, timezone: string) => ({
  resolve_temporal_reference: tool({
    description:
      'Resolve relative date phrases and simple date arithmetic into a mathematically valid calendar date. Use this before any date-sensitive write when the user said things like "yesterday", "last night", "day before yesterday", "next Monday", or when you need to add/subtract days from a known YYYY-MM-DD date.',
    inputSchema: z.object({
      reference: z
        .string()
        .optional()
        .describe(
          'Relative phrase like "yesterday", "last night", "day before yesterday", or "next Monday".'
        ),
      base_date: z
        .string()
        .optional()
        .describe('Optional base date in YYYY-MM-DD. Defaults to the user local date today.'),
      offset_days: z
        .number()
        .int()
        .optional()
        .describe(
          'Signed day offset to apply to base_date, for example -1 to subtract one day or 3 to add three days.'
        )
    }),
    execute: async ({ reference, base_date, offset_days }) => {
      if (!reference && offset_days === undefined) {
        return {
          success: false,
          error_code: 'MISSING_TEMPORAL_INPUT',
          error: 'Provide either a reference phrase or offset_days.'
        }
      }

      if (reference) {
        const resolved = resolveRelativeDateReference(reference, timezone, base_date)
        if (!resolved.success) {
          if (resolved.error_code === 'INVALID_BASE_DATE' && base_date) {
            return buildInvalidCalendarDateResult('base_date', base_date, {
              reference,
              base_date,
              offset_days
            })
          }

          return {
            success: false,
            error_code: resolved.error_code,
            error: resolved.error
          }
        }

        return {
          success: true,
          reference,
          base_date: resolved.baseDateString,
          resolved_date: resolved.resolvedDateString,
          timezone,
          assumed_time_of_day: resolved.assumedTimeOfDay,
          explanation: `Resolved "${reference}" relative to ${resolved.baseDateString}.`
        }
      }

      const adjusted = adjustCalendarDate(base_date || '', offset_days || 0)
      if (!adjusted.success) {
        return buildInvalidCalendarDateResult('base_date', base_date || '', {
          reference,
          base_date,
          offset_days
        })
      }

      return {
        success: true,
        base_date: adjusted.baseDateString,
        resolved_date: adjusted.resolvedDateString,
        offset_days: offset_days || 0,
        timezone,
        explanation: `Applied ${offset_days || 0} day(s) to ${adjusted.baseDateString}.`
      }
    }
  })
})
