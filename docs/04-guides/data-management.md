# Data Management Guide

This guide covers the "User Universe" data portability system, used for GDPR compliance, data backups, and synchronizing user state between production and local development environments.

## Overview

The system centers around the **User Universe**, a complete snapshot of a user's data including:

- **Profile & Settings:** Bio, HR/Power zones, nutrition targets, and preferences.
- **Training Stack:** Goals, events, training plans, and scheduled workouts.
- **Activity History:** Completed workouts, raw `.fit` files, and high-frequency streams (Watts, HR, GPS).
- **Health & Wellness:** HRV, sleep logs, daily metrics, and check-ins.
- **AI Context:** Full chat history, AI-generated reports, and recommendations.

---

## Developer Workflow: Prod-to-Local Sync

The most powerful use case for this system is "teleporting" a production user's state to a local development instance for debugging or testing.

### 1. Prerequisites

Ensure you have an API Key for your production account. You can generate or find this in your production user settings.

### 2. Pull Data from Production

Use the `api-pull` command to fetch your production data via the API. This is useful when you don't have direct database access. Using the `.gz` extension is highly recommended for speed and storage efficiency.

```bash
# Set your production API key
export COACHWATTS_API_KEY="your_production_api_key"

# Pull data (defaults to https://coachwatts.com)
npx tsx cli/index.ts users data api-pull --output ./backups/prod_state.json.gz
```

_The package will be saved and automatically compressed to the specified path._

### 3. Import to Local Environment

Inject the downloaded package into your local Postgres database. The tool automatically detects and decompresses `.gz` files.

```bash
# Use the --clear flag to wipe the existing local user with that email
npx tsx cli/index.ts users data import ./backups/prod_state.json.gz --clear
```

#### Importing to a New Local Account

If you want to keep your existing local account and import production data as a _separate_ user:

```bash
npx tsx cli/index.ts users data import ./backups/prod_state.json.gz --email dev-tester@coachwatts.local
```

### 4. Safety & Sanitization

The import process automatically **sanitizes** sensitive production data:

- **Billing:** `stripeCustomerId` and `stripeSubscriptionId` are cleared to prevent accidental local billing.
- **Integrations:** `accessToken` and `refreshToken` for Strava, Oura, etc., are redacted. You will need to re-authenticate integrations locally if you wish to sync new data.
- **Identity:** Original UUIDs are preserved by default, ensuring all internal relations remain intact.

---

## User Feature: Self-Service Export

Regular users can download their data directly from the application for portability or compliance (GDPR).

### How to Export

1. Log in to the application.
2. Navigate to **Settings > Danger Zone**.
3. Under **Data Portability**, click **Export My Data (.json)**.
4. Your browser will download a single JSON file containing your entire history.

---

## CLI Reference: `cw:cli users data`

| Command    | Arguments | Options                       | Description                                              |
| :--------- | :-------- | :---------------------------- | :------------------------------------------------------- |
| `export`   | `<id>`    | `--prod`, `--output`          | Direct DB export to a local file. Supports `.gz`.        |
| `api-pull` |           | `--key`, `--host`, `--output` | API-based export from a remote instance. Supports `.gz`. |
| `import`   | `<path>`  | `--clear`, `--email`          | Injects an export package into the local database.       |

---

## Limitations & Constraints

### Same-Instance Collisions

The system is designed for **Cross-Instance Migration** (e.g., Prod to Local). Importing a user into the _same_ database instance they were exported from (under a different email) is **not supported**.

- Child records (like `emailPreference` or `sportSettings`) have unique IDs that will collide if the original user still exists in the same database.
- Always use the `--clear` flag if the user already exists in the target environment.

### Large Files

For users with many years of data, the `WorkoutStream` data can make the JSON file very large (100MB+).

- Always use **GZIP** (`.json.gz`) for transfers.
- Browser downloads may be slow for very large accounts; the CLI `api-pull` method is more robust for these cases.

## Troubleshooting

### Foreign Key Violations

If an import fails, ensure your local database schema matches production. Run `npx prisma migrate dev` to ensure you are up to date.
