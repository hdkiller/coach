import { getServerSession } from '#auth'
import type { PMCMetrics } from '../../utils/training-stress'
import {
  calculatePMCForDateRange,
  getInitialPMCValues,
  getCurrentFitnessSummary,
  getFormStatus
} from '../../utils/training-stress'

export default defineEventHandler(async (event) => {
  const session = await getServerSession(event)
  
  if (!session?.user) {
    throw createError({ 
      statusCode: 401,
      message: 'Unauthorized' 
    })
  }
  
  const query = getQuery(event)
  const days = parseInt(query.days as string) || 90
  const userId = (session.user as any).id
  
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  // Get initial CTL/ATL values from before the date range
  const initialValues = await getInitialPMCValues(userId, startDate)
  
  // Calculate PMC for date range
  const metrics = await calculatePMCForDateRange(
    startDate,
    endDate,
    userId,
    initialValues.ctl,
    initialValues.atl
  )
  
  // Get current fitness summary
  const summary = await getCurrentFitnessSummary(userId)
  
  // Format data for chart
  const data = metrics.map((m: PMCMetrics) => ({
    date: m.date.toISOString(),
    ctl: m.ctl,
    atl: m.atl,
    tsb: m.tsb,
    tss: m.tss
  }))
  
  return {
    data,
    summary: {
      currentCTL: summary.ctl,
      currentATL: summary.atl,
      currentTSB: summary.tsb,
      formStatus: summary.formStatus.status,
      formColor: summary.formStatus.color,
      formDescription: summary.formStatus.description,
      lastUpdated: summary.lastUpdated
    }
  }
})