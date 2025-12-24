
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';
import { generateCoachAnalysis } from '../../server/utils/gemini';

const changelogCommand = new Command('changelog');

changelogCommand
  .description('Generate user-friendly changelog using Gemini')
  .option('-i, --input <file>', 'Input changelog file', 'CHANGELOG.md')
  .option('-o, --output <file>', 'Output file', 'USER_CHANGELOG.md')
  .option('-w, --write', 'Write to output file instead of stdout', false)
  .action(async (options) => {
    console.log(chalk.blue('=== Generating User Changelog ==='));

    const projectRoot = process.cwd();
    const inputFile = path.resolve(projectRoot, options.input);
    const outputFile = path.resolve(projectRoot, options.output);

    if (!fs.existsSync(inputFile)) {
      console.error(chalk.red(`Error: Input file '${options.input}' not found.`));
      process.exit(1);
    }

    const content = fs.readFileSync(inputFile, 'utf-8');

    // Extract the latest version block
    // Assuming format:
    // ## [version] (date)
    // ... content ...
    // ## [previous version] ...
    
    const lines = content.split('\n');
    let latestVersionBlock = '';
    let foundFirstHeader = false;

    for (const line of lines) {
      if (line.match(/^##\s+\[\d+\.\d+\.\d+\]/)) {
        if (foundFirstHeader) {
          break; // Stop when we hit the second header
        }
        foundFirstHeader = true;
      }
      
      if (foundFirstHeader) {
        latestVersionBlock += line + '\n';
      }
    }

    if (!latestVersionBlock.trim()) {
      console.error(chalk.red('Error: Could not find latest version in changelog.'));
      process.exit(1);
    }

    console.log(chalk.gray('Found latest version block. Generating summary...'));

    const prompt = `
You are a helpful assistant for Coach Watts, a cycling coaching app.
Here is the technical changelog for the latest release:

${latestVersionBlock}

Please rewrite this into a friendly, non-technical announcement for our users (athletes and coaches).
Focus on the value and benefits of the changes.
Group them logically if needed (e.g., "New Features", "Improvements", "Fixes").
Use emojis where appropriate.
Keep it concise but exciting.
Format as Markdown.
    `;

    try {
      const userChangelog = await generateCoachAnalysis(prompt, 'flash');

      if (options.write) {
        let existingContent = '';
        if (fs.existsSync(outputFile)) {
          existingContent = fs.readFileSync(outputFile, 'utf-8');
        }
        
        const newContent = userChangelog + '\n\n' + existingContent;
        fs.writeFileSync(outputFile, newContent);
        console.log(chalk.green(`✓ Successfully wrote to ${options.output}`));
      } else {
        console.log(chalk.green('\n--- User Friendly Changelog ---\n'));
        console.log(userChangelog);
        console.log(chalk.green('\n-------------------------------\n'));
      }

    } catch (error) {
      console.error(chalk.red('Error generating changelog with Gemini:'), error);
      process.exit(1);
    }
  });

export default changelogCommand;
