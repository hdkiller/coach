# Linear & Agentic Issue Management Guide — Coach Watts

This document defines the issue tracking standards, ticket templates, and AI agent execution workflows for the **Coach Watts** project using **Linear** (Team Key: **`CW`**) and **Model Context Protocol (MCP)**.

> [!NOTE]
> This guide focuses strictly on product development and distribution for Coach Watts (`CW`). Internal company governance, multi-team infrastructure, and private consulting workflows live in the internal Watt Mind documentation repository.

---

## 1. Linear as an Agentic Execution Substrate

Modern agentic engineering treats Linear not just as a passive human tracking board, but as the **persistent execution substrate and memory store** for autonomous AI agents (Claude Code, Gemini CLI, Cursor, subagents).

- **Human-as-Architect, Agent-as-Executor**: Humans define strategic requirements, review architectural plans, and approve Pull Requests. AI agents pick up tickets via MCP, write code, run verification tests, and report status updates directly to Linear.
- **Context Efficiency**: Instead of swelling LLM context windows with entire codebase task lists, agents fetch only the precise issue context, file path pointers, and acceptance criteria needed for their assigned ticket (`CW-104`).
- **Branch Isolation & Zero Git Churn**: Task states live in Linear rather than git-tracked markdown files, eliminating git merge conflicts when multiple agents run in parallel.

---

## 2. Team Scope & Hierarchy

For Coach Watts development, all product engineering, mobile, feeder, and distribution issues are grouped under the **Coach Watts Core** team:

- **Team Name**: `Coach Watts`
- **Team Key**: **`CW`** (All issues follow the format `CW-1`, `CW-105`, etc.)

### Projects Catalog

| Project Name                             | Domain / Scope                                                                 | Primary Repositories                  |
| ---------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------- |
| **Coach Watts – Web & AI Core Platform** | Nuxt 3 web app, AI Coach chatroom, Prisma DB, Trigger.dev tasks                | `coach-wattz`                         |
| **Coach Watts – Mobile App**             | Expo / React Native app for iOS & Android                                      | `watts-mobile`                        |
| **Coach Watts – App Store Distribution** | iOS App Store & Google Play enrollment, TestFlight, RevenueCat, store listings | `watts-mobile` (`docs/distribution/`) |
| **Coach Watts – Feeder & Ingestion**     | Ingestion connectors (Intervals.icu, Strava, Oura, Yazio) & event scrapers     | `watts-feeder`                        |
| **Coach Watts – BI & Analytics**         | Platform analytics, telemetry, operational dashboards                          | `watts-bi`                            |
| **Coach Watts – Marketing & Outreach**   | Social setup, event promos, race entrant campaigns                             | `watts-marketing`                     |

---

## 3. Taxonomy & Labels

Labels standardize cross-project filtering and agent queue routing within `CW`.

### AI Execution & Readiness Labels

- `ai:agent-ready` — Fully specified with acceptance criteria and file pointers; queued for an AI agent to execute autonomously.
- `ai:in-progress` — Currently being actively worked on by an AI agent.
- `ai:needs-review` — Agent execution completed; PR opened and ready for code review.
- `ai:blocked` — Agent encountered a runtime error, missing credentials, or architectural ambiguity requiring human input.
- `quick-win` — Small, isolated fix (~15 min execution).

### Distribution Target Labels (`dist:<target>`)

- `dist:app-store` — iOS App Store Connect & TestFlight
- `dist:play-store` — Google Play Console & Internal Track
- `dist:web` — Web deployment & Dokploy production release
- `dist:raycast` — Raycast extension store

### Core Type & Area Labels

- **Type**: `type:bug`, `type:feature`, `type:refactor`, `type:maintenance`
- **Area**: `area:mobile`, `area:web`, `area:backend`, `area:feeder`, `area:ai-engine`, `area:analytics`

---

## 4. Workflow State Machine

Linear issues follow a standard state machine:

| Workflow State  | Type      | Description / Trigger                                                |
| --------------- | --------- | -------------------------------------------------------------------- |
| **Backlog**     | Backlog   | Unscheduled idea or raw report needing specification.                |
| **Todo**        | Unstarted | Actionable, specified issue ready to be picked up by human or agent. |
| **In Progress** | Started   | Branch created (`feat/CW-105-...`) and actively being developed.     |
| **In Review**   | Started   | PR submitted; awaiting CI pass and code review.                      |
| **Done**        | Completed | PR merged into target branch and verified.                           |
| **Canceled**    | Canceled  | Deprecated or no longer relevant.                                    |
| **Duplicate**   | Canceled  | Duplicate issue reference.                                           |

---

## 5. Standardized "AI-Ready" Definition of Done Template

When creating issues for AI agent execution, use the following template to guarantee unambiguous execution:

````markdown
## Problem & Context

Clear description of the bug or feature request.

## Acceptance Criteria

- [ ] Requirement 1 (e.g. "Token refresh logic propagates auth failure to caller")
- [ ] Requirement 2 (e.g. "Unit test passes for expired refresh token scenario")

## Source File Pointers

- Primary file: `apps/mobile/src/services/api.ts`
- Test file: `apps/mobile/src/__tests__/api.test.ts`

## Verification Command

```bash
pnpm test:unit apps/mobile/src/__tests__/api.test.ts
```
````

```
sh
pnpm test:unit apps/mobile/src/__tests__/api.test.ts
```

```

```

---

## 6. Git Branching & Magic Link Conventions

1. **Branch Naming Standard**:
   Always prefix branch names with the team key `CW` and issue number:
   ```bash
   git checkout -b feature/CW-105-spo2-chart
   git checkout -b fix/CW-42-token-refresh-race
   ```

````

2. **Commit & PR Magic Link Protocol**:
   Prefix commit messages and PR descriptions with magic keywords:
   ```bash
   git commit -m "fix(mobile): resolve token refresh race condition (fixes CW-105)"
   ```
   - `Fixes CW-105` or `Closes CW-105` automatically moves the ticket to **`Done`** when the PR merges.

---

## 7. Agent Execution Protocol (Plan ➔ Act ➔ Reflect ➔ Log)

Every AI agent participating in the codebase must strictly adhere to the 4-step execution loop:

1. **Plan**: Formulate architectural approach and verify target file locations.
2. **Act**: Modify source files cleanly without breaking existing API contracts.
3. **Reflect & Verify**: Execute verification commands (`pnpm test`, `tsc`, build scripts). **Never mark an issue complete without clean test outputs.**
4. **Log & Sync**: Post a completion comment on the Linear ticket detailing changes made and verification results.
````
