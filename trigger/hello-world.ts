import './init'
import { logger, task } from '@trigger.dev/sdk/v3'
import { registerTaskHandler } from '../server/utils/task-registry'

export async function runHelloWorld(payload: { message: string }) {
  logger.log('Hello, world!', { payload })
  return {
    message: `Hello, ${payload.message}!`
  }
}

registerTaskHandler('hello-world', runHelloWorld)

export const helloWorldTask = task({
  id: 'hello-world',
  run: async (payload: { message: string }) => {
    return runHelloWorld(payload)
  }
})
