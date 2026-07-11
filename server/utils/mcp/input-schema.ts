import { fromJsonSchema } from '@modelcontextprotocol/server'
import { zodToJsonSchema } from 'zod-to-json-schema'

function isZodV4Schema(schema: unknown): schema is { _zod: unknown } {
  return typeof schema === 'object' && schema !== null && '_zod' in schema
}

export function toMcpInputSchema(schema: unknown) {
  if (!schema) return undefined
  if (isZodV4Schema(schema)) return schema

  const jsonSchema = zodToJsonSchema(schema as Parameters<typeof zodToJsonSchema>[0], {
    target: 'jsonSchema7'
  })
  delete jsonSchema.$schema

  return fromJsonSchema(jsonSchema as Parameters<typeof fromJsonSchema>[0])
}
