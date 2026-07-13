# 240 — `checkCriticalAlerts` Body Deleted in Refactor (Silent Dead Path)

**Type:** Bug  
**Priority:** Medium  
**Area:** `nutrition` (alerts)  
**Status:** Open

## Description

`metabolicService.checkCriticalAlerts()` is now an empty stub:

```ts
async checkCriticalAlerts(userId: string, startingGlycogen: number, date: Date) {
  // ... logic remains same
}
```

Commit `3565738c` introduced it with real logic (detect `startingGlycogen < 20` before a
hard morning workout and write a `CRITICAL_FUELING_ALERT` audit-log entry). Commit
`54ef94d2` ("refactor(server): core metabolic and recommendation services") replaced the
body with the comment `// ... logic remains same` — a refactor artifact that silently
deleted the feature. `finalizeDay()` still awaits it for today's date.

(Note: the call site itself is currently dead too, see
[239](./239-metabolic-chain-never-persisted.md) — but restoring the alert logic should
happen when the finalize path is wired up, or the stub should be removed.)

## Affected Files

- `server/utils/services/metabolicService.ts` (~line 1612)

## Acceptance Criteria

- Restore the critical fueling alert logic (or delete the stub and its call site
  deliberately, with a tracking note).
