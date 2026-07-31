/*
  Warnings:

  - A unique constraint covering the columns `[provider,externalUserId]` on the table `Integration` will be added.

  CW-99: the app-level "is this externalUserId already linked to another
  user?" check in the Garmin OAuth callback (and equivalent checks for other
  providers) was a plain findFirst-then-write with no DB-level guarantee
  between the two, so two concurrent callbacks could both pass the check and
  create two Integration rows mapped to the same (provider, externalUserId).

  Before the constraint can be added we must resolve any such duplicates that
  may already exist in production, or the CREATE UNIQUE INDEX below would
  fail outright.

  Duplicate-resolution policy (deliberately non-destructive):
  For each (provider, externalUserId) group with more than one row and a
  non-null externalUserId, keep exactly one row's externalUserId intact —
  preferring the row with the most recent lastSyncAt (most recently active /
  most likely to be the account still in real use), falling back to id for a
  fully deterministic tie-break. On every other row in the group we only
  clear externalUserId to NULL; we do NOT delete the Integration row.

  This preserves every user's own tokens/settings/sync history (deleting the
  row would silently disconnect an integration a user believes is still
  connected), while releasing the externalUserId so the new unique index can
  be created. Any user left with externalUserId = NULL here no longer
  receives Garmin push-webhook data (which is keyed by externalUserId) until
  they reconnect - reconnecting will then hit the app-level P2002 handling
  added alongside this migration and correctly report "already linked" if
  the id truly still belongs to someone else, or re-populate externalUserId
  cleanly if it doesn't.
*/

-- Resolve pre-existing duplicate (provider, externalUserId) mappings before
-- the unique index can be created. Only rows with a non-null externalUserId
-- can collide; NULLs are already distinct under a Postgres unique index.
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "provider", "externalUserId"
      ORDER BY "lastSyncAt" DESC NULLS LAST, "id" ASC
    ) AS rn
  FROM "Integration"
  WHERE "externalUserId" IS NOT NULL
)
UPDATE "Integration" i
SET "externalUserId" = NULL
FROM ranked
WHERE i."id" = ranked."id"
  AND ranked.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "Integration_provider_externalUserId_key" ON "Integration"("provider", "externalUserId");
