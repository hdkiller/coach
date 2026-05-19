-- Remove obsolete Intervals.icu OAuth Account rows.
-- Intervals.icu no longer offers self-service OAuth client registration; the integration now
-- uses HTTP Basic auth with a per-athlete API key persisted on the Integration table.
DELETE FROM "Account" WHERE "provider" = 'intervals';

-- Drop any residual OAuth metadata on existing Intervals Integration rows so the
-- credentials are treated as API-key only by getIntervalsHeaders/getIntervalsAthleteId.
UPDATE "Integration" SET "scope" = NULL, "refreshToken" = NULL, "expiresAt" = NULL
WHERE "provider" = 'intervals';
