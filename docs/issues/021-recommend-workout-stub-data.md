# 021 — `recommend_workout` chat tool returns hardcoded stub

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai`, `workouts`  
**Status:** Open

## Description

The chat `recommend_workout` tool always returns a fixed fake ride recommendation, not real AI/repository output. Users asking “what should I run today?” may get wrong guidance; follow-up “create it” flows can produce mismatched workouts.

## Root Cause

```19:32:server/utils/ai-tools/recommendations.ts
    execute: async (args) => {
      return {
        created: false,
        ...
        recommendation: {
          title: 'Zone 2 Endurance Ride',
          duration_minutes: 90,
          description: 'Steady state ride at 65-75% FTP.',
          tss: 60
        }
      }
    }
```

Tool description says read-only and points to `create_planned_workout`, but the stub is always cycling-oriented regardless of user sport/request.

## Impact on structure generation

User asks for a **run** → stub says **90min Zone 2 Ride** → model may `create_planned_workout(type: "Ride", ...)` then trigger structure generation for wrong sport/parameters.

## Suggested Fix

Wire to real recommendation pipeline (`list_pending_recommendations`, `recommend-today-activity` trigger) or remove tool until implemented. Update skill routing to prefer pending recommendations over stub.

## Acceptance Criteria

- [ ] No hardcoded recommendation payload in production chat path
- [ ] Run vs ride requests route to correct sport type before structure generation
