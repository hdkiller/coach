import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyChatSkills,
  composeSkillInstructions,
  expandSkillSelectionForRequest,
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

  describe('CW-199: multilingual direct time questions', () => {
    it.each([
      ['German', 'Wie spät ist es?'],
      ['Spanish', '¿Qué hora es?'],
      ['French', 'Quelle heure est-il?'],
      ['Hungarian', 'Hány óra van?']
    ])('detects the %s phrasing "%s" as a direct time question', (_language, text) => {
      expect(looksLikeDirectTimeQuestion(text)).toBe(true)
    })

    it.each(['what time is my next session?', 'what time should I ride tomorrow?'])(
      'still does not treat the planning-flavored question "%s" as a direct time question',
      (text) => {
        expect(looksLikeDirectTimeQuestion(text)).toBe(false)
      }
    )
  })

  describe('CW-199: compound messages with an independent time-question clause', () => {
    it('detects a direct time question even when followed by a workout-domain clause', () => {
      expect(looksLikeDirectTimeQuestion('What time is it? Should I ride now?')).toBe(true)
    })

    it('detects a direct time question even when preceded by a workout-domain clause', () => {
      expect(looksLikeDirectTimeQuestion('Should I ride now? What time is it?')).toBe(true)
    })

    it('still excludes a single clause that mixes a time word with a domain word', () => {
      expect(looksLikeDirectTimeQuestion('What time should I ride tomorrow?')).toBe(false)
    })

    it('excludes a single clause that literally matches a time pattern but also names a domain word', () => {
      // Unlike the two cases above (which never match DIRECT_TIME_QUESTION_PATTERNS regardless
      // of the domain exclusion), this clause DOES match "what time is it" verbatim, so it only
      // gets excluded if NON_TIME_DOMAIN_PATTERN is still being checked per-clause after the
      // clause-splitting change. This is the case the split-by-clause fix could most plausibly
      // have broken by widening the exclusion's scope in the wrong direction.
      expect(looksLikeDirectTimeQuestion('What time is it for my ride?')).toBe(false)
    })

    it('detects a direct time question when the compound clauses are joined by a comma instead of a full stop', () => {
      expect(looksLikeDirectTimeQuestion('What time is it, and should I ride now?')).toBe(true)
    })

    it('detects a direct time question when the compound clauses are joined by a dash instead of a full stop', () => {
      expect(looksLikeDirectTimeQuestion('What time is it - should I ride now?')).toBe(true)
    })

    it('does not treat a mid-word hyphen as a clause break', () => {
      expect(looksLikeDirectTimeQuestion('I did a 5k trail-run today')).toBe(false)
    })

    it('forces the tool-enabled selection for the compound time question via getDirectTimeQuestionSkillSelection', () => {
      const selection = getDirectTimeQuestionSkillSelection([
        { role: 'user', content: 'What time is it? Should I ride now?' }
      ])

      expect(selection).toMatchObject({
        skillIds: ['general_chat'],
        useTools: true,
        usedFallback: false
      })
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

  /**
   * Testing classify/select/compose in isolation is not enough: turn-executor.ts
   * pipes the router result through expandSkillSelectionForRequest before tools
   * are selected, and that step used to strip general_chat and empty the
   * selection, silently reducing this fix to a no-op. These tests run the full
   * chain in the same order as server/utils/chat/turn-executor.ts.
   */
  describe('full turn-executor chain (classify -> expand -> select -> compose)', () => {
    const runChain = async (content: string) => {
      const routed = await classifyChatSkills({
        userId: 'user-1',
        turnId: 'turn-chain',
        messages: [{ role: 'user', content }]
      })
      const selection = expandSkillSelectionForRequest(routed, content)
      const tools = selectToolsForSkills(
        {
          get_current_time: { name: 'get_current_time' },
          ticket_create: { name: 'ticket_create' }
        },
        selection.skillIds,
        { useTools: selection.useTools }
      )
      const instructions = composeSkillInstructions('Base instruction.', selection.skillIds, {
        useTools: selection.useTools
      })

      return { selection, tools, instructions }
    }

    it('still exposes get_current_time and the time instruction after expansion', async () => {
      const { selection, tools, instructions } = await runChain('What time is it for me?')

      expect(selection.skillIds).toEqual(['general_chat'])
      expect(selection.useTools).toBe(true)
      expect(Object.keys(tools)).toContain('get_current_time')
      expect(instructions).toContain('Time Tool Usage')
      expect(instructions).toContain('local_formatted')
    })

    it('does not leave the selection empty, which would hand the model zero tools', async () => {
      const { selection, tools } = await runChain('What time is it?')

      expect(selection.skillIds.length).toBeGreaterThan(0)
      expect(Object.keys(tools).length).toBeGreaterThan(0)
    })
  })
})

describe('expandSkillSelectionForRequest', () => {
  it('preserves a deliberate tool-enabled general_chat selection', () => {
    const selection = expandSkillSelectionForRequest(
      {
        skillIds: ['general_chat'],
        confidence: 1,
        useTools: true,
        extractMemories: false
      },
      'What time is it?'
    )

    expect(selection.skillIds).toEqual(['general_chat'])
    expect(selection.useTools).toBe(true)
  })

  it('still adds read-only companion domains for a mixed-intent write request', () => {
    const selection = expandSkillSelectionForRequest(
      {
        skillIds: ['workout_update'],
        confidence: 0.9,
        useTools: true,
        extractMemories: false
      },
      'Update the notes on my ride from yesterday'
    )

    expect(selection.skillIds).toContain('workout_update')
    expect(selection.skillIds).toContain('workout_read')
  })
})
