import { prisma } from '../server/utils/db'

async function main() {
  const userId = '67583aa2-5efc-49b4-8240-796f048caa4f'
  const date = '2026-02-11'

  console.log(`Checking workouts for user ${userId} on ${date}...`)

  const workouts = await prisma.plannedWorkout.findMany({
    where: {
      userId,
      date: new Date(`${date}T00:00:00Z`)
    }
  })

  console.log(`Found ${workouts.length} workouts:`)
  workouts.forEach((w, i) => {
    console.log(`\nWorkout ${i + 1}:`)
    console.log(`  Title: ${w.title}`)
    console.log(`  DurationSec: ${w.durationSec}`)
    console.log(`  WorkIntensity: ${w.workIntensity}`)
    console.log(`  Type: ${w.type}`)

    // Calculate estimated kJ
    const ftp = 250 // Fallback FTP
    const intensity = w.workIntensity || 0.5
    const durationHours = (w.durationSec || 0) / 3600
    const kJ = Math.round(ftp * intensity * durationHours * 3.6)
    console.log(`  Calculated kJ (at 250 FTP): ${kJ}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
