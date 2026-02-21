import { Command } from 'commander'
import listCommand from './list'
import getCommand from './get'
import { triggerWorkoutCommand } from './workout'

const triggerCommand = new Command('trigger')

triggerCommand.description('Trigger.dev management commands')

triggerCommand.addCommand(listCommand)
triggerCommand.addCommand(getCommand)
triggerCommand.addCommand(triggerWorkoutCommand)

export default triggerCommand
