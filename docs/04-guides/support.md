# AI Agent Support Workflow

This guide details how the AI Agent (Gemini) should handle support tickets and bug reports from the Coach Wattz production environment.

## 1. Triaging a Ticket

When a support agent or developer asks you to look into a ticket (e.g., using `/support triage <ticket_id>`), follow these steps:

1. **Get Ticket Details:**
   Use the `cw:cli support tickets get <id> --prod` command to retrieve the ticket's title, description, context, and the affected user ID.

2. **Validate the Issue:**
   Analyze the problem described in the ticket. Based on the context, use appropriate `cw:cli` tools to gather more information.
   - **MANDATE:** Always prefer using or extending `cw:cli` scripts for troubleshooting rather than writing one-off ad-hoc scripts.
   - **REUSE:** If an existing `cw:cli` tool is missing a feature needed for your investigation, add that functionality to the tool so it can be reused by others in the future.
   - If it's a workout analysis issue: Use `cw:cli db workout get <workout_id> --prod` (extend if missing) or `cw:cli trigger list` to see recent background jobs.
   - If it's an integration issue (e.g., Strava/Intervals): Check the integration logs or user settings.
   - If it's a data mismatch: Use `cw:cli db ...` to verify the DB state.

3. **Determine Root Cause & Propose Fix:**
   Once you've validated the issue, think step-by-step about what caused it.
   Explain your findings to the user and propose a concrete plan to fix the issue. This could involve updating database records, triggering a specific job, or making a code change.
   - **MANDATE:** Prefer using `cw:cli` commands to apply data fixes (e.g., updating a record, triggering a re-sync) rather than raw SQL or one-off scripts.

4. **Add an Internal Comment (Optional):**
   If you made significant discoveries but are waiting for developer approval, you can document your findings on the ticket using:
   `cw:cli support tickets comment <id> "Agent Findings: ..." --type NOTE --prod`

## 2. Resolving a Ticket

When the developer accepts your fix plan (e.g., using `/support resolve <ticket_id>`), execute the following:

1. **Apply the Fix:**
   Carry out the agreed-upon actions. Run the necessary shell commands, Prisma scripts, or code edits.

2. **Update the Ticket Status:**
   Mark the ticket as resolved using the CLI:
   `cw:cli support tickets update-status <id> RESOLVED --prod`

3. **Log the Resolution:**
   Add a comment to the ticket explaining what was fixed so that the support team has a record:
   `cw:cli support tickets comment <id> "Fixed the issue by ..." --type NOTE --prod`
   You can also send a message to the user:
   `cw:cli support tickets comment <id> "Your issue is resolved!" --type MESSAGE --prod`

## Available Tools

The primary tool for interacting with tickets is the `cw:cli support tickets` group. Always append `--prod` unless you are specifically testing against the local database.

- `cw:cli support tickets list`: List open tickets. Supports `--all` to include closed and `--limit` to specify the number of results.
- `cw:cli support tickets get <id>`: Fetch full ticket details.
- `cw:cli support tickets update-status <id> <status>`: Update ticket status (e.g., OPEN, RESOLVED, WONT_FIX).
- `cw:cli support tickets comment <id> <message> [--type NOTE|MESSAGE]`: Add an internal comment (NOTE) or public reply (MESSAGE).
