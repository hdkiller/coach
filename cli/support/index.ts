import { Command } from 'commander'
import { ticketsCommand } from './tickets'

const supportCommand = new Command('support').description(
  'Commands for support agents to manage tickets and help users'
)

supportCommand.addCommand(ticketsCommand)

export default supportCommand
