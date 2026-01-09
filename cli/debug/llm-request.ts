import { Command } from 'commander'
import { prisma } from '../../server/utils/db'

const llmRequestCommand = new Command('llm-request')
  .description('Inspect LLM usage request details')
  .argument('<id>', 'LlmUsage ID')
  .action(async (id: string) => {
    try {
      const record = await prisma.llmUsage.findUnique({
        where: { id }
      })

      if (!record) {
        console.error(`LlmUsage record with ID ${id} not found.`)
        return
      }

      console.log('--- LlmUsage Record ---')
      console.log(`ID: ${record.id}`)
      console.log(`Operation: ${record.operation}`)
      console.log(`Model: ${record.model}`)
      console.log(`Success: ${record.success}`)
      console.log('-----------------------')
      console.log('--- Prompt Full ---')
      console.log(record.promptFull)
      console.log('-----------------------')
      console.log('--- Response Full ---')
      console.log(record.responseFull)
      console.log('-----------------------')
    } catch (error) {
      console.error('Error fetching LlmUsage record:', error)
    } finally {
      await prisma.$disconnect()
    }
  })

export default llmRequestCommand
