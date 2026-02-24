import { describe, expect, it } from 'vitest'
import { config } from '@vue-email/compiler'
import { resolve } from 'path'

const emailDir = resolve(process.cwd(), 'app/emails')
const vueEmail = config(emailDir)

async function render(templateFileName: string, props: Record<string, unknown>) {
  return vueEmail.render(templateFileName, { props })
}

describe('email templates', () => {
  it('Welcome snapshot + unsubscribe footer', async () => {
    const result = await render('Welcome.vue', {
      name: 'Alex Athlete',
      unsubscribeUrl: 'https://coachwatts.com/unsubscribe?token=test'
    })

    expect(result.html).toMatchSnapshot()
    expect(result.html).toContain('manage your email preferences')
    expect(result.html).toContain('https://coachwatts.com/unsubscribe?token=test')
  })

  it('WorkoutAnalysisReady snapshot + unsubscribe footer', async () => {
    const result = await render('WorkoutAnalysisReady.vue', {
      name: 'Alex Athlete',
      workoutId: 'workout-1',
      workoutTitle: 'Threshold Intervals',
      overallScore: 8,
      analysisSummary: 'Solid pacing with one late fade.',
      recommendationHighlights: ['Start first interval 10W lower', 'Fuel earlier in warmup'],
      adherenceSummary: 'You stayed close to planned duration and intensity.',
      adherenceScore: 86,
      unsubscribeUrl: 'https://coachwatts.com/unsubscribe?token=test'
    })

    expect(result.html).toMatchSnapshot()
    expect(result.html).toContain('manage your email preferences')
  })

  it('DailyRecommendation snapshot + unsubscribe footer', async () => {
    const result = await render('DailyRecommendation.vue', {
      name: 'Alex Athlete',
      date: 'Saturday, Feb 21',
      recommendation: 'PROCEED',
      reasoning: 'Great readiness and stable fatigue.',
      unsubscribeUrl: 'https://coachwatts.com/unsubscribe?token=test'
    })

    expect(result.html).toMatchSnapshot()
    expect(result.html).toContain('manage your email preferences')
  })

  it('SubscriptionStarted snapshot + unsubscribe footer', async () => {
    const result = await render('SubscriptionStarted.vue', {
      name: 'Alex Athlete',
      tier: 'PRO',
      unsubscribeUrl: 'https://coachwatts.com/unsubscribe?token=test'
    })

    expect(result.html).toMatchSnapshot()
    expect(result.html).toContain('manage your email preferences')
  })

  it('WorkoutReceived snapshot + unsubscribe footer', async () => {
    const result = await render('WorkoutReceived.vue', {
      name: 'Alex Athlete',
      workoutId: 'workout-1',
      workoutTitle: 'Progression Run',
      previewLine:
        'Progression Run is synced. Open for insights, load context, and sport-specific cues.',
      heroTitle: 'Workout synced and momentum building.',
      introLine: 'Solid work today. Progression Run is now on your timeline and ready to review.',
      workoutDate: 'Saturday, Feb 21',
      workoutType: 'Run',
      durationMinutes: 48,
      distanceKm: 10.2,
      elevationGain: 132,
      averageHr: 154,
      maxHr: 172,
      averageCadence: 168,
      averageWatts: 245,
      normalizedPower: 258,
      tss: 62,
      tss7d: 238,
      weeklyTssBaseline28d: 212,
      loadContextLabel: 'Progressive Week',
      loadContextBody:
        'You are training above your recent baseline in a productive range that supports progression.',
      loadDeltaPct: 12,
      sportLensLabel: 'Run Lens',
      sportLensBody:
        'Average HR was about 91% of LTHR, a steady effort that builds durable race fitness.',
      kilojoules: 690,
      calories: 740,
      workoutsLast7Days: 3,
      consistencyMessage: 'That is 3 sessions in the last 7 days. Strong consistency momentum.',
      quickTakeLabel: 'Productive',
      quickTakeBody:
        'This load is in a productive range and supports fitness gains without excessive strain.',
      efficiencyMessage:
        'Efficiency signal: you produced strong power while keeping heart rate controlled.',
      ctaLabel: 'View Full Analysis & Splits',
      nextStepMessage: 'See how this session impacted your Fitness vs Fatigue trend.',
      workoutUrl: 'https://coachwatts.com/workouts/workout-1',
      unsubscribeUrl: 'https://coachwatts.com/unsubscribe?token=test'
    })

    expect(result.html).toMatchSnapshot()
    expect(result.html).toContain('manage your email preferences')
  })

  it('WorkoutReceived supports ride cadence unit rendering', async () => {
    const result = await render('WorkoutReceived.vue', {
      name: 'Alex Athlete',
      workoutId: 'workout-ride-1',
      workoutTitle: 'Sweet Spot Ride',
      workoutDate: 'Sunday, Feb 22',
      workoutType: 'Ride',
      durationMinutes: 75,
      distanceKm: 39.6,
      averageCadence: 92,
      cadenceUnit: 'rpm',
      averageHr: 146,
      averageWatts: 228,
      tss: 88,
      workoutUrl: 'https://coachwatts.com/workouts/workout-ride-1',
      unsubscribeUrl: 'https://coachwatts.com/unsubscribe?token=test'
    })

    expect(result.html).toContain('Avg Cadence:</strong> 92 rpm')
    expect(result.html).not.toContain('Avg Cadence:</strong> 92 spm')
  })
})
