# Audit Domain 3: Database Query & N+1 Performance

## Overview

Total Issues Identified: 84

| File                                                                  | Severity  | Finding Description                           |
| --------------------------------------------------------------------- | --------- | --------------------------------------------- |
| `server/api/activity/recent.get.ts`                                   | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/ai/logs.get.ts`                                     | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/llm/settings.get.ts`                                | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/mcp/stats.get.ts`                                   | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/oauth/apps/[id].get.ts`                             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats.get.ts`                                       | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/developers.get.ts`                            | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/llm/operations.get.ts`                        | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/llm/overview.get.ts`                          | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/llm/quotas.get.ts`                            | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/llm/users.get.ts`                             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/messaging.get.ts`                             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/users.get.ts`                                 | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/webhooks.get.ts`                              | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/stats/workouts.get.ts`                              | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/subscriptions.get.ts`                               | **Major** | Potential N+1 database operation inside loop. |
| `server/api/admin/users.get.ts`                                       | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/dashboards/index.get.ts`                        | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/dashboards/reorder.post.ts`                     | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/fields.get.ts`                                  | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/llm-usage.get.ts`                               | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/llm-usage/history.get.ts`                       | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/presets/[preset].post.ts`                       | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/workout-comparison/browse.post.ts`              | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/workout-comparison/intervals.post.ts`           | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/workout-comparison/streams.post.ts`             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/analytics/workout-comparison/workouts.post.ts`            | **Major** | Potential N+1 database operation inside loop. |
| `server/api/chat/messages.post.ts`                                    | **Major** | Potential N+1 database operation inside loop. |
| `server/api/chat/rooms.get.ts`                                        | **Major** | Potential N+1 database operation inside loop. |
| `server/api/coaching/overview.get.ts`                                 | **Major** | Potential N+1 database operation inside loop. |
| `server/api/goals/[id].patch.ts`                                      | **Major** | Potential N+1 database operation inside loop. |
| `server/api/goals/index.get.ts`                                       | **Major** | Potential N+1 database operation inside loop. |
| `server/api/goals/index.post.ts`                                      | **Major** | Potential N+1 database operation inside loop. |
| `server/api/integrations/status.get.ts`                               | **Major** | Potential N+1 database operation inside loop. |
| `server/api/integrations/telegram/webhook.post.ts`                    | **Major** | Potential N+1 database operation inside loop. |
| `server/api/library/plan-folders/[id].delete.ts`                      | **Major** | Potential N+1 database operation inside loop. |
| `server/api/library/plan-folders/[id].patch.ts`                       | **Major** | Potential N+1 database operation inside loop. |
| `server/api/library/plan-folders/index.get.ts`                        | **Major** | Potential N+1 database operation inside loop. |
| `server/api/library/plans/[id]/architect.patch.ts`                    | **Major** | Potential N+1 database operation inside loop. |
| `server/api/library/plans/[id]/import.post.ts`                        | **Major** | Potential N+1 database operation inside loop. |
| `server/api/library/plans/[id]/publication.patch.ts`                  | **Major** | Potential N+1 database operation inside loop. |
| `server/api/library/plans/index.get.ts`                               | **Major** | Potential N+1 database operation inside loop. |
| `server/api/nutrition/active-feed.get.ts`                             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/nutrition/index.get.ts`                                   | **Major** | Potential N+1 database operation inside loop. |
| `server/api/nutrition/strategy.get.ts`                                | **Major** | Potential N+1 database operation inside loop. |
| `server/api/oauth/authorize.get.ts`                                   | **Major** | Potential N+1 database operation inside loop. |
| `server/api/oauth/authorize.post.ts`                                  | **Major** | Potential N+1 database operation inside loop. |
| `server/api/orchestrate/metadata.get.ts`                              | **Major** | Potential N+1 database operation inside loop. |
| `server/api/performance/pmc.get.ts`                                   | **Major** | Potential N+1 database operation inside loop. |
| `server/api/plans/[id]/activate.post.ts`                              | **Major** | Potential N+1 database operation inside loop. |
| `server/api/plans/initialize.post.ts`                                 | **Major** | Potential N+1 database operation inside loop. |
| `server/api/plans/workouts/future.delete.ts`                          | **Major** | Potential N+1 database operation inside loop. |
| `server/api/plans/workouts/orphaned.delete.ts`                        | **Major** | Potential N+1 database operation inside loop. |
| `server/api/plans/workouts/past.delete.ts`                            | **Major** | Potential N+1 database operation inside loop. |
| `server/api/profile/dashboard.get.ts`                                 | **Major** | Potential N+1 database operation inside loop. |
| `server/api/profile/public/coach.get.ts`                              | **Major** | Potential N+1 database operation inside loop. |
| `server/api/profile/quotas.get.ts`                                    | **Major** | Potential N+1 database operation inside loop. |
| `server/api/profile/sport-settings/[id]/detect-from-workouts.post.ts` | **Major** | Potential N+1 database operation inside loop. |
| `server/api/profile/trial-summary.get.ts`                             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/public/coaches/[slug].get.ts`                             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/public/coaches/[slug]/start.get.ts`                       | **Major** | Potential N+1 database operation inside loop. |
| `server/api/public/coaches/[slug]/start/request.post.ts`              | **Major** | Potential N+1 database operation inside loop. |
| `server/api/public/plans/index.get.ts`                                | **Major** | Potential N+1 database operation inside loop. |
| `server/api/reports/index.get.ts`                                     | **Major** | Potential N+1 database operation inside loop. |
| `server/api/scores/athlete-profile.get.ts`                            | **Major** | Potential N+1 database operation inside loop. |
| `server/api/scores/nutrition-trends-explanation.post.ts`              | **Major** | Potential N+1 database operation inside loop. |
| `server/api/scores/workout-trends-explanation.post.ts`                | **Major** | Potential N+1 database operation inside loop. |
| `server/api/share/[token].get.ts`                                     | **Major** | Potential N+1 database operation inside loop. |
| `server/api/share/workouts/[token]/intervals.get.ts`                  | **Major** | Potential N+1 database operation inside loop. |
| `server/api/share/workouts/[token]/streams.get.ts`                    | **Major** | Potential N+1 database operation inside loop. |
| `server/api/stats/monthly-comparison.get.ts`                          | **Major** | Potential N+1 database operation inside loop. |
| `server/api/stripe/webhook.post.ts`                                   | **Major** | Potential N+1 database operation inside loop. |
| `server/api/wellness/[wellnessId].get.ts`                             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/wellness/index.get.ts`                                    | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/[id]/intervals.get.ts`                           | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/[id]/metric-history.get.ts`                      | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/[id]/segment-summary.post.ts`                    | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/[id]/streams.get.ts`                             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/index.get.ts`                                    | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/planned/[id]/publish-garmin.post.ts`             | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/planned/upcoming.get.ts`                         | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/sports.get.ts`                                   | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/streams.post.ts`                                 | **Major** | Potential N+1 database operation inside loop. |
| `server/api/workouts/upload-fit.post.ts`                              | **Major** | Potential N+1 database operation inside loop. |

## Remediation Guidelines & Standard Operating Procedures

- Follow project guidelines in `docs/04-guides/` for remediation.
