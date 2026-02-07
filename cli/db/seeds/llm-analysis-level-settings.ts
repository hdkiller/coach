import { prisma } from '../../../server/utils/db'

export const seed = async () => {
  console.log('Seeding LLM Analysis Level Settings...')

  const settings = [
    {
      level: 'flash',
      model: 'flash',
      modelId: 'gemini-flash-latest',
      thinkingBudget: 2000,
      thinkingLevel: 'minimal',
      maxSteps: 3
    },
    {
      level: 'pro',
      model: 'pro',
      modelId: 'gemini-3-pro-preview',
      thinkingBudget: 8000,
      thinkingLevel: 'low',
      maxSteps: 10
    },
    {
      level: 'experimental',
      model: 'pro',
      modelId: 'gemini-3-pro-preview',
      thinkingBudget: 16000,
      thinkingLevel: 'high',
      maxSteps: 20
    }
  ]

  for (const setting of settings) {
    const existing = await prisma.llmAnalysisLevelSettings.findUnique({
      where: { level: setting.level }
    })

    if (existing) {
      console.log(`  Skipping ${setting.level} settings (already exists)`)
      continue
    }

    await prisma.llmAnalysisLevelSettings.create({
      data: setting
    })
    console.log(`  Created ${setting.level} settings`)
  }

  console.log('LLM Analysis Level Settings seeded successfully.')
}
