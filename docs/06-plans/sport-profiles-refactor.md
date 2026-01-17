# Sport Profiles (Sport Settings) Refactor

## Overview

This document details the architectural shift from legacy, single-sport user settings (`User.hrZones`, `User.powerZones`) to a robust, multi-sport configuration system using the **Sport Settings** model (`SportSettings`).

This change enables:

1.  **Multi-Sport Support:** Different thresholds (FTP, LTHR) and zones for Cycling, Running, Swimming, etc.
2.  **Default Fallback:** A robust "Default" profile that acts as the system-wide fallback when no specific sport matches.
3.  **Repository Pattern:** Centralized data access logic via `sportSettingsRepository` to ensure consistency.

## Architecture

### Data Model

The `SportSettings` model replaces the JSON fields on the `User` table.

```prisma
model SportSettings {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name      String   // e.g., "Road Cycling", "Default"
  isDefault Boolean  @default(false) // Primary fallback if true
  types     String[] // Activity types this applies to (e.g., ["Ride", "VirtualRide"])

  // Metrics
  ftp       Int?
  lthr      Int?
  maxHr     Int?

  // Zones
  hrZones    Json?   // Array of { name, min, max }
  powerZones Json?   // Array of { name, min, max }

  // ... other fields (warmupTime, etc.)
}
```

**Key Concept: The Default Profile**

- Every user MUST have exactly one `SportSettings` record where `isDefault = true`.
- This record holds the "Global" settings (formerly stored directly on `User`).
- `athleteMetricsService` keeps global user fields (`User.ftp`, `User.weight`) synchronized with this Default profile.

### Repository Pattern

All access to sport settings is mediated by `server/utils/repositories/sportSettingsRepository.ts`.

- `getByUserId(userId)`: Returns all profiles, **lazy-creating** the Default profile from legacy user data if it doesn't exist.
- `getDefault(userId)`: Returns the specific default profile.
- `getForActivityType(userId, type)`: Intellectually resolves the correct profile:
  1.  Exact match in `types` array.
  2.  (Future) Partial match logic.
  3.  Fallback to Default profile.

## Implementation Status

### Completed Refactors

#### 1. Backend Core

- **Repository:** Created `sportSettingsRepository` with lazy-creation logic.
- **Metrics Service:** Updated `athleteMetricsService` to sync global updates (FTP, MaxHR) to the Default Sport Profile.
- **Zone Utilities:** Updated `training-metrics.ts` to use Default Profile zones for analytics.

#### 2. AI Triggers & Automation

- **`recommend-today-activity`**: Now fetches all sport profiles to provide context-aware recommendations (e.g., "Your Run LTHR is 170bpm vs Bike 160bpm").
- **`generate-athlete-profile`**: Includes comprehensive breakdown of all sport thresholds in the AI prompt.
- **`generate-weekly-plan`**: Plans workouts using the specific metabolic thresholds for the target sport.
- **`generate-structured-workout`**: Targets specific zones for the workout type (e.g., Run zones for a Run).
- **`autodetect-intervals-profile`**: Performs full multi-sport sync from Intervals.icu.

#### 3. API Endpoints

- **`/api/profile/dashboard`**: Checks for valid Sport Settings to determine "Missing Fields" status.
- **`/api/chat/messages`**: Provides full sport profile context to the Coach AI.
- **`/api/analytics/weekly-zones`**: Aggregates time-in-zone by matching each workout to its correct sport profile.

#### 4. Frontend Components

- **`Activities` Page**: Resolves zone visualization using the new hierarchy.
- **`ZoneChart` & `MiniZoneChart`**: Updated to fetch/use Default Profile zones instead of legacy user fields.
- **`SportSettings` Component**: UI overhaul to manage multiple profiles and the Default flag.

## Migration Strategy

We are currently in a **Dual-Write / Read-New** state.

- **Writes:** We still update `User` basic fields for backward compatibility, but `athleteMetricsService` ensures `SportSettings` (Default) is always updated.
- **Reads:** The application now prioritizes `SportSettings`.

### Deprecated Fields (To Be Removed)

The following fields on the `User` model are now technically obsolete but kept for safety until final cleanup:

- `hrZones` (JSON)
- `powerZones` (JSON)

_Note: `ftp`, `maxHr`, `lthr`, `weight` on `User` are KEEPING as "Global/Quick Reference" values, but they should mirror the Default Profile._

## Todo List / Next Steps

### 1. Final Cleanup & Verification

- [x] **Audit `cli/debug`**: Check `cli/debug/profile.ts` for legacy field usage.
- [x] **Audit `server/utils/intervals.ts`**: Ensure raw Intervals sync logic doesn't accidentally overwrite `SportSettings` with legacy logic (mostly handled by `autodetect` trigger now).
- [x] **Verify "Lazy Creation"**: Test a fresh user sign-up to ensure the Default profile is created correctly upon first data access.
- [x] **Backfill Existing Users**: Ensure every existing user has a Default profile (Run `scripts/ensure-default-profiles.ts`).

### 2. Database Cleanup (In Progress)

- [ ] **Migration**: Create a Prisma migration to drop `hrZones` and `powerZones` from the `User` table. (Postponed for safety).
- [x] **Code Removal**: Stop using `hrZones` and `powerZones` in all backend/frontend logic.
- [x] **Deprecation**: Marked `hrZones` and `powerZones` as legacy in `schema.prisma`.
- [ ] **Final Drop**: Remove fields from `schema.prisma` and run `prisma generate` once verified in production.
- [x] **Type Cleanup**: Remove `hrZones` and `powerZones` from repository access logic.

### 3. Feature Expansion

- [ ] **Manual Profile Management**: Allow users to create "Custom" sport profiles manually in the UI (currently mostly synced or default).
- [ ] **Sport-Specific Analytics**: Update "Time in Zones" chart to allow filtering by Sport Profile (e.g., "Show me my Running Zone distribution").

---

**Last Updated:** January 17, 2026 (Migration Finalized & Verified)
**Status:** Core Migration Complete. Legacy fields soft-deprecated. System is running on Sport Profiles.
