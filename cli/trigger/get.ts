import { Command } from 'commander'
import chalk from 'chalk'

const getCommand = new Command('get')

getCommand
  .description('Get details of a specific trigger run')
  .argument('<runId>', 'The ID of the run to retrieve')
  .option('--prod', 'Use production environment')
  .action(async (runId, options) => {
    try {
      if (options.prod) {
        if (!process.env.TRIGGER_PROD_SECRET_KEY) {
          console.error(chalk.red('Error: TRIGGER_PROD_SECRET_KEY is not set in .env'))
          process.exit(1)
        }
        process.env.TRIGGER_SECRET_KEY = process.env.TRIGGER_PROD_SECRET_KEY
        process.env.TASK_QUEUE_DRIVER = 'trigger'

        if (process.env.TRIGGER_PROD_API_URL) {
          process.env.TRIGGER_API_URL = process.env.TRIGGER_PROD_API_URL
        }

        if (process.env.TRIGGER_PROD_PROJECT_REF) {
          process.env.TRIGGER_PROJECT_REF = process.env.TRIGGER_PROD_PROJECT_REF
        }

        console.log(chalk.yellow('Using PRODUCTION environment'))
      } else {
        console.log(chalk.blue('Using DEVELOPMENT environment'))
      }

      const { getTaskRun } = await import('../../server/utils/task-dispatcher')

      console.log(`Fetching run ${runId}...`)
      const run = await getTaskRun(runId)
      if (!run) throw new Error(`Run not found: ${runId}`)

      console.log(chalk.bold('\nRun Details:'))
      console.log(chalk.gray('----------------------------------------'))
      console.log(`${chalk.bold('ID:')} ${run.id}`)
      console.log(`${chalk.bold('Task:')} ${chalk.cyan(run.taskIdentifier)}`)
      console.log(`${chalk.bold('Status:')} ${getStatusColor(run.status)(run.status)}`)
      console.log(
        `${chalk.bold('Started:')} ${run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}`
      )
      console.log(
        `${chalk.bold('Finished:')} ${run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}`
      )
      console.log(
        `${chalk.bold('Duration:')} ${run.finishedAt ? ((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000).toFixed(2) + 's' : '-'}`
      )
      console.log(`${chalk.bold('Is Test:')} ${run.isTest}`)

      if (run.error) {
        console.log(chalk.gray('----------------------------------------'))
        console.log(chalk.red.bold('Error:'))
        console.log(JSON.stringify(run.error, null, 2))
      }

      console.log(chalk.gray('----------------------------------------'))
      if (run.output) {
        console.log(chalk.gray('----------------------------------------'))
        console.log(chalk.bold('Output:'))
        console.log(JSON.stringify(run.output, null, 2))
      }
    } catch (error) {
      console.error(chalk.red('Failed to fetch run:'), error)
      process.exit(1)
    }
  })

function getStatusColor(status: string) {
  switch (status) {
    case 'COMPLETED':
      return chalk.green
    case 'FAILED':
    case 'CRASHED':
    case 'TIMED_OUT':
      return chalk.red
    case 'EXECUTING':
    case 'QUEUED':
    case 'WAITING_FOR_DEPLOY':
      return chalk.blue
    case 'CANCELED':
      return chalk.gray
    default:
      return chalk.white
  }
}

export default getCommand
