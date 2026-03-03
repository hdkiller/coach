import { Command } from 'commander'
import checkCommand from './check'
import listMissingCommand from './list-missing'
import statusCommand from './status'
import pushValuesCommand from './push-values'
import syncCommand from './sync'

const translationsCommand = new Command('translations').description(
  'Manage i18n translations and Tolgee namespaces'
)

translationsCommand.addCommand(checkCommand)
translationsCommand.addCommand(listMissingCommand)
translationsCommand.addCommand(statusCommand)
translationsCommand.addCommand(pushValuesCommand)
translationsCommand.addCommand(syncCommand)

export default translationsCommand
