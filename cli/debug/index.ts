import { Command } from 'commander'
import webhookCommand from './webhook'
import triggerCommand from './webhook-trigger'
import profileCommand from './profile'
import workoutCommand from './workout'
import userStatsCommand from './user-stats'
import llmRequestCommand from './llm-request'
import athleteCommand from './athlete'
import trainingLoadCommand from './training-load'
import wellnessCommand from './wellness'
import recommendationsCommand from './recommendations'
import analyzeStreamsCommand from './analyze-streams'
import findAnyCommand from './find-any'
import plannedCommand from './planned'
import goalsCommand from './goals'
import intervalsTypesCommand from './intervals-types'
import calendarNotesCommand from './calendar-notes'
import verifyLazyProfileCommand from './verify-lazy-profile'
import deduplicateCommand from './deduplicate' // Importing from where I created it, but logically should move file.
import compareIntervalsCommand from './compare-intervals'

const debugCommand = new Command('debug').description('Debugging utilities')

debugCommand.addCommand(webhookCommand)
debugCommand.addCommand(triggerCommand)
debugCommand.addCommand(profileCommand)
debugCommand.addCommand(workoutCommand)
debugCommand.addCommand(userStatsCommand)
debugCommand.addCommand(llmRequestCommand)
debugCommand.addCommand(athleteCommand)
debugCommand.addCommand(trainingLoadCommand)
debugCommand.addCommand(wellnessCommand)
debugCommand.addCommand(recommendationsCommand)
debugCommand.addCommand(analyzeStreamsCommand)
debugCommand.addCommand(findAnyCommand)
debugCommand.addCommand(plannedCommand)
debugCommand.addCommand(goalsCommand)
debugCommand.addCommand(intervalsTypesCommand)
debugCommand.addCommand(calendarNotesCommand)
debugCommand.addCommand(verifyLazyProfileCommand)
debugCommand.addCommand(deduplicateCommand)
debugCommand.addCommand(compareIntervalsCommand)

export default debugCommand
