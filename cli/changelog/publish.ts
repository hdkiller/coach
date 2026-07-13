import { Command } from 'commander'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import 'dotenv/config'

export const publishCommand = new Command('publish')
  .description('Publish changelog to Discord')
  .option('-f, --file <file>', 'Changelog file to publish', 'USER_CHANGELOG.md')
  .option('-t, --type <type>', 'Type of changelog (announcements|technical)', 'announcements')
  .option('-d, --dry-run', 'Simulate publication without sending to Discord')
  .action(async (options) => {
    console.log(chalk.blue('=== Publishing Changelog to Discord ==='))

    const projectRoot = process.cwd()
    const filePath = path.resolve(projectRoot, options.file)
    const type = options.type.toLowerCase()

    if (!['announcements', 'technical'].includes(type)) {
      console.error(
        chalk.red(`Error: Invalid type '${type}'. Must be 'announcements' or 'technical'.`)
      )
      process.exit(1)
    }

    // 1. Resolve Webhook URL
    const webhookUrl =
      type === 'announcements'
        ? process.env.DISCORD_WEBHOOK_ANNOUNCEMENTS || ''
        : process.env.DISCORD_WEBHOOK_TECHNICAL || ''

    if (!webhookUrl && !options.dryRun) {
      console.error(
        chalk.red(`Error: Discord webhook URL for '${type}' not found in environment variables.`)
      )
      console.error(
        chalk.yellow(`Please set DISCORD_WEBHOOK_${type.toUpperCase()} in your .env file.`)
      )
      process.exit(1)
    }

    // 2. Read File
    if (!fs.existsSync(filePath)) {
      console.error(chalk.red(`Error: File '${options.file}' not found.`))
      process.exit(1)
    }

    let content = fs.readFileSync(filePath, 'utf-8')

    // Check if we need to extract the latest release
    // If we detect multiple top-level headers (# ...), we assume it's a cumulative changelog
    // and we only want the first section.
    const lines = content.split('\n')
    let firstHeaderIndex = -1
    let secondHeaderIndex = -1
    let currentReleaseLevel = 0

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#+)\s+(.*)/)
      if (match) {
        const level = match[1].length
        const text = match[2].trim().toLowerCase()

        // Skip generic "Changelog" title if it's the first header
        if (firstHeaderIndex === -1 && text === 'changelog' && level === 1) {
          continue
        }

        if (firstHeaderIndex === -1) {
          firstHeaderIndex = i
          // Determine the level of the first header
          // We look for the next header that is the SAME level OR HIGHER (fewer #s)
          // e.g. If current is ## (level 2), we stop at ## (level 2) or # (level 1)
          // This handles cases where mixed header levels are used for releases.
          currentReleaseLevel = level
        } else if (level <= currentReleaseLevel) {
          secondHeaderIndex = i
          break
        }
      }
    }

    if (firstHeaderIndex !== -1 && secondHeaderIndex !== -1) {
      console.log(
        chalk.yellow(
          'Detected multiple release headers. Extracting only the latest release for publication...'
        )
      )
      content = lines.slice(firstHeaderIndex, secondHeaderIndex).join('\n')
    }

    // Trim content
    content = content.trim()

    if (!content) {
      console.error(chalk.red('Error: Changelog file is empty.'))
      process.exit(1)
    }

    console.log(chalk.gray(`Reading from: ${filePath}`))
    console.log(chalk.gray(`Type: ${type}`))
    console.log(chalk.gray(`Content length: ${content.length} characters`))

    if (options.dryRun) {
      console.log(chalk.yellow('Dry run enabled. Skipping network request.'))
      console.log(chalk.gray('--- Payload Preview ---'))
      console.log(content)
      return
    }

    // 3. Send to Discord
    // Discord limits message size to 2000 chars. Split content into chunks.
    const chunks: string[] = []
    let remainingContent = content
    const MAX_LENGTH = 1900

    while (remainingContent.length > 0) {
      if (remainingContent.length <= MAX_LENGTH) {
        chunks.push(remainingContent)
        break
      }

      // Find a good place to split (newline or space)
      let splitIndex = remainingContent.lastIndexOf('\n', MAX_LENGTH)
      if (splitIndex <= 0) {
        splitIndex = remainingContent.lastIndexOf(' ', MAX_LENGTH)
      }
      if (splitIndex <= 0) {
        splitIndex = MAX_LENGTH
      }

      chunks.push(remainingContent.substring(0, splitIndex))
      remainingContent = remainingContent.substring(splitIndex).trim()
    }

    try {
      for (const [index, chunk] of chunks.entries()) {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: chunk
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(
            `Discord API returned ${response.status}: ${response.statusText} - ${errorText}`
          )
        }

        console.log(
          chalk.green(
            `✓ Successfully published chunk ${index + 1}/${chunks.length} to Discord (${type} channel)`
          )
        )

        if (index < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }
    } catch (error) {
      console.error(chalk.red('Error sending to Discord:'), error)
      process.exit(1)
    }
  })
