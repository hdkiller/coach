import { prisma } from '../db'
import { athleteMetricsService } from '../athleteMetricsService'
import { sportSettingsRepository } from './sportSettingsRepository'
import { getCurrentFitnessSummary } from '../training-stress'

function normalizeReadinessScore(
  readiness: number | null | undefined,
  recoveryScore: number | null | undefined
) {
  if (typeof readiness === 'number' && Number.isFinite(readiness)) {
    if (readiness > 10) return Math.max(0, Math.min(100, readiness))
    return Math.max(0, Math.min(100, readiness * 10))
  }

  if (typeof recoveryScore === 'number' && Number.isFinite(recoveryScore)) {
    return Math.max(0, Math.min(100, recoveryScore))
  }

  return null
}

function getReadinessStatus(score: number | null) {
  if (score === null) return 'Unknown'
  if (score >= 80) return 'High'
  if (score >= 60) return 'Moderate'
  if (score >= 40) return 'Strained'
  return 'Low'
}

export const coachingRepository = {
  // --- Relationship Management ---

  async getAthletesForCoach(coachId: string) {
    const relationships = await (prisma as any).coachingRelationship.findMany({
      where: { coachId, status: 'ACTIVE' },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            currentFitnessScore: true,
            profileLastUpdated: true,
            recommendations: {
              orderBy: { generatedAt: 'desc' },
              take: 1
            },
            // Fetch latest wellness for current CTL/ATL/TSB
            wellness: {
              orderBy: { date: 'desc' },
              take: 1
            },
            // Fetch upcoming planned workouts
            plannedWorkouts: {
              where: {
                date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                category: 'WORKOUT'
              },
              orderBy: { date: 'asc' },
              take: 2
            },
            // Fetch next major event
            events: {
              where: {
                date: { gte: new Date() },
                priority: 'A'
              },
              orderBy: { date: 'asc' },
              take: 1
            }
          }
        }
      }
    })

    // For each athlete, we need some aggregated data that's hard to do in one query efficiently
    // We'll fetch 7-day adherence and 30-day trend in parallel for all athletes
    const enrichedAthletes = await Promise.all(
      relationships.map(async (rel: any) => {
        const athleteId = rel.athlete.id
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        thirtyDaysAgo.setHours(0, 0, 0, 0)

        const latestWellness = rel.athlete.wellness?.[0] ?? null

        const [completedPlanned, recentPlanned, wellnessHistory, performanceSummary] =
          await Promise.all([
            prisma.plannedWorkout.count({
              where: {
                userId: athleteId,
                date: { gte: sevenDaysAgo, lte: new Date() },
                category: 'WORKOUT',
                completed: true
              }
            }),
            prisma.plannedWorkout.count({
              where: {
                userId: athleteId,
                date: { gte: sevenDaysAgo, lte: new Date() },
                category: 'WORKOUT'
              }
            }),
            prisma.wellness.findMany({
              where: { userId: athleteId, date: { gte: thirtyDaysAgo } },
              orderBy: { date: 'asc' },
              select: { date: true, ctl: true, atl: true }
            }),
            getCurrentFitnessSummary(athleteId, undefined, {
              adjustForTodayUncompletedPlannedTSS: true
            })
          ])

        const readinessScore = normalizeReadinessScore(
          latestWellness?.readiness,
          latestWellness?.recoveryScore
        )

        return {
          ...rel,
          athlete: {
            id: rel.athlete.id,
            name: rel.athlete.name,
            email: rel.athlete.email,
            image: rel.athlete.image,
            currentFitnessScore: rel.athlete.currentFitnessScore,
            profileLastUpdated: rel.athlete.profileLastUpdated,
            performanceSummary: {
              currentCTL: performanceSummary.ctl,
              currentATL: performanceSummary.atl,
              currentTSB: performanceSummary.tsb,
              formStatus: performanceSummary.formStatus.status,
              formColor: performanceSummary.formStatus.color,
              formDescription: performanceSummary.formStatus.description,
              lastUpdated: performanceSummary.lastUpdated
            },
            readinessSummary: {
              score: readinessScore,
              status: getReadinessStatus(readinessScore),
              date: latestWellness?.date ?? null
            },
            stats: {
              adherence7d:
                recentPlanned > 0 ? Math.round((completedPlanned / recentPlanned) * 100) : 100,
              completedCount: completedPlanned,
              plannedCount: recentPlanned,
              wellnessHistory // For sparkline
            }
          }
        }
      })
    )

    return enrichedAthletes
  },

  async getEnrichedAthleteForCoach(coachId: string, athleteId: string) {
    const relationship = await (prisma as any).coachingRelationship.findFirst({
      where: {
        coachId,
        athleteId,
        status: 'ACTIVE'
      },
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            currentFitnessScore: true,
            profileLastUpdated: true,
            recommendations: {
              orderBy: { generatedAt: 'desc' },
              take: 1
            },
            wellness: {
              select: {
                id: true,
                date: true,
                ctl: true,
                atl: true,
                readiness: true,
                recoveryScore: true,
                sleepScore: true,
                hrv: true,
                restingHr: true,
                weight: true
              },
              orderBy: { date: 'desc' },
              take: 30
            },
            plannedWorkouts: {
              where: {
                date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                category: 'WORKOUT'
              },
              orderBy: { date: 'asc' },
              take: 5
            },
            events: {
              where: {
                date: { gte: new Date() }
              },
              orderBy: { date: 'asc' },
              take: 3
            },
            workouts: {
              where: {
                isDuplicate: false
              },
              orderBy: { date: 'desc' },
              take: 8,
              select: {
                id: true,
                date: true,
                title: true,
                type: true,
                durationSec: true,
                tss: true,
                overallScore: true,
                plannedWorkoutId: true
              }
            }
          }
        }
      }
    })

    if (!relationship) return null

    const athlete = relationship.athlete
    const athleteIdStr = athlete.id
    const latestWellness = athlete.wellness[0] ?? null
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Add stats similar to the dashboard card
    const [
      completedPlanned,
      recentPlanned,
      overduePlanned,
      performanceSummary,
      zones,
      defaultSport
    ] = await Promise.all([
      prisma.plannedWorkout.count({
        where: {
          userId: athleteIdStr,
          date: { gte: sevenDaysAgo, lte: new Date() },
          category: 'WORKOUT',
          completed: true
        }
      }),
      prisma.plannedWorkout.count({
        where: {
          userId: athleteIdStr,
          date: { gte: sevenDaysAgo, lte: new Date() },
          category: 'WORKOUT'
        }
      }),
      prisma.plannedWorkout.count({
        where: {
          userId: athleteIdStr,
          date: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
          category: 'WORKOUT',
          completed: false
        }
      }),
      getCurrentFitnessSummary(athleteIdStr, undefined, {
        adjustForTodayUncompletedPlannedTSS: true
      }),
      athleteMetricsService.getCurrentZones(athleteIdStr),
      sportSettingsRepository.getDefault(athleteIdStr)
    ])

    const readinessScore = normalizeReadinessScore(
      latestWellness?.readiness,
      latestWellness?.recoveryScore
    )

    return {
      ...athlete,
      performanceSummary: {
        currentCTL: performanceSummary.ctl,
        currentATL: performanceSummary.atl,
        currentTSB: performanceSummary.tsb,
        formStatus: performanceSummary.formStatus.status,
        formColor: performanceSummary.formStatus.color,
        formDescription: performanceSummary.formStatus.description,
        lastUpdated: performanceSummary.lastUpdated
      },
      readinessSummary: {
        score: readinessScore,
        status: getReadinessStatus(readinessScore),
        date: latestWellness?.date ?? null,
        sleepScore: latestWellness?.sleepScore ?? null,
        hrv: latestWellness?.hrv ?? null,
        restingHr: latestWellness?.restingHr ?? null,
        weight: latestWellness?.weight ?? null
      },
      zones,
      zoneSummary: {
        ftp: defaultSport?.ftp ?? null,
        lthr: defaultSport?.lthr ?? null,
        maxHr: defaultSport?.maxHr ?? null
      },
      stats: {
        adherence7d: recentPlanned > 0 ? Math.round((completedPlanned / recentPlanned) * 100) : 100,
        completedCount: completedPlanned,
        plannedCount: recentPlanned,
        overduePlannedCount: overduePlanned
      }
    }
  },

  async getCoachesForAthlete(athleteId: string) {
    return (prisma as any).coachingRelationship.findMany({
      where: { athleteId, status: 'ACTIVE' },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })
  },

  async checkRelationship(coachId: string, athleteId: string) {
    const relationship = await (prisma as any).coachingRelationship.findFirst({
      where: {
        coachId,
        athleteId,
        status: 'ACTIVE'
      }
    })
    return !!relationship
  },

  async removeRelationship(coachId: string, athleteId: string) {
    return (prisma as any).coachingRelationship.deleteMany({
      where: {
        coachId,
        athleteId
      }
    })
  },

  // --- Invitation Management ---

  async createInvite(athleteId: string) {
    // Expire any old pending invites for this athlete
    await (prisma as any).coachingInvite.updateMany({
      where: { athleteId, status: 'PENDING' },
      data: { status: 'EXPIRED' }
    })

    // Generate a simple 6-char code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    return (prisma as any).coachingInvite.create({
      data: {
        athleteId,
        code,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'PENDING'
      }
    })
  },

  async getActiveInvite(athleteId: string) {
    return (prisma as any).coachingInvite.findFirst({
      where: {
        athleteId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    })
  },

  async connectAthleteWithCode(coachId: string, code: string) {
    const invite = await (prisma as any).coachingInvite.findUnique({
      where: { code }
    })

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new Error('Invalid or expired invite code')
    }

    if (invite.athleteId === coachId) {
      throw new Error('You cannot coach yourself')
    }

    // Create the relationship and mark invite as used
    return await prisma.$transaction(async (tx) => {
      const relationship = await (tx as any).coachingRelationship.upsert({
        where: {
          coachId_athleteId: {
            coachId,
            athleteId: invite.athleteId
          }
        },
        update: { status: 'ACTIVE' },
        create: {
          coachId,
          athleteId: invite.athleteId,
          status: 'ACTIVE'
        }
      })

      await (tx as any).coachingInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', usedBy: coachId }
      })

      return relationship
    })
  }
}
