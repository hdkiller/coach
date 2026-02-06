import { Command } from 'commander'
import backfillMetricsCommand from './metrics'
import backfillTssCommand from './tss'
import backfillPlannedWorkoutsCommand from './planned-workouts'
import backfillWorkoutsCommand from './workouts'
import backfillFeelCommand from './feel'
import backfillWellnessScoresCommand from './wellness-scores'
import backfillManagedByCommand from './managed-by'
import backfillKilojoulesCommand from './kilojoules'
import backfillCalendarNotesCommand from './calendar-notes'
import backfillSportSettingsCommand from './sport-settings'
import backfillReportTemplatesCommand from './report-templates'
import backfillIntervalsParsingCommand from './intervals-parsing'
import backfillMaxWattsCommand from './max-watts'

const backfill = new Command('backfill')

backfill
  .description('Backfill data/fix schema issues')
  .addCommand(backfillMetricsCommand)
  .addCommand(backfillTssCommand)
  .addCommand(backfillPlannedWorkoutsCommand)
  .addCommand(backfillWorkoutsCommand)
  .addCommand(backfillFeelCommand)
  .addCommand(backfillWellnessScoresCommand)
  .addCommand(backfillManagedByCommand)
  .addCommand(backfillKilojoulesCommand)
  .addCommand(backfillCalendarNotesCommand)
  .addCommand(backfillSportSettingsCommand)
  .addCommand(backfillReportTemplatesCommand)
  .addCommand(backfillIntervalsParsingCommand)
  .addCommand(backfillMaxWattsCommand)

export default backfill
