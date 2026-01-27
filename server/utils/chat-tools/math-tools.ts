/**
 * Perform a mathematical calculation
 */
export async function performCalculation(args: any): Promise<any> {
  const { expression } = args

  if (!expression) {
    return { error: 'Expression is required' }
  }

  try {
    // Basic sanitization: only allow numbers, basic operators, parens, decimal points, spaces
    // and standard Math functions.
    // We strictly limit characters to prevent code injection.
    const allowedChars = /^[0-9+\-*/^().\s%Math\w,]+$/
    if (!allowedChars.test(expression)) {
      return {
        error:
          'Invalid characters in expression. Only basic math operators (+, -, *, /, ^, %, ()) and standard Math functions are allowed.'
      }
    }

    // Normalize power operator ^ to ** if user uses it (common in chat)
    const safeExpression = expression.replace(/\^/g, '**')

    // Execute safely
    const result = new Function(`
      const { abs, acos, asin, atan, atan2, ceil, cos, exp, floor, log, log10, max, min, pow, random, round, sign, sin, sqrt, tan, trunc, PI, E } = Math;
      return (${safeExpression});
    `)()

    // Handle NaN or Infinity
    if (typeof result === 'number' && !isFinite(result)) {
      return {
        expression,
        result: result.toString(),
        note: 'Result is not a finite number'
      }
    }

    return {
      expression,
      result
    }
  } catch (error: any) {
    return {
      error: 'Failed to evaluate expression',
      message: error.message
    }
  }
}
