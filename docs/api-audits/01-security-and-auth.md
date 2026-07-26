# Audit Domain 1: Security, Auth & Rate Limiting

## Overview

Total Issues Identified: 71

| File                                                                          | Severity     | Finding Description                                                                     |
| ----------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `server/api/__e2e/login.post.ts`                                              | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/__e2e/token.post.ts`                                              | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/admin/queues/status.get.ts`                                       | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/auth/[...].ts`                                                    | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/auth/app-web-handoff/consume.get.ts`                              | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/auth/unsubscribe.post.ts`                                         | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/checkin/generate.post.ts`                                         | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/coaching/athletes/[id]/calendar.get.ts`                           | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/coaching/athletes/[id]/planned-workouts/[workoutId].delete.ts`    | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/coaching/athletes/[id]/planned-workouts/[workoutId].get.ts`       | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/coaching/athletes/[id]/planned-workouts/[workoutId].patch.ts`     | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/coaching/athletes/[id]/planned-workouts/[workoutId]/move.post.ts` | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/coaching/athletes/[id]/planned-workouts/index.post.ts`            | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/coaching/athletes/[id]/workouts/[workoutId].get.ts`               | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/developer/apps/[id].delete.ts`                                    | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/developer/apps/[id].get.ts`                                       | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/developer/apps/[id]/logo.post.ts`                                 | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/developer/apps/[id]/secret.post.ts`                               | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/developer/apps/[id]/webhook-logs.get.ts`                          | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/developer/apps/[id]/webhook-secret.post.ts`                       | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/developer/apps/index.get.ts`                                      | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/developer/apps/index.post.ts`                                     | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/fitbit/webhook.get.ts`                               | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/fitbit/webhook.post.ts`                              | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/intervals/webhook-async.post.ts`                     | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/intervals/webhook.post.ts`                           | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/oura/webhook.get.ts`                                 | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/oura/webhook.post.ts`                                | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/polar/webhook.post.ts`                               | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/rouvy/authorize.get.ts`                              | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/strava/webhook.ts`                                   | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/wahoo/webhook.post.ts`                               | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/whoop/webhook-async.post.ts`                         | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/whoop/webhook.post.ts`                               | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/integrations/withings/webhook.post.ts`                            | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/internal/render-email.post.ts`                                    | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/internal/send-notification.post.ts`                               | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/join/[code].get.ts`                                               | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/library/workouts/[id]/generate-structure.post.ts`                 | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/monitoring/trigger.get.ts`                                        | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/monitoring/worker.get.ts`                                         | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/nutrition/[id]/analyze.post.ts`                                   | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/nutrition/analyze-all.post.ts`                                    | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/nutrition/generate-plan.post.ts`                                  | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/nutrition/plan/generate.post.ts`                                  | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/oauth/authorize-details.get.ts`                                   | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/oauth/authorize.post.ts`                                          | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/oauth/consents.get.ts`                                            | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/oauth/consents/[appId].delete.ts`                                 | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/oauth/public-apps.get.ts`                                         | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/oauth/register.post.ts`                                           | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/oauth/revoke.post.ts`                                             | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/oauth/token.post.ts`                                              | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/plans/generate.post.ts`                                           | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/recommendations/generate.post.ts`                                 | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/releases/current.get.ts`                                          | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/releases/index.get.ts`                                            | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/reports/generate.post.ts`                                         | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/scores/generate-explanations.post.ts`                             | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/share/generate.post.ts`                                           | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/stripe/checkout-session.post.ts`                                  | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/wellness/[id].patch.ts`                                           | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/wellness/[wellnessId].patch.ts`                                   | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/wellness/[wellnessId]/analyze.post.ts`                            | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/wellness/analyze.post.ts`                                         | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/workouts/[id]/analyze-adherence.post.ts`                          | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/workouts/[id]/analyze.post.ts`                                    | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/workouts/analyze-all.post.ts`                                     | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/workouts/count.get.ts`                                            | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |
| `server/api/workouts/generate-status.get.ts`                                  | **Major**    | Resource-intensive endpoint without explicit rate limit or quota shield.                |
| `server/api/workouts/planned/range.get.ts`                                    | **Critical** | Missing explicit authentication guard (requireAuth, getServerSession, or requireAdmin). |

## Remediation Guidelines & Standard Operating Procedures

- Follow project guidelines in `docs/04-guides/` for remediation.
