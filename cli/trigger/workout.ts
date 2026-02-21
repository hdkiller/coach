import { Command } from 'commander'
import chalk from 'chalk'
import { tasks } from '@trigger.dev/sdk/v3'

export const triggerWorkoutCommand = new Command('workout').description(
  'Trigger workout-related tasks'
)

triggerWorkoutCommand
  .command('analyze <workoutId>')
  .description('Trigger manual AI analysis for a workout')
  .option('--prod', 'Trigger in production environment')
  .action(async (workoutId, options) => {
    // Note: In a real scenario, this would use the Trigger.dev API to trigger the task.
    // For this CLI, we assume the environment is configured with the correct TRIGGER_SECRET_KEY.

    console.log(chalk.blue(`Triggering analysis for workout ${workoutId}...`))
    if (options.prod) {
      console.log(chalk.yellow('⚠️  Targeting PRODUCTION environment.'))
    }

    try {
      // We use the SDK to trigger the task.
      // The task ID is usually defined in the trigger/ directory.
      const handle = await tasks.trigger('analyze-workout', { workoutId })

      console.log(chalk.green('Successfully triggered analysis!'))
      console.log(chalk.bold('Run ID:'), handle.id)
      console.log(chalk.gray('Use "cw:cli trigger get <runId>" to monitor progress.'))
    } catch (error) {
      console.error(chalk.red('Error triggering analysis:'), error)
    }
  })
