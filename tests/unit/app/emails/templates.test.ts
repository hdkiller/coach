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
      workoutTitle: 'Threshold Intervals',
      overallScore: 8,
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
})
