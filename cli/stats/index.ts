import { Command } from 'commander'
import usersStatsCommand from './users'

const statsCommand = new Command('stats').description('Statistics commands')

statsCommand.addCommand(usersStatsCommand)

export default statsCommand
