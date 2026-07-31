import { PrismaClient } from '@prisma/client'
import { attachStreamsToWorkouts } from '../repositories/workoutStreamRepository'

/**
 * UserUniverseCollector:
 * Gathers all data records for a single user from the database.
 * This is used for both CLI-based prod-to-local migration and
 * user-facing GDPR-compliant exports.
 */
export class UserUniverseCollector {
  constructor(
    private prisma: any,
    private userId: string
  ) {}

  exportSections() {
    return [
      {
        key: 'metadata',
        collect: async () => ({
          userId: this.userId,
          exportedAt: new Date().toISOString(),
          version: '1.0.0'
        })
      },
      { key: 'profile', collect: () => this.collectProfile() },
      { key: 'plans', collect: () => this.collectPlans() },
      { key: 'activities', collect: () => this.collectActivities() },
      { key: 'health', collect: () => this.collectHealth() },
      { key: 'nutrition', collect: () => this.collectNutrition() },
      { key: 'ai', collect: () => this.collectAI() },
      { key: 'system', collect: () => this.collectSystem() }
    ]
  }

  /**
   * Bundles the entire user universe into a structured object.
   */
  async bundle() {
    const bundle: Record<string, unknown> = {}

    for (const section of this.exportSections()) {
      bundle[section.key] = await section.collect()
    }

    return bundle
  }

  async collectProfile() {
    const user = await this.prisma.user.findUnique({
      where: { id: this.userId },
      include: {
        nutritionSettings: true,
        emailPreferences: true,
        trainingAvailability: true,
        sportSettings: true
      }
    })
    return user
  }

  async collectPlans() {
    return {
      goals: await this.prisma.goal.findMany({ where: { userId: this.userId } }),
      events: await this.prisma.event.findMany({ where: { userId: this.userId } }),
      trainingPlans: await this.prisma.trainingPlan.findMany({
        where: { userId: this.userId },
        include: {
          blocks: {
            include: {
              weeks: true
            }
          }
        }
      }),
      weeklyTrainingPlans: await this.prisma.weeklyTrainingPlan.findMany({
        where: { userId: this.userId }
      })
    }
  }

  async collectActivities() {
    const workouts = await this.prisma.workout.findMany({
      where: { userId: this.userId },
      include: {
        exercises: {
          include: {
            sets: true
          }
        },
        planAdherence: true
      }
    })

    // This is a full-fidelity GDPR/migration export, so we deliberately keep
    // the default (no `fields` option) full-column fetch here -- every stream
    // column, including the JSON blobs, must round-trip intact. The CW-224
    // slow-query fix still applies via findManyByWorkoutIds' internal
    // chunking of large IN(...) clauses.
    const workoutsWithStreams = await attachStreamsToWorkouts(workouts)

    const fitFiles = await this.prisma.fitFile.findMany({
      where: { userId: this.userId }
    })

    const plannedWorkouts = await this.prisma.plannedWorkout.findMany({
      where: { userId: this.userId },
      include: {
        publishTargets: true
      }
    })

    const metricHistory = await this.prisma.metricHistory.findMany({
      where: { userId: this.userId }
    })

    const personalBests = await this.prisma.personalBest.findMany({
      where: { userId: this.userId }
    })

    return {
      workouts: workoutsWithStreams,
      fitFiles,
      plannedWorkouts,
      metricHistory,
      personalBests
    }
  }

  async collectHealth() {
    return {
      wellness: await this.prisma.wellness.findMany({ where: { userId: this.userId } }),
      dailyMetrics: await this.prisma.dailyMetric.findMany({ where: { userId: this.userId } }),
      dailyCheckins: await this.prisma.dailyCheckin.findMany({ where: { userId: this.userId } }),
      bodyMeasurementEntries: await this.prisma.bodyMeasurementEntry.findMany({
        where: { userId: this.userId }
      }),
      journeyEvents: await this.prisma.athleteJourneyEvent.findMany({
        where: { userId: this.userId }
      })
    }
  }

  async collectNutrition() {
    return {
      nutrition: await this.prisma.nutrition.findMany({ where: { userId: this.userId } }),
      nutritionPlans: await this.prisma.nutritionPlan.findMany({
        where: { userId: this.userId },
        include: {
          meals: true
        }
      }),
      nutritionRecommendations: await this.prisma.nutritionRecommendation.findMany({
        where: { userId: this.userId }
      })
    }
  }

  async collectAI() {
    // Collect rooms the user is in
    const participants = await this.prisma.chatParticipant.findMany({
      where: { userId: this.userId },
      include: {
        room: {
          include: {
            messages: true,
            turns: {
              include: {
                events: true,
                toolExecutions: true
              }
            }
          }
        }
      }
    })

    const recommendations = await this.prisma.recommendation.findMany({
      where: { userId: this.userId }
    })

    const activityRecommendations = await this.prisma.activityRecommendation.findMany({
      where: { userId: this.userId }
    })

    const reports = await this.prisma.report.findMany({
      where: { userId: this.userId }
    })

    const scoreTrendExplanations = await this.prisma.scoreTrendExplanation.findMany({
      where: { userId: this.userId }
    })

    const llmUsage = await this.prisma.llmUsage.findMany({
      where: { userId: this.userId }
    })

    return {
      rooms: participants.map((p: any) => p.room),
      recommendations,
      activityRecommendations,
      reports,
      scoreTrendExplanations,
      llmUsage
    }
  }

  async collectSystem() {
    return {
      integrations: await this.prisma.integration.findMany({ where: { userId: this.userId } }),
      shareTokens: await this.prisma.shareToken.findMany({ where: { userId: this.userId } }),
      notifications: await this.prisma.userNotification.findMany({
        where: { userId: this.userId }
      }),
      syncQueue: await this.prisma.syncQueue.findMany({ where: { userId: this.userId } }),
      auditLogs: await this.prisma.auditLog.findMany({ where: { userId: this.userId } })
    }
  }
}
