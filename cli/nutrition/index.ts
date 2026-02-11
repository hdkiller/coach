import { Command } from 'commander'
import inspectCommand from './inspect'
import searchCommand from './search'
import recalculateCommand from './recalculate'
import fixDatesCommand from './fix-dates'

const nutritionCommand = new Command('nutrition').description('Nutrition management commands')

nutritionCommand.addCommand(inspectCommand)
nutritionCommand.addCommand(searchCommand)
nutritionCommand.addCommand(recalculateCommand)
nutritionCommand.addCommand(fixDatesCommand)

export default nutritionCommand
