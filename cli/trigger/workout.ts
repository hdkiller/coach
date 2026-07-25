import { Command } from 'commander'
import chalk from 'chalk'

export const triggerWorkoutCommand = new Command('workout').description(
  'Trigger workout-related tasks'
)

triggerWorkoutCommand
  .command('analyze <workoutId>')
  .description('Trigger manual AI analysis for a workout')
  .option('--prod', 'Trigger in production environment')
  .action(async (workoutId, options) => {
    console.log(chalk.blue(`Triggering analysis for workout ${workoutId}...`))
    if (options.prod) {
      if (!process.env.TRIGGER_PROD_SECRET_KEY) {
        console.error(chalk.red('Error: TRIGGER_PROD_SECRET_KEY is not set in .env'))
        process.exit(1)
      }
      process.env.TRIGGER_SECRET_KEY = process.env.TRIGGER_PROD_SECRET_KEY
      if (process.env.TRIGGER_PROD_API_URL) {
        process.env.TRIGGER_API_URL = process.env.TRIGGER_PROD_API_URL
      }
      if (process.env.TRIGGER_PROD_PROJECT_REF) {
        process.env.TRIGGER_PROJECT_REF = process.env.TRIGGER_PROD_PROJECT_REF
      }
      console.log(chalk.yellow('⚠️  Targeting PRODUCTION environment.'))
    }

    try {
      // Dynamic import after env switch so the SDK picks up the prod secret.
      const { tasks } = await import('@trigger.dev/sdk/v3')
      const handle = await tasks.trigger('analyze-workout', { workoutId })

      console.log(chalk.green('Successfully triggered analysis!'))
      console.log(chalk.bold('Run ID:'), handle.id)
      console.log(chalk.gray('Use "cw:cli trigger get <runId> --prod" to monitor progress.'))
    } catch (error) {
      console.error(chalk.red('Error triggering analysis:'), error)
      process.exit(1)
    }
  })
