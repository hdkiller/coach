import 'dotenv/config'
import { prisma } from '../server/utils/db'
import { bodyMeasurementService } from '../server/utils/services/bodyMeasurementService'

async function main() {
  const [wellnessRows, users] = await Promise.all([
    prisma.wellness.findMany({
      where: {
        OR: [{ weight: { not: null } }, { bodyFat: { not: null } }]
      },
      select: {
        id: true,
        userId: true,
        date: true,
        weight: true,
        bodyFat: true,
        lastSource: true
      }
    }),
    prisma.user.findMany({
      where: {
        OR: [{ height: { not: null } }, { weight: { not: null } }]
      },
      select: {
        id: true,
        height: true,
        weight: true
      }
    })
  ])

  for (const row of wellnessRows) {
    await bodyMeasurementService.recordWellnessMetrics(
      row.userId,
      {
        id: row.id,
        date: row.date,
        weight: row.weight,
        bodyFat: row.bodyFat
      },
      row.lastSource || 'wellness'
    )
  }

  for (const user of users) {
    if (user.height != null) {
      await bodyMeasurementService.recordEntry({
        userId: user.id,
        recordedAt: new Date(),
        metricKey: 'height',
        value: user.height,
        unit: 'cm',
        source: 'profile_manual'
      })
    }

    if (user.weight != null) {
      const latestWeight = await prisma.bodyMeasurementEntry.findFirst({
        where: {
          userId: user.id,
          metricKey: 'weight',
          isDeleted: false
        },
        orderBy: { recordedAt: 'desc' }
      })

      if (!latestWeight || Math.abs(latestWeight.value - user.weight) > 0.01) {
        await bodyMeasurementService.recordEntry({
          userId: user.id,
          recordedAt: new Date(),
          metricKey: 'weight',
          value: user.weight,
          unit: 'kg',
          source: 'profile_manual'
        })
      }
    }
  }

  console.log(`Backfilled ${wellnessRows.length} wellness rows and ${users.length} users.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
