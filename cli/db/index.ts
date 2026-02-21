import { Command } from 'commander'
import backupCommand from './backup'
import compareCommand from './compare'
import migrateZonesCommand from './migrate-zones'
import syncQueueCommand from './sync-queue'
import seedCommand from './seed'
import cleanFitCommand from './clean-fit'
import { workoutCommand } from './workout'

const dbCommand = new Command('db').description('Database commands')

dbCommand.addCommand(backupCommand)
dbCommand.addCommand(compareCommand)
dbCommand.addCommand(migrateZonesCommand)
dbCommand.addCommand(syncQueueCommand)
dbCommand.addCommand(seedCommand)
dbCommand.addCommand(cleanFitCommand)
dbCommand.addCommand(workoutCommand)

export default dbCommand
