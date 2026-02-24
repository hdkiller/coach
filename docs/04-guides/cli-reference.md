# Coach Watts CLI Reference

The Coach Watts project provides two primary CLI tools for development, debugging, and operational tasks: `cw:cli` for general administration and `cw:worker` for background process management.

## Philosophy

- **Centralization**: All utility scripts are integrated into the CLI to prevent "script sprawl."
- **Consistency**: The CLI uses the same environment variables, database connections, and utilities as the main application.
- **Discoverability**: Commands are self-documenting via `--help`.
- **Production Safety**: Destructive or production-facing commands typically require an explicit `--prod` flag.

---

## 🚀 `cw:cli` - General Administration

The `cw:cli` command is the main entry point for most administrative and debugging tasks.

### Basic Usage

```bash
pnpm cw:cli <command> [subcommand] [options]
```

### Core Command Groups

#### 1. Database (`db`)

Manage database operations, backups, and schema diagnostics.

- `backup`: Create a database backup.
- `compare`: Check for schema drift between development and production.
- `migrate-zones`: Migrate user heart rate/power zones.
- `seed`: Seed the database with initial or test data.
- `sql`: Execute raw SQL queries directly from the CLI.
- `workout`: Database operations specifically for workout data maintenance.

#### 2. Users (`users`)

Manage user accounts, statistics, and quotas.

- `search <query> [--prod]`: Search for users by email, name, or ID.
- `stats`: View registration and activity statistics.
- `admins`: Manage administrative user status.
- `location`: Manage user countries based on last login IP.
- `quota`: View or manage user AI/API usage quotas.
- `reset-quota`: Reset usage quotas for specific users.

#### 3. Trigger.dev (`trigger`)

Monitor and manually trigger background tasks.

- `list [--limit <n>] [--status <status>] [--prod]`: List recent background job runs.
- `get <runId> [--prod]`: View detailed status and logs for a specific run.
- `checkin <email> [--prod]`: Manually trigger the daily check-in generation for a user.
- `workout`: Trigger workout-related analysis tasks.

#### 4. Backfill & Data Integrity (`backfill`)

A large collection of specialized scripts for fixing data issues, migrating schemas, and performing bulk updates.

- `metrics`, `tss`, `kilojoules`: Recalculate training metrics.
- `planned-workouts`, `workouts`: Fix or update workout records.
- `intervals-parsing`, `max-watts`: Fix specific data parsing errors.
- `profile`, `wellness-oura`: Sync or fix user profile/wellness data.
- `chat-rooms`: Maintain or migrate chat room data.

#### 5. Nutrition & Metabolism (`nutrition`)

Deep debugging and analysis of nutrition data and metabolic calculations.

- `day-log`: View nutrition logs for a specific day.
- `metabolic`: Analyze BMR, TDEE, and carb targets.
- `fueling-workout`: Analyze fueling plans for specific workouts.
- `compare-fueling`: Compare planned vs. actual fueling.

#### 6. Debugging & Health (`debug`, `check`, `monitor`)

- `debug env`: Verify environment variables (masked).
- `debug ping`: Test external URL connectivity.
- `check env`: Validates the local `.env` setup.
- `monitor [--prod]`: Checks the `/api/health` and Trigger.dev status endpoints.

#### 7. Integrations (`oura`, `polar`, `oauth`)

- `oura`: Manage Oura integration settings and data sync.
- `polar`: Manage Polar integration settings and data sync.
- `oauth`: Manage OAuth 2.0 Provider and client registrations.

---

## 🛠️ `cw:worker` - Webhook Worker

The worker CLI manages the background process that listens to incoming webhooks (e.g., from Strava, Intervals.icu, Oura).

### Commands

- `start`: Starts the webhook listener process.
- `status`: Displays the current state of the processing queues (pending, active, completed jobs).
- `ping [--count <n>] [--concurrency <c>]`: Adds test jobs to the queue to verify the worker is active.

---

## 🛠️ Extending the CLI

To add a new command group:

1.  Create a new directory in `cli/`.
2.  Add an `index.ts` to export a `commander` `Command`.
3.  Register the group in `cli/index.ts`.

### Example Structure

```
cli/
├── my-group/
│   ├── index.ts      # Define 'my-group' command
│   ├── sub-task.ts   # Define 'my-group sub-task'
└── index.ts          # Register my-group
```

## Best Practices

1. **Always verify with `--help`**: Commands evolve quickly.
2. **Use `--prod` with caution**: Most commands that can modify data will default to development unless `--prod` is passed.
3. **Piping**: CLI output is designed to be greppable.
4. **Maintenance**: **IMPORTANT**: Maintain this document whenever updating the CLI or discovering issues/new commands. It is referenced in `GEMINI.md` and `RULES.md`.
