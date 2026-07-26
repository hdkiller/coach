import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateStructuredAnalysis, loadFlatFileMock } from '../../../../server/utils/gemini'

describe('Flat-File LLM Mocking Engine', () => {
  const originalEnv = process.env.MOCK_LLM_RESPONSES

  afterEach(() => {
    process.env.MOCK_LLM_RESPONSES = originalEnv
  })

  it('loads specific operation fixture from tests/fixtures/llm-mocks/*.json', () => {
    const mockData = loadFlatFileMock('workout_analysis')
    expect(mockData).toBeDefined()
    expect(mockData.title).toBe('Mocked Endurance Ride Analysis')
    expect(mockData.scores.overall).toBe(8)
  })

  it('loads activity_recommendation fixture correctly', () => {
    const mockData = loadFlatFileMock('activity_recommendation')
    expect(mockData).toBeDefined()
    expect(mockData.recommendation).toBe('proceed')
    expect(mockData.readiness_summary.readiness_score).toBe(88)
  })

  it('falls back to default_structured.json when operation fixture is not found', () => {
    const mockData = loadFlatFileMock('non_existent_op')
    expect(mockData).toBeDefined()
    expect(mockData.title).toBe('Default Mocked Structured Response')
  })

  it('intercepts generateStructuredAnalysis when MOCK_LLM_RESPONSES=true', async () => {
    process.env.MOCK_LLM_RESPONSES = 'true'

    const result = await generateStructuredAnalysis<any>('Sample prompt for test', {}, 'flash', {
      operation: 'workout_analysis'
    })

    expect(result).toBeDefined()
    expect(result.title).toBe('Mocked Endurance Ride Analysis')
    expect(result.scores.overall).toBe(8)
  })
})
