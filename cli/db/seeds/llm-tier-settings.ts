import { prisma } from '../../../server/utils/db'

export const seed = async () => {
  console.log('Seeding LLM Tier Settings...')

  const settings = [
    {
      tier: 'FREE',
      model: 'flash',
      thinkingBudget: 2000,
      thinkingLevel: 'minimal',
      maxSteps: 3
    },
    {
      tier: 'SUPPORTER',
      model: 'flash',
      thinkingBudget: 4000,
      thinkingLevel: 'low',
      maxSteps: 5
    },
    {
      tier: 'PRO',
      model: 'pro',
      thinkingBudget: 8000,
      thinkingLevel: 'medium',
      maxSteps: 10
    },
    {
      tier: 'CONTRIBUTOR',
      model: 'pro',
      thinkingBudget: 16000,
      thinkingLevel: 'high',
      maxSteps: 15
    }
  ]

  for (const setting of settings) {
    const existing = await prisma.llmTierSettings.findUnique({
      where: { tier: setting.tier }
    })

    if (existing) {
      console.log(`  Skipping ${setting.tier} settings (already exists)`)
      continue
    }

    await prisma.llmTierSettings.create({
      data: setting
    })
    console.log(`  Created ${setting.tier} settings`)
  }

  console.log('LLM Tier Settings seeded successfully.')
}
