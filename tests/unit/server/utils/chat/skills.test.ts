import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyChatSkills,
  composeSkillInstructions,
  getDirectTimeQuestionSkillSelection,
  looksLikeDirectTimeQuestion,
  selectToolsForSkills
} from '../../../../../server/utils/chat/skills'

const generateObjectMock = vi.fn()
const llmUsageCreateMock = vi.fn().mockResolvedValue(null)

vi.mock('ai', () => ({
  generateObject: (...args: any[]) => generateObjectMock(...args)
}))

vi.mock('../../../../../server/utils/db', () => ({
  prisma: {
    llmUsage: {
      create: (...args: any[]) => llmUsageCreateMock(...args)
    }
  }
}))

describe('CW-193: direct time questions must not silently drop to a tool-less reply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('looksLikeDirectTimeQuestion', () => {
    it.each([
      'What time is it?',
      "what's the time?",
      'What time is it for me?',
      'current time please',
      'Do you know what time it is?',
      'Hány óra van?'
    ])('detects "%s" as a direct time question', (text) => {
      expect(looksLikeDirectTimeQuestion(text)).toBe(true)
    })

    it.each([
      '',
      'How was my ride yesterday?',
      'What time should I do my workout today?',
      'What time is my next planned session?'
    ])('does not treat "%s" as a direct time question', (text) => {
      expect(looksLikeDirectTimeQuestion(text)).toBe(false)
    })
  })

  describe('getDirectTimeQuestionSkillSelection', () => {
    it('forces tool-enabled general_chat for a direct time question', () => {
      const selection = getDirectTimeQuestionSkillSelection([
        { role: 'user', content: 'What time is it right now?' }
      ])

      expect(selection).toMatchObject({
        skillIds: ['general_chat'],
        useTools: true,
        usedFallback: false
      })
    })

    it('returns null when the latest message is not a direct time question', () => {
      const selection = getDirectTimeQuestionSkillSelection([
        { role: 'user', content: 'How many calories did I burn on my last ride?' }
      ])

      expect(selection).toBeNull()
    })
  })

  describe('classifyChatSkills', () => {
    it('short-circuits the LLM router for a direct time question', async () => {
      const selection = await classifyChatSkills({
        userId: 'user-1',
        turnId: 'turn-time-1',
        messages: [{ role: 'user', content: 'What time is it for me?' }]
      })

      expect(selection).toMatchObject({
        skillIds: ['general_chat'],
        useTools: true,
        usedFallback: false
      })
      expect(generateObjectMock).not.toHaveBeenCalled()
    })
  })

  describe('selectToolsForSkills', () => {
    it('includes get_current_time for a tool-enabled general_chat selection', () => {
      const tools = selectToolsForSkills(
        {
          get_current_time: { name: 'get_current_time' },
          ticket_create: { name: 'ticket_create' }
        },
        ['general_chat'],
        { useTools: true }
      )

      expect(Object.keys(tools)).toEqual(['get_current_time'])
    })

    it('still returns no tools for a plain (non-forced) general_chat turn', () => {
      const tools = selectToolsForSkills(
        {
          get_current_time: { name: 'get_current_time' }
        },
        ['general_chat'],
        { useTools: false }
      )

      expect(tools).toEqual({})
    })
  })

  describe('composeSkillInstructions', () => {
    it('instructs the model to use get_current_time instead of inferring a time', () => {
      const instructions = composeSkillInstructions('Base instruction.', ['general_chat'], {
        useTools: true
      })

      expect(instructions).toContain('get_current_time')
      expect(instructions).toContain('local_formatted')
      expect(instructions).toMatch(/do not infer|never assume UTC/i)
    })

    it('omits the time-tool instruction for a plain general_chat turn', () => {
      const instructions = composeSkillInstructions('Base instruction.', ['general_chat'], {
        useTools: false
      })

      expect(instructions).not.toContain('Time Tool Usage')
    })
  })
})
