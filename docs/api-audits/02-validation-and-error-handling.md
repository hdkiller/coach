# Audit Domain 2: Input Validation & Error Handling

## Overview

Total Issues Identified: 95

| File                                                         | Severity  | Finding Description                            |
| ------------------------------------------------------------ | --------- | ---------------------------------------------- |
| `server/api/__e2e/login.post.ts`                             | **Major** | readBody() used without Zod schema validation. |
| `server/api/__e2e/token.post.ts`                             | **Major** | readBody() used without Zod schema validation. |
| `server/api/admin/debug/ping.post.ts`                        | **Major** | readBody() used without Zod schema validation. |
| `server/api/admin/debug/trigger-test.post.ts`                | **Major** | readBody() used without Zod schema validation. |
| `server/api/admin/impersonate.post.ts`                       | **Major** | readBody() used without Zod schema validation. |
| `server/api/admin/issues/[id]/comments.post.ts`              | **Major** | readBody() used without Zod schema validation. |
| `server/api/admin/issues/[id]/comments/[commentId].patch.ts` | **Major** | readBody() used without Zod schema validation. |
| `server/api/admin/llm/settings.post.ts`                      | **Major** | readBody() used without Zod schema validation. |
| `server/api/analytics/presets/[preset].post.ts`              | **Major** | readBody() used without Zod schema validation. |
| `server/api/auth/app-web-handoff.post.ts`                    | **Major** | readBody() used without Zod schema validation. |
| `server/api/availability/index.post.ts`                      | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/memory/[id].patch.ts`                       | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/memory/extract.post.ts`                     | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/memory/forget.post.ts`                      | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/memory/index.post.ts`                       | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/memory/remember.post.ts`                    | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/messages.post.ts`                           | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/messages/[id].patch.ts`                     | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/rooms/[id].patch.ts`                        | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/rooms/[id]/summarize.post.ts`               | **Major** | readBody() used without Zod schema validation. |
| `server/api/chat/tts.post.ts`                                | **Major** | readBody() used without Zod schema validation. |
| `server/api/checkin/answer.post.ts`                          | **Major** | readBody() used without Zod schema validation. |
| `server/api/checkin/generate.post.ts`                        | **Major** | readBody() used without Zod schema validation. |
| `server/api/coaching/athletes/connect.post.ts`               | **Major** | readBody() used without Zod schema validation. |
| `server/api/goals/[id].patch.ts`                             | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/hevy.post.ts`                       | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/intervals.post.ts`                  | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/intervals/webhook-async.post.ts`    | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/intervals/webhook.post.ts`          | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/strava/webhook.ts`                  | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/sync.post.ts`                       | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/telegram/webhook.post.ts`           | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/update.post.ts`                     | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/wahoo/webhook.post.ts`              | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/whoop/webhook-async.post.ts`        | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/withings/webhook.post.ts`           | **Major** | readBody() used without Zod schema validation. |
| `server/api/integrations/yazio/connect.post.ts`              | **Major** | readBody() used without Zod schema validation. |
| `server/api/internal/render-email.post.ts`                   | **Major** | readBody() used without Zod schema validation. |
| `server/api/internal/send-notification.post.ts`              | **Major** | readBody() used without Zod schema validation. |
| `server/api/issues/[id]/comments.post.ts`                    | **Major** | readBody() used without Zod schema validation. |
| `server/api/issues/[id]/comments/[commentId].patch.ts`       | **Major** | readBody() used without Zod schema validation. |
| `server/api/llm/feedback.post.ts`                            | **Major** | readBody() used without Zod schema validation. |
| `server/api/notifications/read.patch.ts`                     | **Major** | readBody() used without Zod schema validation. |
| `server/api/nutrition/[id]/notes.patch.ts`                   | **Major** | readBody() used without Zod schema validation. |
| `server/api/nutrition/generate-plan.post.ts`                 | **Major** | readBody() used without Zod schema validation. |
| `server/api/nutrition/plan/generate.post.ts`                 | **Major** | readBody() used without Zod schema validation. |
| `server/api/nutrition/plan/meal.post.ts`                     | **Major** | readBody() used without Zod schema validation. |
| `server/api/nutrition/recommendations/meal.post.ts`          | **Major** | readBody() used without Zod schema validation. |
| `server/api/nutrition/simulate-impact.post.ts`               | **Major** | readBody() used without Zod schema validation. |
| `server/api/oauth/authorize.post.ts`                         | **Major** | readBody() used without Zod schema validation. |
| `server/api/oauth/register.post.ts`                          | **Major** | readBody() used without Zod schema validation. |
| `server/api/oauth/revoke.post.ts`                            | **Major** | readBody() used without Zod schema validation. |
| `server/api/oauth/token.post.ts`                             | **Major** | readBody() used without Zod schema validation. |
| `server/api/orchestrate/full-sync.post.ts`                   | **Major** | readBody() used without Zod schema validation. |
| `server/api/planned-workouts/[id].patch.ts`                  | **Major** | readBody() used without Zod schema validation. |
| `server/api/planned-workouts/[id]/complete.post.ts`          | **Major** | readBody() used without Zod schema validation. |
| `server/api/planned-workouts/index.post.ts`                  | **Major** | readBody() used without Zod schema validation. |
| `server/api/plans/[id]/activate.post.ts`                     | **Major** | readBody() used without Zod schema validation. |
| `server/api/plans/[id]/save-template.post.ts`                | **Major** | readBody() used without Zod schema validation. |
| `server/api/plans/adapt.post.ts`                             | **Major** | readBody() used without Zod schema validation. |
| `server/api/plans/generate-ai-week.post.ts`                  | **Major** | readBody() used without Zod schema validation. |
| `server/api/plans/generate-block.post.ts`                    | **Major** | readBody() used without Zod schema validation. |
| `server/api/plans/generate.post.ts`                          | **Major** | readBody() used without Zod schema validation. |
| `server/api/profile/index.patch.ts`                          | **Major** | readBody() used without Zod schema validation. |
| `server/api/profile/public.patch.ts`                         | **Major** | readBody() used without Zod schema validation. |
| `server/api/profile/public/athlete.patch.ts`                 | **Major** | readBody() used without Zod schema validation. |
| `server/api/profile/public/coach.patch.ts`                   | **Major** | readBody() used without Zod schema validation. |
| `server/api/profile/public/coach/join.patch.ts`              | **Major** | readBody() used without Zod schema validation. |
| `server/api/profile/public/coach/start.patch.ts`             | **Major** | readBody() used without Zod schema validation. |
| `server/api/recommendations/today.post.ts`                   | **Major** | readBody() used without Zod schema validation. |
| `server/api/reports/generate.post.ts`                        | **Major** | readBody() used without Zod schema validation. |
| `server/api/scores/nutrition-trends-explanation.post.ts`     | **Major** | readBody() used without Zod schema validation. |
| `server/api/scores/workout-trends-explanation.post.ts`       | **Major** | readBody() used without Zod schema validation. |
| `server/api/settings/ai.post.ts`                             | **Major** | readBody() used without Zod schema validation. |
| `server/api/settings/api-keys/index.post.ts`                 | **Major** | readBody() used without Zod schema validation. |
| `server/api/share/generate.post.ts`                          | **Major** | readBody() used without Zod schema validation. |
| `server/api/support/send.post.ts`                            | **Major** | readBody() used without Zod schema validation. |
| `server/api/user/consent.post.ts`                            | **Major** | readBody() used without Zod schema validation. |
| `server/api/user/onboarding/complete.post.ts`                | **Major** | readBody() used without Zod schema validation. |
| `server/api/webhooks/garmin.post.ts`                         | **Major** | readBody() used without Zod schema validation. |
| `server/api/webhooks/oauth/[clientId].post.ts`               | **Major** | readBody() used without Zod schema validation. |
| `server/api/webhooks/revenuecat.post.ts`                     | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/[id]/link.post.ts`                      | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/[id]/notes.patch.ts`                    | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/[id]/share.post.ts`                     | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/deduplicate.post.ts`                    | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/generate.post.ts`                       | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/manual.post.ts`                         | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/merge.post.ts`                          | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/planned/[id]/conflict.post.ts`          | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/planned/[id]/link.post.ts`              | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/planned/[id]/publish-garmin.post.ts`    | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/planned/[id]/publish.post.ts`           | **Major** | readBody() used without Zod schema validation. |
| `server/api/workouts/streams.post.ts`                        | **Major** | readBody() used without Zod schema validation. |
| `server/routes/mcp.ts`                                       | **Major** | readBody() used without Zod schema validation. |

## Remediation Guidelines & Standard Operating Procedures

- Follow project guidelines in `docs/04-guides/` for remediation.
