import { tool } from 'ai'
import { z } from 'zod'
import { performCalculation } from '../chat-tools/math-tools'

export const mathTools = () => ({
  perform_calculation: tool({
    description:
      'Evaluate a general mathematical expression. Use this for ad-hoc calculations that do not fit into specific training metric tools (e.g. "what is 30% of 2500", "5 * 12"). Supported operators: +, -, *, /, ^, %, (). Supported functions: sqrt, abs, round, floor, ceil, sin, cos, tan, log, etc.',
    inputSchema: z.object({
      expression: z
        .string()
        .describe(
          'The mathematical expression to evaluate (e.g., "300 * 0.2", "sqrt(144)", "(5+3)/2")'
        )
    }),
    execute: async ({ expression }) => {
      // Reuse the safe calculation logic we implemented for the other tool system
      return await performCalculation({ expression })
    }
  })
})
