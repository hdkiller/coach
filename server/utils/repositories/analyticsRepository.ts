import { prisma } from '../db'
import { Prisma } from '@prisma/client'

export interface AnalyticsQueryOptions {
  source: 'workouts' | 'wellness' | 'nutrition'
  scope: {
    target: 'self' | 'athlete' | 'athlete_group' | 'team'
    targetId?: string
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

    // Determine table and core grouping logic
    // For now, focusing on SQL-based aggregation for performance
    
    const results = await this.executeAggregatedQuery(userId, userIds, options)
    return this.formatChartData(results, options)
  },

  async resolveTargetUserIds(requestingUserId: string, scope: AnalyticsQueryOptions['scope']): Promise<string[]> {
    if (scope.target === 'self') return [requestingUserId]
    
    // TODO: Verify permissions for other scopes
    // Use teamRepository to check access
    
    if (scope.target === 'athlete' && scope.targetId) {
      return [scope.targetId]
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
      workouts: new Set(['durationSec', 'tss', 'averageWatts', 'averageHr', 'distance', 'calories']),
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
      nutrition: new Set()
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
              : 'WORKOUT'
      },
      select: { fieldKey: true }
    })
    const allowedCustomFields = new Set(customFields.map((field) => field.fieldKey))

    const metricClauses = options.metrics.map((metric, index) => {
      const aggregationMap: Record<AnalyticsQueryOptions['metrics'][number]['aggregation'], string> = {
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
    const labels = results.map(r => new Date(r.bucket).toISOString().split('T')[0])
    
    const datasets = options.metrics.map((m, i) => {
      return {
        label: `${m.field} (${m.aggregation})`,
        data: results.map(r => Number(r[`metric_${i}`]) || 0)
      }
    })

    return {
      labels,
      datasets
    }
  }
}
