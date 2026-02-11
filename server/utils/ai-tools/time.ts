import { tool } from 'ai'
import { z } from 'zod'
import { formatUserDate, buildZonedDateTimeFromUtcDate, getUserLocalDate } from '../date'
import { prisma } from '../db'

export const timeTools = (userId: string, timezone: string) => ({
  get_current_time: tool({
    description:
      'Returns the current precise time, day of the week, and "time of day" (morning/afternoon/etc.) for the user. Use this when you need precise temporal context for meal or workout planning. It also checks if the athlete is currently in a scheduled workout session.',
    inputSchema: z.object({}),
    execute: async () => {
      const now = new Date()
      const userTime = formatUserDate(now, timezone, 'EEEE, MMMM d, yyyy h:mm a')
      const hourOfDay = parseInt(
        now.toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
      )

      let timeOfDay = 'morning'
      if (hourOfDay >= 12 && hourOfDay < 17) timeOfDay = 'afternoon'
      else if (hourOfDay >= 17 && hourOfDay < 21) timeOfDay = 'evening'
      else if (hourOfDay >= 21 || hourOfDay < 5) timeOfDay = 'late night'

      // Check for current planned workout
      const todayDate = getUserLocalDate(timezone, now)
      const plannedWorkouts = await prisma.plannedWorkout.findMany({
        where: {
          userId,
          date: todayDate,
          completed: false
        },
        select: {
          id: true,
          date: true,
          title: true,
          startTime: true,
          durationSec: true,
          type: true
        }
      })

      let activeWorkout = null
      for (const workout of plannedWorkouts) {
        if (!workout.startTime) continue

        const start = buildZonedDateTimeFromUtcDate(workout.date, workout.startTime, timezone)
        const durationMs = (workout.durationSec || 3600) * 1000
        const end = new Date(start.getTime() + durationMs)

        if (now >= start && now <= end) {
          activeWorkout = {
            id: workout.id,
            title: workout.title,
            type: workout.type,
            startTime: workout.startTime,
            endTime: formatUserDate(end, timezone, 'h:mm a'),
            remainingMinutes: Math.round((end.getTime() - now.getTime()) / 60000)
          }
          break
        }
      }

      return {
        iso: now.toISOString(),
        local_formatted: userTime,
        timezone,
        hour_24: hourOfDay,
        time_of_day: timeOfDay,
        active_workout: activeWorkout,
        context_hint: activeWorkout
          ? `It is currently ${timeOfDay} for the athlete. They are CURRENTLY in a planned workout: "${activeWorkout.title}" (Ends at ${activeWorkout.endTime}).`
          : `It is currently ${timeOfDay} for the athlete.`
      }
    }
  })
})
