import { prisma } from '../db'
import { Prisma } from '@prisma/client'

export interface AnalyticsQueryOptions {
  source: 'workouts' | 'wellness' | 'nutrition'
  scope: {
    target: 'self' | 'athlete' | 'athletes' | 'athlete_group' | 'team'
    targetId?: string
    targetIds?: string[]
  }
  timeRange: {
    startDate: Date
    endDate: Date
  }
  grouping: 'daily' | 'weekly' | 'monthly'
  metrics: Array<{
    field: string
    aggregation: 'sum' | 'avg' | 'max' | 'min' | 'count'
  }>
  filters?: Array<{
    field: string
    operator: 'equals' | 'in' | 'gt' | 'lt'
    value: any
  }>
}

export const analyticsRepository = {
  async query(userId: string, options: AnalyticsQueryOptions) {
    const userIds = await this.resolveTargetUserIds(userId, options.scope)

    if (userIds.length === 0) {
      return { labels: [], datasets: [] }
    }

    if (options.scope.target === 'athletes' && userIds.length > 1) {
      return await this.queryAthleteComparison(userId, userIds, options)
    }

    const results = await this.executeAggregatedQuery(userId, userIds, options)
    return this.formatChartData(results, options)
  },

  async resolveTargetUserIds(
    requestingUserId: string,
    scope: AnalyticsQueryOptions['scope']
  ): Promise<string[]> {
    if (scope.target === 'self') return [requestingUserId]

    // TODO: Verify permissions for other scopes
    // Use teamRepository to check access

    if (scope.target === 'athlete' && scope.targetId) {
      return [scope.targetId]
    }

    if (scope.target === 'athletes' && scope.targetIds?.length) {
      return Array.from(new Set(scope.targetIds))
    }

    if (scope.target === 'athlete_group' && scope.targetId) {
      const group = await (prisma as any).athleteGroup.findUnique({
        where: { id: scope.targetId },
        include: { members: true }
      })
      return group?.members.map((m: any) => m.athleteId) || []
    }

    if (scope.target === 'team' && scope.targetId) {
      const members = await (prisma as any).teamMember.findMany({
        where: { teamId: scope.targetId, role: 'ATHLETE' }
      })
      return members.map((m: any) => m.userId)
    }

    return []
  },

  async queryAthleteComparison(
    requestingUserId: string,
    userIds: string[],
    options: AnalyticsQueryOptions
  ) {
    const [users, seriesResults] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      }),
      Promise.all(
        userIds.map(async (targetUserId) => ({
          userId: targetUserId,
          results: await this.executeAggregatedQuery(requestingUserId, [targetUserId], options)
        }))
      )
    ])

    const labels = Array.from(
      new Set(
        seriesResults.flatMap((entry) =>
          entry.results.map((row: any) => new Date(row.bucket).toISOString().split('T')[0])
        )
      )
    ).sort()

    const namesById = new Map(
      users.map((user) => [user.id, user.name || user.email || 'Unknown athlete'])
    )

    const datasets = seriesResults.flatMap((entry) => {
      const valuesByLabel = new Map(
        entry.results.map((row: any) => [new Date(row.bucket).toISOString().split('T')[0], row])
      )
      const athleteLabel = namesById.get(entry.userId) || 'Unknown athlete'

      return options.metrics.map((metric, metricIndex) => ({
        label:
          options.metrics.length === 1
            ? athleteLabel
            : `${athleteLabel} · ${this.getMetricLabel(metric.field, metric.aggregation)}`,
        data: labels.map(
          (label) => Number(valuesByLabel.get(label)?.[`metric_${metricIndex}`]) || 0
        )
      }))
    })

    return { labels, datasets }
  },

  async executeAggregatedQuery(
    requestingUserId: string,
    userIds: string[],
    options: AnalyticsQueryOptions
  ) {
    const tableName =
      options.source === 'workouts'
        ? 'Workout'
        : options.source === 'wellness'
          ? 'Wellness'
          : 'Nutrition'
    const dateField = 'date'
    const interval =
      options.grouping === 'daily' ? 'day' : options.grouping === 'weekly' ? 'week' : 'month'

    const standardFieldsBySource: Record<AnalyticsQueryOptions['source'], Set<string>> = {
      workouts: new Set([
        'durationSec',
        'tss',
        'averageWatts',
        'averageHr',
        'distanceMeters',
        'intensity',
        'calories'
      ]),
      wellness: new Set([
        'hrv',
        'restingHr',
        'sleepHours',
        'sleepScore',
        'weight',
        'ctl',
        'atl',
        'tsb',
        'recoveryScore'
      ]),
      nutrition: new Set([
        'calories',
        'protein',
        'carbs',
        'fat',
        'fiber',
        'sugar',
        'caloriesGoal',
        'proteinGoal',
        'carbsGoal',
        'fatGoal',
        'waterMl',
        'overallScore',
        'macroBalanceScore',
        'qualityScore',
        'adherenceScore',
        'hydrationScore',
        'startingGlycogenPercentage',
        'startingFluidDeficit',
        'endingGlycogenPercentage',
        'endingFluidDeficit'
      ])
    }

    const customFields = await prisma.customFieldDefinition.findMany({
      where: {
        ownerId: requestingUserId,
        dataType: 'NUMBER',
        entityType:
          options.source === 'workouts'
            ? 'WORKOUT'
            : options.source === 'wellness'
              ? 'WELLNESS'
              : 'NUTRITION'
      },
      select: { fieldKey: true }
    })
    const allowedCustomFields = new Set(customFields.map((field) => field.fieldKey))

    const metricClauses = options.metrics.map((metric, index) => {
      const aggregationMap: Record<
        AnalyticsQueryOptions['metrics'][number]['aggregation'],
        string
      > = {
        sum: 'SUM',
        avg: 'AVG',
        max: 'MAX',
        min: 'MIN',
        count: 'COUNT'
      }
      const aggregation = aggregationMap[metric.aggregation]
      let expression: Prisma.Sql

      if (metric.field.startsWith('custom.')) {
        const fieldKey = metric.field.slice('custom.'.length)
        if (!allowedCustomFields.has(fieldKey)) {
          throw createError({
            statusCode: 400,
            statusMessage: `Unsupported custom metric: ${metric.field}`
          })
        }

        expression = Prisma.sql`NULLIF("customMetrics"->>${fieldKey}, '')::double precision`
      } else {
        if (!standardFieldsBySource[options.source].has(metric.field)) {
          throw createError({
            statusCode: 400,
            statusMessage: `Unsupported metric field: ${metric.field}`
          })
        }

        expression = Prisma.raw(`"${metric.field}"`)
      }

      return Prisma.sql`${Prisma.raw(aggregation)}(${expression}) AS ${Prisma.raw(`metric_${index}`)}`
    })

    const dateFieldSql = Prisma.raw(`"${dateField}"`)
    const tableNameSql = Prisma.raw(`"${tableName}"`)
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"userId" IN (${Prisma.join(userIds)})`,
      Prisma.sql`${dateFieldSql} >= ${options.timeRange.startDate}`,
      Prisma.sql`${dateFieldSql} <= ${options.timeRange.endDate}`
    ]

    if (options.source === 'workouts') {
      conditions.push(Prisma.sql`"isDuplicate" = false`)
    }

    const metricListSql = metricClauses.reduce<Prisma.Sql>(
      (acc, clause, index) => (index === 0 ? clause : Prisma.sql`${acc}, ${clause}`),
      Prisma.empty
    )
    const whereClauseSql = conditions.reduce<Prisma.Sql>(
      (acc, clause, index) => (index === 0 ? clause : Prisma.sql`${acc} AND ${clause}`),
      Prisma.empty
    )

    return await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          date_trunc(${interval}, ${dateFieldSql}) AS bucket,
          ${metricListSql}
        FROM ${tableNameSql}
        WHERE ${whereClauseSql}
        GROUP BY 1
        ORDER BY 1 ASC
      `
    )
  },

  formatChartData(results: any[], options: AnalyticsQueryOptions) {
    const labels = results.map((r) => new Date(r.bucket).toISOString().split('T')[0])

    const datasets = options.metrics.map((m, i) => {
      return {
        label: `${m.field} (${m.aggregation})`,
        data: results.map((r) => Number(r[`metric_${i}`]) || 0)
      }
    })

    return {
      labels,
      datasets
    }
  },

  getMetricLabel(
    field: string,
    aggregation: AnalyticsQueryOptions['metrics'][number]['aggregation']
  ) {
    if (field.startsWith('custom.')) {
      return field.slice('custom.'.length)
    }

    return `${field} (${aggregation})`
  }
}
