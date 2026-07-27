# Agent Guidelines (AGENTS.md)

Primary context for AI agents (Claude Code, Gemini CLI, Cursor) working in this repository.

## Project

**Coach Watts** — AI endurance coaching platform. Nuxt 3 + Nuxt UI, Vercel AI SDK, Prisma, Trigger.dev.

## Issue tracking

All work is tracked in **Linear**, team key **`CW`**. Issue IDs look like `CW-105`.

**Read [`docs/04-guides/issue-management.md`](docs/04-guides/issue-management.md) before picking up any ticket.** It defines the label taxonomy, workflow states, the AI-ready ticket template, and the concurrent-agent claim protocol.

Task state lives in Linear, never in git-tracked markdown. Files under `docs/issues/` are the **archive** of already-resolved issues plus specs — do not treat them as a live queue and do not update their status as a way of tracking work.

## Non-negotiables for agents

1. **One git worktree per ticket.** Never work on two tickets in the same checkout.
   ```bash
   git worktree add ~/Develop/.worktrees/coach-wattz/CW-105 -b feat/CW-105-slug
   ```
2. **Claim before you code.** Set the ticket to `In Progress`, assign it to yourself, add `ai:in-progress` — then re-read it. If the assignee is not you, another agent won the race; take the next ticket.
3. **Only touch the ticket's `Owned Paths`.** If the work requires files outside that set, stop and move the ticket to `Blocked`.
4. **Never mark a ticket `Done` without clean verification output.** Run the ticket's Verification Command and post the output as a comment.
5. **Blocked is a state, not a vibe.** Missing credentials, ambiguity, or an external dependency → move to `Blocked` and say what you need. Never leave a stalled ticket sitting in `In Progress`.

## Execution loop

**Plan → Act → Verify → Push & Open PR → Log & Transition.** Confirm file locations and restate the approach on the ticket; implement inside the worktree; run the verification command; push branch (`git push origin <branch>`) and open Pull Request (`gh pr create --target develop --body "Fixes CW-XYZ"`); post results, PR link, and diff summary to Linear.

## Commands

```bash
pnpm dev              # dev server
pnpm build            # production build
pnpm typecheck        # tsc
pnpm test             # unit tests
pnpm lint             # eslint
npx prisma migrate dev
```

See [`docs/04-guides/`](docs/04-guides/) for typechecking, e2e testing, chat development, localization, and analytics guides.

## Trigger.dev

This project has Trigger.dev agent skills in `.claude/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or `chat.agent` AI agents), load the relevant skill: `trigger-authoring-chat-agent`.

## Scope

This repository is Coach Watts product development only. Do not reference internal corporate teams, internal financial namespaces, or client engagements in code, commits, PR descriptions, or issue comments here.
