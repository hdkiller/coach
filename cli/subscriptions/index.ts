import { Command } from 'commander'
import listCommand from './list'
import syncCommand from './sync'

const subscriptionsCommand = new Command('subscriptions').description(
  'Subscription management commands'
)

subscriptionsCommand.addCommand(listCommand)
subscriptionsCommand.addCommand(syncCommand)

export default subscriptionsCommand
