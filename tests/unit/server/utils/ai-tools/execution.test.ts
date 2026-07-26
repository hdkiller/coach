import { describe, it, expect } from 'vitest'
import { mathTools } from '../../../../../server/utils/ai-tools/math'

describe('AI Tools Execution Suite', () => {
  it('executes perform_calculation tool with mathematical expressions', async () => {
    const tools = mathTools()
    const result = await (tools.perform_calculation as any).execute(
      { expression: '(150 + 50) / 2' },
      { toolCallId: 'call_math_1', messages: [] }
    )

    expect(result).toMatchObject({
      expression: '(150 + 50) / 2',
      result: 100
    })
  })
})
