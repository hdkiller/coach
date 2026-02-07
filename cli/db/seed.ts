import { Command } from 'commander'
import chalk from 'chalk'
import { prisma } from '../../server/utils/db'
import { seed as llmTierSettingsSeed } from './seeds/llm-tier-settings'
import { seed as reportTemplatesSeed } from './seeds/report-templates'

const seedCommand = new Command('seed').description('Seed the database')

// Registry of seeds
// To add a new seed:
// 1. Create a file in ./seeds/
// 2. Import its seed function here
// 3. Add it to the seeds object below
const seeds: Record<string, () => Promise<void>> = {
  'llm-tier-settings': llmTierSettingsSeed,
  'report-templates': reportTemplatesSeed
}

seedCommand.argument('[seedName]', 'Name of the seed to run').action(async (seedName) => {
  try {
    if (seedName) {
      const seedFn = seeds[seedName]
      if (!seedFn) {
        console.error(chalk.red(`Error: Seed "${seedName}" not found.`))
        console.log(chalk.gray(`Available seeds: ${Object.keys(seeds).join(', ')}`))
        process.exitCode = 1
        return
      }
      console.log(chalk.blue(`🚀 Running seed: ${seedName}...`))
      await seedFn()
      console.log(chalk.green(`✅ Seed "${seedName}" completed successfully.`))
    } else {
      console.log(chalk.blue('🚀 Running all available seeds...'))
      for (const [name, seedFn] of Object.entries(seeds)) {
        console.log(chalk.cyan(`\n🔹 Running seed: ${name}`))
        await seedFn()
      }
      console.log(chalk.green('\n✅ All seeds completed successfully.'))
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Seed failed:'), error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
})

export default seedCommand
