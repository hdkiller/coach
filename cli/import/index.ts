import { Command } from 'commander'
import intervalsImportCommand from './intervals'

const importCommand = new Command('import').description(
  'Long-running direct imports without Trigger'
)

importCommand.addCommand(intervalsImportCommand)

export default importCommand
