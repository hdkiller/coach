/**
 * Trigger a global recalculation of training stress scores (CTL/ATL)
 * for all users, considering the current duplicate markings.
 */
import 'dotenv/config'
import { prisma } from '../server/utils/db'
import { recalculateStressAfterDate } from '../server/utils/calculate-workout-stress'

async function main() {
  console.log('Starting global training stress recalculation...\n')
  
  const users = await prisma.user.findMany({
    select: { id: true, email: true }
  })
  
  for (const user of users) {
    console.log(`Processing user: ${user.email}`)
    
    // Find the earliest workout for this user
    const earliestWorkout = await prisma.workout.findFirst({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
      select: { date: true }
    })
    
    if (earliestWorkout) {
      console.log(`  - Earliest workout found at: ${earliestWorkout.date.toISOString()}`)
      const count = await recalculateStressAfterDate(user.id, earliestWorkout.date)
      console.log(`  - Updated ${count} workouts`)
    } else {
      console.log('  - No workouts found for this user.')
    }
  }
  
  console.log('\nGlobal recalculation complete.')
}

main()
  .catch(e => {
    console.error('Error during recalculation:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
