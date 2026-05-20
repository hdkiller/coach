import { Command } from 'commander'
import intervalsImportCommand from './intervals'
import filesImportCommand from './files'

const importCommand = new Command('import').description(
  'Long-running direct imports without Trigger'
)

importCommand.addCommand(intervalsImportCommand)
importCommand.addCommand(filesImportCommand)

export default importCommand
