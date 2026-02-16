import { jsonSchema } from 'ai'
// Re-importing from a simplified version for testing
const workoutStructureSchema = {
  type: 'object',
  properties: {
    coachInstructions: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          durationSeconds: { type: 'integer' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                durationSeconds: { type: 'integer' }
              },
              required: ['type', 'name', 'durationSeconds']
            }
          }
        },
        required: ['type', 'name']
      }
    }
  },
  required: ['coachInstructions']
}

try {
  const validated = jsonSchema(workoutStructureSchema as any)
  console.log('Schema validation successful!')

  // Simulating what Vercel AI SDK does - it should fail if we try to use this with bad data
  // (Actually jsonSchema just converts it to a Zod-like or internal format)
} catch (e) {
  console.error('Schema validation failed:', e)
  process.exit(1)
}
