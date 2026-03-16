import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

/**
 * UserUniverseImporter:
 * Injects a gathered user universe into the database.
 * Handles topological sorting of records to satisfy foreign key constraints.
 */
export class UserUniverseImporter {
  constructor(private prisma: any) {}

  /**
   * Main entry point for importing a user package.
   */
  async import(data: any, options: { clearExisting?: boolean; emailOverride?: string } = {}) {
    const { clearExisting, emailOverride } = options
    let universe = this.sanitize(data)

    const originalUserId = universe.profile.id
    let targetUserId = originalUserId

    if (emailOverride) {
      universe.profile.email = emailOverride
      // If email is overridden, we likely want a new ID too to avoid collisions
      // if the original ID already exists locally under a different email.
      const existingById = await this.prisma.user.findUnique({ where: { id: originalUserId } })
      if (existingById) {
        targetUserId = uuidv4()
        console.log(
          `ID collision detected. Remapping user ID from ${originalUserId} to ${targetUserId}`
        )
        universe = this.remapUserIds(universe, originalUserId, targetUserId)
      }
    }

    const email = universe.profile.email

    return await this.prisma.$transaction(
      async (tx: any) => {
        // 1. Handle existing user by email
        const existingUser = await tx.user.findUnique({ where: { email } })
        if (existingUser) {
          if (clearExisting) {
            // Cascading delete is handled by Prisma schema (onDelete: Cascade)
            await tx.user.delete({ where: { id: existingUser.id } })
          } else {
            throw new Error(`User with email ${email} already exists. Use --clear to replace.`)
          }
        }

        // 2. Level 0: Core User
        const user = await tx.user.create({
          data: {
            ...this.stripRelations(universe.profile),
            id: targetUserId
          }
        })

        // 3. Level 1: User-owned settings and independent parents
        await this.importProfileRelations(tx, universe)
        await this.importGoals(tx, universe)
        await this.importIntegrations(tx, universe)
        await this.importChatRooms(tx, universe)

        // 4. Level 2: Plans and primary data
        await this.importTrainingPlans(tx, universe)
        await this.importWellness(tx, universe)
        await this.importNutrition(tx, universe)
        await this.importEvents(tx, universe)

        // 5. Level 3: Activities (Workouts & PlannedWorkouts)
        await this.importPlannedWorkouts(tx, universe)
        await this.importWorkouts(tx, universe)

        // 6. Level 4: Reports & Recommendations
        await this.importAIOutputs(tx, universe)

        return user
      },
      {
        timeout: 60000 // Extend timeout for large imports
      }
    )
  }

  /**
   * Recursively replaces all occurrences of oldId with newId in the object.
   */
  private remapUserIds(obj: any, oldId: string, newId: string): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.remapUserIds(item, oldId, newId))
    } else if (obj !== null && typeof obj === 'object') {
      const newObj: any = {}
      for (const key in obj) {
        if (
          obj[key] === oldId &&
          (key === 'userId' || key === 'id' || key === 'ownerId' || key === 'senderId')
        ) {
          newObj[key] = newId
        } else {
          newObj[key] = this.remapUserIds(obj[key], oldId, newId)
        }
      }
      return newObj
    }
    return obj
  }

  /**
   * Removes sensitive production-only data.
   */
  private sanitize(data: any) {
    const universe = JSON.parse(JSON.stringify(data)) // Deep clone

    // Strip Stripe info
    if (universe.profile) {
      delete universe.profile.stripeCustomerId
      delete universe.profile.stripeSubscriptionId
      delete universe.profile.subscriptionStatus
      delete universe.profile.subscriptionTier
    }

    // Strip integration tokens (optional, but safer)
    if (universe.system?.integrations) {
      universe.system.integrations.forEach((i: any) => {
        i.accessToken = 'REDACTED_LOCAL'
        i.refreshToken = 'REDACTED_LOCAL'
      })
    }

    return universe
  }

  private stripRelations(obj: any) {
    const copy = { ...obj } as Record<string, any>
    // Remove common relation fields that Prisma might include in a 'findUnique' with include
    const relations = [
      'nutritionSettings',
      'emailPreferences',
      'trainingAvailability',
      'sportSettings',
      'accounts',
      'activityRecommendations',
      'apiKeys',
      'auditLogs',
      'calendarNotes',
      'chatParticipations',
      'chatTurns',
      'invites',
      'coaches',
      'athletes',
      'dailyCheckins',
      'dailyMetrics',
      'events',
      'fitFiles',
      'goals',
      'integrations',
      'llmUsage',
      'nutrition',
      'oauthApps',
      'oauthCodes',
      'oauthConsents',
      'oauthTokens',
      'plannedWorkouts',
      'recommendations',
      'reports',
      'reportTemplates',
      'scoreTrendExplanations',
      'sessions',
      'shareTokens',
      'sportSettings',
      'supportMessages',
      'bugReports',
      'notifications',
      'syncQueue',
      'trainingAvailability',
      'trainingPlans',
      'weeklyTrainingPlans',
      'wellness',
      'workouts',
      'metricHistory',
      'bodyMeasurementEntries',
      'personalBests',
      'journeyEvents',
      'nutritionSettings',
      'nutritionRecommendations',
      'nutritionPlans'
    ]
    for (const relation of relations) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete copy[relation]
    }
    return copy
  }

  private async importProfileRelations(tx: any, universe: any) {
    const { profile } = universe
    if (profile.nutritionSettings)
      await tx.userNutritionSettings.create({ data: profile.nutritionSettings })
    if (profile.emailPreferences) {
      for (const pref of profile.emailPreferences) {
        await tx.emailPreference.create({ data: pref })
      }
    }
    if (profile.trainingAvailability) {
      for (const avail of profile.trainingAvailability) {
        await tx.trainingAvailability.create({ data: avail })
      }
    }
    if (profile.sportSettings) {
      for (const sport of profile.sportSettings) {
        await tx.sportSettings.create({ data: sport })
      }
    }
  }

  private async importGoals(tx: any, universe: any) {
    if (universe.plans?.goals) {
      for (const goal of universe.plans.goals) {
        await tx.goal.create({ data: goal })
      }
    }
  }

  private async importIntegrations(tx: any, universe: any) {
    if (universe.system?.integrations) {
      for (const integration of universe.system.integrations) {
        await tx.integration.create({ data: integration })
      }
    }
  }

  private async importChatRooms(tx: any, universe: any) {
    if (universe.ai?.rooms) {
      for (const room of universe.ai.rooms) {
        const { messages, turns, users, ...roomData } = room
        await tx.chatRoom.create({ data: roomData })

        // Add user as participant
        await tx.chatParticipant.create({
          data: { userId: universe.profile.id, roomId: room.id }
        })

        // Import Turns and Messages
        if (turns) {
          for (const turn of turns) {
            const { events, toolExecutions, ...turnData } = turn
            await tx.chatTurn.create({ data: turnData })
            if (events) {
              for (const event of events) await tx.chatTurnEvent.create({ data: event })
            }
            if (toolExecutions) {
              for (const exec of toolExecutions)
                await tx.chatTurnToolExecution.create({ data: exec })
            }
          }
        }

        if (messages) {
          for (const msg of messages) {
            await tx.chatMessage.create({ data: msg })
          }
        }
      }
    }
  }

  private async importTrainingPlans(tx: any, universe: any) {
    if (universe.plans?.trainingPlans) {
      for (const plan of universe.plans.trainingPlans) {
        const { blocks, ...planData } = plan
        await tx.trainingPlan.create({ data: this.stripRelations(planData) })
        if (blocks) {
          for (const block of blocks) {
            const { weeks, ...blockData } = block
            await tx.trainingBlock.create({ data: this.stripRelations(blockData) })
            if (weeks) {
              for (const week of weeks) {
                await tx.trainingWeek.create({ data: this.stripRelations(week) })
              }
            }
          }
        }
      }
    }
    if (universe.plans?.weeklyTrainingPlans) {
      for (const plan of universe.plans.weeklyTrainingPlans) {
        await tx.weeklyTrainingPlan.create({ data: plan })
      }
    }
  }

  private async importWellness(tx: any, universe: any) {
    if (universe.health?.wellness) {
      for (const w of universe.health.wellness) await tx.wellness.create({ data: w })
    }
    if (universe.health?.dailyMetrics) {
      for (const m of universe.health.dailyMetrics) await tx.dailyMetric.create({ data: m })
    }
    if (universe.health?.dailyCheckins) {
      for (const c of universe.health.dailyCheckins) await tx.dailyCheckin.create({ data: c })
    }
    if (universe.health?.bodyMeasurementEntries) {
      for (const b of universe.health.bodyMeasurementEntries)
        await tx.bodyMeasurementEntry.create({ data: b })
    }
    if (universe.health?.journeyEvents) {
      for (const j of universe.health.journeyEvents)
        await tx.athleteJourneyEvent.create({ data: j })
    }
  }

  private async importNutrition(tx: any, universe: any) {
    if (universe.nutrition?.nutrition) {
      for (const n of universe.nutrition.nutrition) await tx.nutrition.create({ data: n })
    }
    if (universe.nutrition?.nutritionPlans) {
      for (const p of universe.nutrition.nutritionPlans) {
        const { meals, ...planData } = p
        await tx.nutritionPlan.create({ data: planData })
        if (meals) {
          for (const m of meals) await tx.nutritionPlanMeal.create({ data: m })
        }
      }
    }
  }

  private async importEvents(tx: any, universe: any) {
    if (universe.plans?.events) {
      for (const event of universe.plans.events) await tx.event.create({ data: event })
    }
  }

  private async importPlannedWorkouts(tx: any, universe: any) {
    if (universe.activities?.plannedWorkouts) {
      for (const pw of universe.activities.plannedWorkouts) {
        const { publishTargets, ...pwData } = pw
        await tx.plannedWorkout.create({ data: pwData })
        if (publishTargets) {
          for (const t of publishTargets) await tx.plannedWorkoutPublishTarget.create({ data: t })
        }
      }
    }
  }

  private async importWorkouts(tx: any, universe: any) {
    if (universe.activities?.workouts) {
      for (const w of universe.activities.workouts) {
        const { exercises, streams, planAdherence, ...workoutData } = w
        await tx.workout.create({ data: this.stripRelations(workoutData) })

        if (streams) await tx.workoutStream.create({ data: streams })
        if (planAdherence) await tx.planAdherence.create({ data: planAdherence })

        if (exercises) {
          for (const ex of exercises) {
            const { sets, ...exData } = ex
            await tx.workoutExercise.create({ data: exData })
            if (sets) {
              for (const s of sets) await tx.workoutSet.create({ data: s })
            }
          }
        }
      }
    }

    // Blobs
    if (universe.activities?.fitFiles) {
      for (const f of universe.activities.fitFiles) await tx.fitFile.create({ data: f })
    }
  }

  private async importAIOutputs(tx: any, universe: any) {
    const { ai } = universe
    if (ai?.recommendations) {
      for (const r of ai.recommendations) await tx.recommendation.create({ data: r })
    }
    if (ai?.activityRecommendations) {
      for (const ar of ai.activityRecommendations)
        await tx.activityRecommendation.create({ data: ar })
    }
    if (ai?.reports) {
      for (const report of ai.reports) await tx.report.create({ data: report })
    }
    if (ai?.llmUsage) {
      for (const usage of ai.llmUsage) await tx.llmUsage.create({ data: usage })
    }
  }
}
