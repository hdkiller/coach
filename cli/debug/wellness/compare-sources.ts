import { Command } from 'commander'
import chalk from 'chalk'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { subDays, format } from 'date-fns'

const compareSourcesCommand = new Command('compare-sources')
  .description('Compare wellness metrics across different sources for a user')
  .option('--prod', 'Use production database')
  .option('--user <email>', 'User email')
  .option('--days <number>', 'Number of days to look back', '7')
  .option('--raw', 'Show raw JSON for each source update')
  .action(async (options) => {
    const isProd = options.prod
    const connectionString = isProd ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL

    if (!connectionString) {
      console.error(chalk.red('Database connection string not found.'))
      process.exit(1)
    }

    const pool = new pg.Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    try {
      const user = await prisma.user.findUnique({
        where: { email: options.user }
      })

      if (!user) {
        console.error(chalk.red(`User not found: ${options.user}`))
        process.exit(1)
      }

      const days = parseInt(options.days)
      const startDate = subDays(new Date(), days)

      console.log(chalk.cyan(`\n=== Source Comparison for ${user.email} (Last ${days} days) ===`))
      console.log(chalk.gray(`Start Date: ${format(startDate, 'yyyy-MM-dd')}\n`))

      const records = await prisma.wellness.findMany({
        where: {
          userId: user.id,
          date: { gte: startDate }
        },
        orderBy: { date: 'desc' }
      })

      if (records.length === 0) {
        console.log(chalk.yellow('No wellness records found for this period.'))
        return
      }

      for (const w of records) {
        const dateStr = format(w.date, 'yyyy-MM-dd')
        console.log(chalk.bold.white(`Date: ${dateStr}`))
        console.log(
          chalk.gray(
            `Current DB State: HRV: ${w.hrv}, RHR: ${w.restingHr}, SpO2: ${w.spO2}, Source: ${w.lastSource || 'unknown'}, Updated: ${w.updatedAt.toISOString()}`
          )
        )

        const history = (w.history as any[]) || []
        const sources = Array.from(new Set(history.map((h) => h.source))).filter(Boolean)

        if (sources.length > 1) {
          console.log(chalk.red(`  ⚠️  Multiple Sources detected: ${sources.join(', ')}`))

          // Group changes by source
          const sourceMetrics: Record<
            string,
            { hrv: any[]; rhr: any[]; spo2: any[]; readiness: any[]; entries: any[] }
          > = {}
          sources.forEach(
            (s) => (sourceMetrics[s] = { hrv: [], rhr: [], spo2: [], readiness: [], entries: [] })
          )

          history.forEach((entry) => {
            const s = entry.source
            if (!s || !sourceMetrics[s]) return
            sourceMetrics[s].entries.push(entry)
            if (entry.changes && typeof entry.changes === 'object') {
              if (entry.changes.hrv) sourceMetrics[s].hrv.push(entry.changes.hrv.new)
              if (entry.changes.restingHr) sourceMetrics[s].rhr.push(entry.changes.restingHr.new)
              if (entry.changes.spO2) sourceMetrics[s].spo2.push(entry.changes.spO2.new)
              if (entry.changes.readiness)
                sourceMetrics[s].readiness.push(entry.changes.readiness.new)
            }
          })

          sources.forEach((s) => {
            const hrvs = sourceMetrics[s].hrv
            const rhrs = sourceMetrics[s].rhr
            const spo2s = sourceMetrics[s].spo2
            const readinesses = sourceMetrics[s].readiness

            const hrvDisplay = hrvs.length > 0 ? hrvs[hrvs.length - 1] : '?'
            const rhrDisplay = rhrs.length > 0 ? rhrs[rhrs.length - 1] : '?'
            const spo2Display = spo2s.length > 0 ? spo2s[spo2s.length - 1] : '?'
            const readinessDisplay =
              readinesses.length > 0 ? readinesses[readinesses.length - 1] : '?'

            console.log(
              `    - ${s.padEnd(10)} | HRV: ${chalk.yellow(String(hrvDisplay).padEnd(3))} | RHR: ${chalk.yellow(String(rhrDisplay).padEnd(3))} | SpO2: ${chalk.yellow(String(spo2Display).padEnd(3))} | Readiness: ${chalk.yellow(readinessDisplay)}`
            )

            if (options.raw) {
              const lastUpdate = sourceMetrics[s].entries
                .filter((e) => e.changes !== 'created')
                .pop()
              if (lastUpdate) {
                console.log(chalk.gray(`      Last Update: ${JSON.stringify(lastUpdate.changes)}`))
              }
            }
          })

          // Oura specific deep dive if present
          if (sources.includes('oura') && w.rawJson && (w.rawJson as any).dailyReadiness) {
            const raw = w.rawJson as any
            const readiness = raw.dailyReadiness || {}
            const sleep = raw.sleepPeriods?.[0] || {}
            const spo2 = raw.spo2 || {}
            console.log(chalk.blue(`    🔍 Oura Raw Insight:`))
            console.log(`       Readiness Score: ${readiness.score}`)
            console.log(`       Readiness RHR:   ${readiness.contributors?.resting_heart_rate}`)
            console.log(`       Readiness HRV:   ${readiness.contributors?.hrv_balance} (Balance?)`)
            console.log(`       Sleep Lowest HR: ${sleep.lowest_heart_rate}`)
            console.log(`       Sleep Avg HRV:   ${sleep.average_hrv}`)
            console.log(`       SpO2 Average:    ${spo2.spo2_percentage?.average}%`)
            console.log(`       Stress Summary:  ${raw.stress?.day_summary}`)
          }

          // Intervals specific deep dive if present
          if (sources.includes('intervals') && w.rawJson) {
            const raw = w.rawJson as any
            console.log(chalk.blue(`    🔍 Intervals Raw Insight:`))
            console.log(
              `       hrv: ${raw.hrv}, restingHR: ${raw.restingHR}, spO2: ${raw.spO2}, readiness: ${raw.readiness}`
            )
          }
        } else {
          console.log(chalk.green(`  ✓ Single Source: ${sources[0] || 'Unknown'}`))
        }
        console.log('')
      }
    } catch (e: any) {
      console.error(chalk.red('Error:'), e.message)
    } finally {
      await prisma.$disconnect()
      await pool.end()
    }
  })

export default compareSourcesCommand
