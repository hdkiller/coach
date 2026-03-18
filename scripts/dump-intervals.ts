import { prisma } from '../server/utils/db'
import {
  getActualIntervalsForAnalysis,
  getActualIntervalsSourceForAnalysis
} from '../server/utils/workout-analysis-facts'
import { sportSettingsRepository } from '../server/utils/repositories/sportSettingsRepository'

async function main() {
  const workoutId = '072ad757-4d2a-4c14-b7cc-460dfc930a99'
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: { streams: true, plannedWorkout: true }
  })

  if (!workout) {
    console.error('Workout not found')
    return
  }

  const sportSettings = await sportSettingsRepository.getForActivityType(
    workout.userId,
    workout.type || ''
  )

  const intervals = getActualIntervalsForAnalysis(workout, workout.plannedWorkout)
  const source = getActualIntervalsSourceForAnalysis(workout, workout.plannedWorkout)

  console.log(`Source: ${source}`)
  console.log('Intervals:')
  intervals.forEach((interval, index) => {
    console.log(
      `${index + 1}: ${interval.type} | ${interval.durationSeconds}s | ${interval.avgPower}W | ${interval.classification}`
    )
  })
}

main().catch(console.error)
