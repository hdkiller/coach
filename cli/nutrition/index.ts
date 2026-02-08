import { Command } from 'commander'
import inspectCommand from './inspect'

const nutritionCommand = new Command('nutrition').description('Nutrition management commands')

nutritionCommand.addCommand(inspectCommand)

export default nutritionCommand
