# Coach Watts CLI

This CLI provides a set of tools for development, debugging, and maintenance of the Coach Watts application. It is designed to be modular and easy to extend.

## Installation

The CLI uses `tsx` to run TypeScript files directly. Ensure dependencies are installed:

```bash
pnpm install
```

## Usage

You can run the CLI using `tsx`:

```bash
npx tsx cli/index.ts [command] [options]
```

Or add an alias to your shell configuration for easier access:

```bash
alias coach="npx tsx $(pwd)/cli/index.ts"
```

Then you can run:

```bash
coach --help
```

## Commands

### Database (`db`)

Database management commands.

- **Backup Database:**
  ```bash
  npx tsx cli/index.ts db backup
  ```
  Options:
  - `-c, --container <name>`: Docker container name (default: `watts-postgres`)
  - `-o, --output <dir>`: Backup output directory (default: `./backups`)
  - `-f, --format <format>`: Backup format: `plain`, `custom`, `directory`, `tar` (default: `custom`)

### Check (`check`)

System and configuration validation commands.

- **Check Database Schema:**
  ```bash
  npx tsx cli/index.ts check db-schema
  ```
  Verifies that critical tables and columns exist in the database.

### Debug (`debug`)

Troubleshooting and debugging commands.

- **Debug Auth Logic:**

  ```bash
  pnpm cw:cli debug auth-logic
  ```

  Checks environment variables and database records related to authentication, including the bypass user.

- **Troubleshoot Workouts:**

  ```bash
  pnpm cw:cli debug workout [url] [options]
  ```

  Compares ingested workout records against their stored `rawJson` data to identify discrepancies.

  Arguments:
  - `[url]`: Optional URL of the workout (e.g., from `coachwatts.com`). Automatically sets `--prod` and extracts the workout ID.

  Options:
  - `--prod`: Use production database (requires `DATABASE_URL_PROD` in `.env`).
  - `--user <email>`: Filter by user email.
  - `--id <id>`: Filter by workout ID.
  - `--date <YYYY-MM-DD>`: Filter by workout date.
  - `--source <source>`: Filter by source (default: `intervals`).
  - `-v, --verbose`: Show comparison for all fields, even matching ones.

- **Inspect Chat Rooms Quickly:**

  ```bash
  pnpm cw:cli debug chatroom
  pnpm cw:cli debug chatroom <roomId>
  pnpm cw:cli debug chatroom --turn <turnId> --prod
  ```

  Summarizes the latest or selected chat room with recent turns, messages, tool executions, turn events, and built-in findings for missing tool calls, fallback replies, approval-flow gaps, and heartbeat timeouts.

### Import (`import`)

Direct long-running imports that bypass Trigger.dev.

- **Import Intervals.icu data for a user:**

  ```bash
  pnpm cw:cli import intervals <userId-or-email> --prod
  ```

  Options:
  - `--start-date <YYYY-MM-DD>`: Explicit import start date.
  - `--end-date <YYYY-MM-DD>`: Explicit import end date. Defaults to 30 days in the future.
  - `--years <number>`: Historical lookback when `--start-date` is omitted (default: `10`).
  - `--skip-planned`: Skip planned workouts/events/notes import.
  - `--skip-activities`: Skip activity import.
  - `--skip-wellness`: Skip wellness import.

### Trigger (`trigger`)

Trigger.dev management commands.

- **List Runs:**

  ```bash
  npx tsx cli/index.ts trigger list
  ```

  Lists the latest trigger runs.

  Options:
  - `--prod`: Use production environment (requires `TRIGGER_PROD_SECRET_KEY` in `.env`).
  - `-l, --limit <number>`: Number of runs to show (default: 20).
  - `--status <status>`: Filter by status (e.g., `COMPLETED`, `FAILED`).

- **Get Run Details:**

  ```bash
  npx tsx cli/index.ts trigger get <runId>
  ```

  Gets detailed information about a specific run.

  Options:
  - `--prod`: Use production environment.

## Development & Maintenance

### Philosophy

We prefer **extending this CLI** over creating one-off scripts for troubleshooting and maintenance tasks. This ensures:

1.  **Reusability**: Tools are documented, discoverable, and reusable by the entire team.
2.  **Consistency**: Shared utilities (like database connections and logging) are used consistently.
3.  **Maintenance**: It's easier to maintain a structured CLI than a folder full of disparate scripts.

### How to Extend

1.  **Identify the Category**: Decide if your tool is for `db` (database ops), `check` (validation), or `debug` (troubleshooting).
2.  **Create Command**: Add a new file in the corresponding directory (e.g., `cli/debug/my-tool.ts`).
3.  **Register**: Import and add your command in the category's `index.ts`.
4.  **Document**: Update this README with the new command details.

### Workflow

When faced with a new troubleshooting task:

1.  Check if an existing CLI command can be extended (e.g., adding a flag to `debug workout`).
2.  If not, create a new CLI command instead of a standalone script in `scripts/`.
3.  Use the `pnpm cw:cli` script for execution.

## Adding New Commands

1.  Create a new command file in the appropriate subdirectory (e.g., `cli/debug/my-command.ts`).
2.  Define the command using `commander`.
3.  Export the command instance.
4.  Import and register the command in the subdirectory's `index.ts`.

Example `cli/debug/my-command.ts`:

```typescript
import { Command } from 'commander'

const myCommand = new Command('my-command')

myCommand.description('Does something useful').action(() => {
  console.log('Hello from my command!')
})

export default myCommand
```

Useful production troubleshooting example:

```bash
pnpm cw:cli debug form <user-id-or-email> --prod
```
