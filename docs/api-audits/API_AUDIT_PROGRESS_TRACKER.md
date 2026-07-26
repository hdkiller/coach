# API Audit Progress Tracker

Total Endpoints Identified: 563

| #   | Endpoint File                                                                 | Domain 1 (Auth) | Domain 2 (Val) | Domain 3 (DB) | Domain 4 (TZ) | Domain 5 (Types) | Status                    |
| --- | ----------------------------------------------------------------------------- | --------------- | -------------- | ------------- | ------------- | ---------------- | ------------------------- |
| 1   | `server/api/__e2e/login.post.ts`                                              | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 2   | `server/api/__e2e/token.post.ts`                                              | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 3   | `server/api/activity/highlights.get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 4   | `server/api/activity/recent.get.ts`                                           | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 5   | `server/api/admin/ai/logs.get.ts`                                             | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 6   | `server/api/admin/audit-logs.get.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 7   | `server/api/admin/database.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 8   | `server/api/admin/debug/env.get.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 9   | `server/api/admin/debug/ping.post.ts`                                         | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 10  | `server/api/admin/debug/trigger-test.post.ts`                                 | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 11  | `server/api/admin/emails/[id]/send.post.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 12  | `server/api/admin/emails/index.get.ts`                                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 13  | `server/api/admin/impersonate.post.ts`                                        | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 14  | `server/api/admin/issues/[id].delete.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 15  | `server/api/admin/issues/[id].get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 16  | `server/api/admin/issues/[id].put.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 17  | `server/api/admin/issues/[id]/comments.get.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 18  | `server/api/admin/issues/[id]/comments.post.ts`                               | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 19  | `server/api/admin/issues/[id]/comments/[commentId].delete.ts`                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 20  | `server/api/admin/issues/[id]/comments/[commentId].patch.ts`                  | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 21  | `server/api/admin/issues/[id]/comments/[commentId]/acknowledge.post.ts`       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 22  | `server/api/admin/issues/[id]/comments/[commentId]/reaction.post.ts`          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 23  | `server/api/admin/issues/[id]/reaction.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 24  | `server/api/admin/issues/index.get.ts`                                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 25  | `server/api/admin/llm/settings.get.ts`                                        | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 26  | `server/api/admin/llm/settings.post.ts`                                       | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 27  | `server/api/admin/mcp/stats.get.ts`                                           | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 28  | `server/api/admin/oauth/apps/[id].get.ts`                                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 29  | `server/api/admin/queues/status.get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 30  | `server/api/admin/stats.get.ts`                                               | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 31  | `server/api/admin/stats/developers.get.ts`                                    | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 32  | `server/api/admin/stats/email.get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 33  | `server/api/admin/stats/llm/[id].get.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 34  | `server/api/admin/stats/llm/denials.get.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 35  | `server/api/admin/stats/llm/operations.get.ts`                                | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 36  | `server/api/admin/stats/llm/overview.get.ts`                                  | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 37  | `server/api/admin/stats/llm/quotas.get.ts`                                    | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 38  | `server/api/admin/stats/llm/users.get.ts`                                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 39  | `server/api/admin/stats/messaging.get.ts`                                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 40  | `server/api/admin/stats/tickets.get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 41  | `server/api/admin/stats/users.get.ts`                                         | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 42  | `server/api/admin/stats/webhooks.get.ts`                                      | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 43  | `server/api/admin/stats/workouts.get.ts`                                      | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 44  | `server/api/admin/stop-impersonation.post.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 45  | `server/api/admin/subscriptions.get.ts`                                       | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 46  | `server/api/admin/system-messages.get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 47  | `server/api/admin/system-messages.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 48  | `server/api/admin/system-messages/[id].delete.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 49  | `server/api/admin/system-messages/[id].put.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 50  | `server/api/admin/users.get.ts`                                               | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 51  | `server/api/admin/users/[id].delete.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 52  | `server/api/admin/users/[id].get.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 53  | `server/api/admin/users/[id]/deactivate.post.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 54  | `server/api/admin/users/[id]/feature-flags.post.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 55  | `server/api/admin/users/[id]/lifetime-subscription.post.ts`                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 56  | `server/api/admin/users/[id]/reactivate.post.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 57  | `server/api/admin/users/[id]/tickets.get.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 58  | `server/api/admin/webhook-stats.get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 59  | `server/api/admin/webhooks.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 60  | `server/api/analytics/dashboards/index.get.ts`                                | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 61  | `server/api/analytics/dashboards/index.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 62  | `server/api/analytics/dashboards/reorder.post.ts`                             | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 63  | `server/api/analytics/fields.get.ts`                                          | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 64  | `server/api/analytics/fields/definitions/[id].delete.ts`                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 65  | `server/api/analytics/fields/definitions/index.get.ts`                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 66  | `server/api/analytics/fields/definitions/index.post.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 67  | `server/api/analytics/llm-usage.get.ts`                                       | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 68  | `server/api/analytics/llm-usage/[id].get.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 69  | `server/api/analytics/llm-usage/history.get.ts`                               | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 70  | `server/api/analytics/presets/[preset].post.ts`                               | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 71  | `server/api/analytics/query.post.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 72  | `server/api/analytics/weekly-zones.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 73  | `server/api/analytics/widgets/[id].delete.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 74  | `server/api/analytics/widgets/[id].get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 75  | `server/api/analytics/widgets/index.get.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 76  | `server/api/analytics/widgets/index.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 77  | `server/api/analytics/workout-comparison/browse.post.ts`                      | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 78  | `server/api/analytics/workout-comparison/intervals.post.ts`                   | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 79  | `server/api/analytics/workout-comparison/streams.post.ts`                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 80  | `server/api/analytics/workout-comparison/workouts.post.ts`                    | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 81  | `server/api/analytics/workout-explorer/density.post.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 82  | `server/api/analytics/workout-explorer/intervals.post.ts`                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 83  | `server/api/analytics/workout-explorer/streams.post.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 84  | `server/api/analytics/workout-explorer/summary.post.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 85  | `server/api/analytics/workout-explorer/workout.post.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 86  | `server/api/auth/[...].ts`                                                    | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 87  | `server/api/auth/app-web-handoff.post.ts`                                     | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 88  | `server/api/auth/app-web-handoff/consume.get.ts`                              | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 89  | `server/api/auth/unsubscribe.post.ts`                                         | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 90  | `server/api/availability/index.get.ts`                                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 91  | `server/api/availability/index.post.ts`                                       | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 92  | `server/api/body-measurements/[id].patch.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 93  | `server/api/body-measurements/index.get.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 94  | `server/api/body-measurements/index.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 95  | `server/api/calendar/index.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 96  | `server/api/calendar/notes/[id].get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 97  | `server/api/changelog.get.ts`                                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 98  | `server/api/chat/memory/[id].delete.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 99  | `server/api/chat/memory/[id].patch.ts`                                        | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 100 | `server/api/chat/memory/extract.post.ts`                                      | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 101 | `server/api/chat/memory/forget.post.ts`                                       | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 102 | `server/api/chat/memory/index.get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 103 | `server/api/chat/memory/index.post.ts`                                        | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 104 | `server/api/chat/memory/remember.post.ts`                                     | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 105 | `server/api/chat/messages.get.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 106 | `server/api/chat/messages.post.ts`                                            | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 107 | `server/api/chat/messages/[id].patch.ts`                                      | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 108 | `server/api/chat/rooms.get.ts`                                                | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 109 | `server/api/chat/rooms.post.ts`                                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 110 | `server/api/chat/rooms/[id].delete.ts`                                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 111 | `server/api/chat/rooms/[id].patch.ts`                                         | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 112 | `server/api/chat/rooms/[id]/memory.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 113 | `server/api/chat/rooms/[id]/state.get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 114 | `server/api/chat/rooms/[id]/summarize.post.ts`                                | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 115 | `server/api/chat/transcribe.post.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 116 | `server/api/chat/tts.post.ts`                                                 | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 117 | `server/api/chat/turns/[id]/resume.post.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 118 | `server/api/chat/turns/[id]/retry.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 119 | `server/api/checkin/[id].delete.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 120 | `server/api/checkin/[id].patch.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 121 | `server/api/checkin/answer.post.ts`                                           | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 122 | `server/api/checkin/generate.post.ts`                                         | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 123 | `server/api/checkin/history.get.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 124 | `server/api/checkin/today.get.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 125 | `server/api/coaching/athletes.get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 126 | `server/api/coaching/athletes/[id].delete.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 127 | `server/api/coaching/athletes/[id].get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 128 | `server/api/coaching/athletes/[id]/calendar.get.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 129 | `server/api/coaching/athletes/[id]/planned-workouts/[workoutId].delete.ts`    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 130 | `server/api/coaching/athletes/[id]/planned-workouts/[workoutId].get.ts`       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 131 | `server/api/coaching/athletes/[id]/planned-workouts/[workoutId].patch.ts`     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 132 | `server/api/coaching/athletes/[id]/planned-workouts/[workoutId]/move.post.ts` | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 133 | `server/api/coaching/athletes/[id]/planned-workouts/index.post.ts`            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 134 | `server/api/coaching/athletes/[id]/workouts/[workoutId].get.ts`               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 135 | `server/api/coaching/athletes/connect.post.ts`                                | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 136 | `server/api/coaching/athletes/invites.get.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 137 | `server/api/coaching/athletes/invites.post.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 138 | `server/api/coaching/athletes/invites/[inviteId].delete.ts`                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 139 | `server/api/coaching/athletes/requests.get.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 140 | `server/api/coaching/athletes/requests/[requestId]/approve.post.ts`           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 141 | `server/api/coaching/athletes/requests/[requestId]/decline.post.ts`           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 142 | `server/api/coaching/coaches.get.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 143 | `server/api/coaching/coaches/[id].delete.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 144 | `server/api/coaching/groups/[id].delete.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 145 | `server/api/coaching/groups/[id].get.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 146 | `server/api/coaching/groups/[id]/members.post.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 147 | `server/api/coaching/groups/[id]/members/[athleteId].delete.ts`               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 148 | `server/api/coaching/groups/index.get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 149 | `server/api/coaching/groups/index.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 150 | `server/api/coaching/invite.get.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 151 | `server/api/coaching/invite.post.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 152 | `server/api/coaching/overview.get.ts`                                         | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 153 | `server/api/coaching/teams/[id].delete.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 154 | `server/api/coaching/teams/[id].get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 155 | `server/api/coaching/teams/[id]/invites.delete.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 156 | `server/api/coaching/teams/[id]/invites.get.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 157 | `server/api/coaching/teams/[id]/invites.post.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 158 | `server/api/coaching/teams/[id]/join-by-code.post.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 159 | `server/api/coaching/teams/[id]/members/[userId].delete.ts`                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 160 | `server/api/coaching/teams/[id]/members/[userId].patch.ts`                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 161 | `server/api/coaching/teams/[id]/members/add.post.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 162 | `server/api/coaching/teams/[id]/roster.get.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 163 | `server/api/coaching/teams/accept.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 164 | `server/api/coaching/teams/index.get.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 165 | `server/api/coaching/teams/index.post.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 166 | `server/api/debug/config-test.get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 167 | `server/api/debug/sentry.post.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 168 | `server/api/debug/system.get.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 169 | `server/api/debug/workouts.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 170 | `server/api/developer/apps/[id].delete.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 171 | `server/api/developer/apps/[id].get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 172 | `server/api/developer/apps/[id].patch.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 173 | `server/api/developer/apps/[id]/logo.post.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 174 | `server/api/developer/apps/[id]/secret.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 175 | `server/api/developer/apps/[id]/webhook-logs.get.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 176 | `server/api/developer/apps/[id]/webhook-secret.post.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 177 | `server/api/developer/apps/index.get.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 178 | `server/api/developer/apps/index.post.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 179 | `server/api/events/[id].delete.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 180 | `server/api/events/[id].get.ts`                                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 181 | `server/api/events/[id].put.ts`                                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 182 | `server/api/events/index.get.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 183 | `server/api/events/index.post.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 184 | `server/api/goals/[id].delete.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 185 | `server/api/goals/[id].patch.ts`                                              | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 186 | `server/api/goals/index.get.ts`                                               | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 187 | `server/api/goals/index.post.ts`                                              | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 188 | `server/api/goals/review-result.get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 189 | `server/api/goals/review.post.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 190 | `server/api/goals/suggest.post.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 191 | `server/api/goals/suggestions.get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 192 | `server/api/health.get.ts`                                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 193 | `server/api/integrations/fitbit/authorize.get.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 194 | `server/api/integrations/fitbit/callback.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 195 | `server/api/integrations/fitbit/disconnect.delete.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 196 | `server/api/integrations/fitbit/webhook.get.ts`                               | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 197 | `server/api/integrations/fitbit/webhook.post.ts`                              | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 198 | `server/api/integrations/garmin/authorize.get.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 199 | `server/api/integrations/garmin/callback.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 200 | `server/api/integrations/garmin/disconnect.delete.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 201 | `server/api/integrations/hevy.post.ts`                                        | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 202 | `server/api/integrations/intervals.post.ts`                                   | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 203 | `server/api/integrations/intervals/disconnect.delete.ts`                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 204 | `server/api/integrations/intervals/sync-profile.post.ts`                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 205 | `server/api/integrations/intervals/webhook-async.post.ts`                     | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 206 | `server/api/integrations/intervals/webhook.post.ts`                           | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 207 | `server/api/integrations/liftosaur.post.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 208 | `server/api/integrations/liftosaur/disconnect.delete.ts`                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 209 | `server/api/integrations/oura/authorize.get.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 210 | `server/api/integrations/oura/callback.get.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 211 | `server/api/integrations/oura/disconnect.delete.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 212 | `server/api/integrations/oura/webhook.get.ts`                                 | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 213 | `server/api/integrations/oura/webhook.post.ts`                                | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 214 | `server/api/integrations/polar/authorize.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 215 | `server/api/integrations/polar/callback.get.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 216 | `server/api/integrations/polar/disconnect.delete.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 217 | `server/api/integrations/polar/webhook.post.ts`                               | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 218 | `server/api/integrations/rouvy/authorize.get.ts`                              | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 219 | `server/api/integrations/rouvy/callback.get.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 220 | `server/api/integrations/rouvy/disconnect.delete.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 221 | `server/api/integrations/status.get.ts`                                       | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 222 | `server/api/integrations/strava/authorize.get.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 223 | `server/api/integrations/strava/callback.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 224 | `server/api/integrations/strava/disconnect.delete.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 225 | `server/api/integrations/strava/webhook.ts`                                   | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 226 | `server/api/integrations/sync.post.ts`                                        | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 227 | `server/api/integrations/telegram/disconnect.delete.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 228 | `server/api/integrations/telegram/link.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 229 | `server/api/integrations/telegram/webhook.post.ts`                            | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 230 | `server/api/integrations/ultrahuman/authorize.get.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 231 | `server/api/integrations/ultrahuman/callback.get.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 232 | `server/api/integrations/ultrahuman/disconnect.delete.ts`                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 233 | `server/api/integrations/update.post.ts`                                      | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 234 | `server/api/integrations/wahoo/authorize.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 235 | `server/api/integrations/wahoo/callback.get.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 236 | `server/api/integrations/wahoo/disconnect.delete.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 237 | `server/api/integrations/wahoo/webhook.post.ts`                               | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 238 | `server/api/integrations/whoop/authorize.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 239 | `server/api/integrations/whoop/callback.get.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 240 | `server/api/integrations/whoop/disconnect.delete.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 241 | `server/api/integrations/whoop/webhook-async.post.ts`                         | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 242 | `server/api/integrations/whoop/webhook.post.ts`                               | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 243 | `server/api/integrations/withings/authorize.get.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 244 | `server/api/integrations/withings/callback.get.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 245 | `server/api/integrations/withings/disconnect.delete.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 246 | `server/api/integrations/withings/webhook.post.ts`                            | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 247 | `server/api/integrations/yazio/connect.post.ts`                               | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 248 | `server/api/internal/render-email.post.ts`                                    | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 249 | `server/api/internal/send-notification.post.ts`                               | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 250 | `server/api/issues/[id].delete.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 251 | `server/api/issues/[id].get.ts`                                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 252 | `server/api/issues/[id].patch.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 253 | `server/api/issues/[id]/comments.post.ts`                                     | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 254 | `server/api/issues/[id]/comments/[commentId].delete.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 255 | `server/api/issues/[id]/comments/[commentId].patch.ts`                        | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 256 | `server/api/issues/[id]/comments/[commentId]/acknowledge.post.ts`             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 257 | `server/api/issues/[id]/comments/[commentId]/reaction.post.ts`                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 258 | `server/api/issues/[id]/reaction.post.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 259 | `server/api/issues/index.get.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 260 | `server/api/issues/index.post.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 261 | `server/api/join/[code].get.ts`                                               | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 262 | `server/api/join/[code].post.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 263 | `server/api/library/plan-folders/[id].delete.ts`                              | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 264 | `server/api/library/plan-folders/[id].patch.ts`                               | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 265 | `server/api/library/plan-folders/index.get.ts`                                | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 266 | `server/api/library/plan-folders/index.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 267 | `server/api/library/plans/[id]/apply.post.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 268 | `server/api/library/plans/[id]/architect.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 269 | `server/api/library/plans/[id]/architect.patch.ts`                            | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 270 | `server/api/library/plans/[id]/import.post.ts`                                | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 271 | `server/api/library/plans/[id]/publication.patch.ts`                          | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 272 | `server/api/library/plans/bulk-move.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 273 | `server/api/library/plans/favorite.post.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 274 | `server/api/library/plans/index.get.ts`                                       | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 275 | `server/api/library/plans/index.post.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 276 | `server/api/library/strength-exercises/[id].delete.ts`                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 277 | `server/api/library/strength-exercises/[id].patch.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 278 | `server/api/library/strength-exercises/index.get.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 279 | `server/api/library/strength-exercises/index.post.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 280 | `server/api/library/workout-folders/[id].delete.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 281 | `server/api/library/workout-folders/[id].patch.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 282 | `server/api/library/workout-folders/index.get.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 283 | `server/api/library/workout-folders/index.post.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 284 | `server/api/library/workouts/[id].delete.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 285 | `server/api/library/workouts/[id].get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 286 | `server/api/library/workouts/[id].patch.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 287 | `server/api/library/workouts/[id]/adjust.post.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 288 | `server/api/library/workouts/[id]/generate-structure.post.ts`                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 289 | `server/api/library/workouts/[id]/intervals-preview.get.ts`                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 290 | `server/api/library/workouts/bulk-move.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 291 | `server/api/library/workouts/index.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 292 | `server/api/library/workouts/index.post.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 293 | `server/api/library/workouts/save.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 294 | `server/api/llm/feedback.post.ts`                                             | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 295 | `server/api/metrics/today.get.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 296 | `server/api/mobile/devices.delete.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 297 | `server/api/mobile/devices.post.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 298 | `server/api/mobile/devices/preferences.get.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 299 | `server/api/mobile/devices/preferences.put.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 300 | `server/api/monitoring/trigger.get.ts`                                        | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 301 | `server/api/monitoring/worker.get.ts`                                         | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 302 | `server/api/notifications/index.get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 303 | `server/api/notifications/read.patch.ts`                                      | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 304 | `server/api/nutrition/[id].get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 305 | `server/api/nutrition/[id]/analyze.post.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 306 | `server/api/nutrition/[id]/items.patch.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 307 | `server/api/nutrition/[id]/log.post.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 308 | `server/api/nutrition/[id]/notes.patch.ts`                                    | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 309 | `server/api/nutrition/active-feed.get.ts`                                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 310 | `server/api/nutrition/analyze-all.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 311 | `server/api/nutrition/barcode/[barcode].get.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 312 | `server/api/nutrition/estimate-photo.post.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 313 | `server/api/nutrition/extended-wave.get.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 314 | `server/api/nutrition/generate-plan.post.ts`                                  | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 315 | `server/api/nutrition/grocery.get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 316 | `server/api/nutrition/hydration-quick-add.post.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 317 | `server/api/nutrition/hydration-reset.post.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 318 | `server/api/nutrition/index.get.ts`                                           | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 319 | `server/api/nutrition/index.post.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 320 | `server/api/nutrition/item/[...key].get.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 321 | `server/api/nutrition/metabolic-wave.get.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 322 | `server/api/nutrition/plan.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 323 | `server/api/nutrition/plan/generate.post.ts`                                  | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 324 | `server/api/nutrition/plan/meal.post.ts`                                      | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 325 | `server/api/nutrition/plan/meals/[mealId].patch.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 326 | `server/api/nutrition/recommendations/[id].get.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 327 | `server/api/nutrition/recommendations/meal.post.ts`                           | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 328 | `server/api/nutrition/search.get.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 329 | `server/api/nutrition/simulate-impact.post.ts`                                | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 330 | `server/api/nutrition/strategy.get.ts`                                        | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 331 | `server/api/nutrition/upcoming-plan.get.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 332 | `server/api/oauth/authorize-details.get.ts`                                   | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 333 | `server/api/oauth/authorize.get.ts`                                           | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 334 | `server/api/oauth/authorize.post.ts`                                          | ⚠️ Finding      | ⚠️ Finding     | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 335 | `server/api/oauth/consents.get.ts`                                            | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 336 | `server/api/oauth/consents/[appId].delete.ts`                                 | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 337 | `server/api/oauth/public-apps.get.ts`                                         | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 338 | `server/api/oauth/register.post.ts`                                           | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 339 | `server/api/oauth/revoke.post.ts`                                             | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 340 | `server/api/oauth/token.post.ts`                                              | ⚠️ Finding      | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 341 | `server/api/oauth/userinfo.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 342 | `server/api/orchestrate/full-sync.post.ts`                                    | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 343 | `server/api/orchestrate/metadata.get.ts`                                      | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 344 | `server/api/orchestrate/progress.get.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 345 | `server/api/partners/[slug].get.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 346 | `server/api/partners/[slug]/redeem.post.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 347 | `server/api/performance/ftp-evolution.get.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 348 | `server/api/performance/pmc.get.ts`                                           | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 349 | `server/api/performance/weight-evolution.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 350 | `server/api/planned-workouts/[id].delete.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 351 | `server/api/planned-workouts/[id].get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 352 | `server/api/planned-workouts/[id].patch.ts`                                   | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 353 | `server/api/planned-workouts/[id]/complete.post.ts`                           | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 354 | `server/api/planned-workouts/[id]/skip.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 355 | `server/api/planned-workouts/index.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 356 | `server/api/planned-workouts/index.post.ts`                                   | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 357 | `server/api/plans/[id].delete.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 358 | `server/api/plans/[id]/abandon.post.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 359 | `server/api/plans/[id]/activate.post.ts`                                      | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 360 | `server/api/plans/[id]/blocks/[blockId].delete.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 361 | `server/api/plans/[id]/blocks/[blockId].patch.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 362 | `server/api/plans/[id]/blocks/index.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 363 | `server/api/plans/[id]/blocks/reorder.put.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 364 | `server/api/plans/[id]/index.get.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 365 | `server/api/plans/[id]/replan-structure.post.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 366 | `server/api/plans/[id]/save-template.post.ts`                                 | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 367 | `server/api/plans/active.get.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 368 | `server/api/plans/adapt.post.ts`                                              | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 369 | `server/api/plans/current.get.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 370 | `server/api/plans/generate-ai-week.post.ts`                                   | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 371 | `server/api/plans/generate-block.post.ts`                                     | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 372 | `server/api/plans/generate.post.ts`                                           | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 373 | `server/api/plans/index.get.ts`                                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 374 | `server/api/plans/initialize.post.ts`                                         | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 375 | `server/api/plans/status.get.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 376 | `server/api/plans/weeks/[id].patch.ts`                                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 377 | `server/api/plans/workouts/future.delete.ts`                                  | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 378 | `server/api/plans/workouts/orphaned.delete.ts`                                | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 379 | `server/api/plans/workouts/past.delete.ts`                                    | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 380 | `server/api/profile/ai-analysis.delete.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 381 | `server/api/profile/athlete-profiles.delete.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 382 | `server/api/profile/autodetect.post.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 383 | `server/api/profile/bug-reports.get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 384 | `server/api/profile/bug-reports/[id]/comments.get.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 385 | `server/api/profile/bug-reports/[id]/comments.post.ts`                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 386 | `server/api/profile/dashboard.get.ts`                                         | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 387 | `server/api/profile/email-preferences.get.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 388 | `server/api/profile/email-preferences.put.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 389 | `server/api/profile/export.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 390 | `server/api/profile/generate.post.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 391 | `server/api/profile/index.delete.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 392 | `server/api/profile/index.get.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 393 | `server/api/profile/index.patch.ts`                                           | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 394 | `server/api/profile/nutrition.delete.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 395 | `server/api/profile/nutrition.get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 396 | `server/api/profile/nutrition.post.ts`                                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 397 | `server/api/profile/public.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 398 | `server/api/profile/public.patch.ts`                                          | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 399 | `server/api/profile/public/athlete.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 400 | `server/api/profile/public/athlete.patch.ts`                                  | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 401 | `server/api/profile/public/coach.get.ts`                                      | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 402 | `server/api/profile/public/coach.patch.ts`                                    | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 403 | `server/api/profile/public/coach/join.get.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 404 | `server/api/profile/public/coach/join.patch.ts`                               | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 405 | `server/api/profile/public/coach/start.get.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 406 | `server/api/profile/public/coach/start.patch.ts`                              | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 407 | `server/api/profile/quotas.get.ts`                                            | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 408 | `server/api/profile/sport-settings/[id]/detect-from-workouts.post.ts`         | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 409 | `server/api/profile/status.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 410 | `server/api/profile/synced-activities.delete.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 411 | `server/api/profile/trial-summary.get.ts`                                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 412 | `server/api/profile/wellness.delete.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 413 | `server/api/public-events/[slug].get.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 414 | `server/api/public-events/[slug]/join.post.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 415 | `server/api/public-events/index.get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 416 | `server/api/public/athletes/[slug].get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 417 | `server/api/public/authors/[slug].get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 418 | `server/api/public/coaches/[slug].get.ts`                                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 419 | `server/api/public/coaches/[slug]/join.get.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 420 | `server/api/public/coaches/[slug]/start.get.ts`                               | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 421 | `server/api/public/coaches/[slug]/start/request.post.ts`                      | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 422 | `server/api/public/contact.post.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 423 | `server/api/public/plans/[slug].get.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 424 | `server/api/public/plans/access/[token].get.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 425 | `server/api/public/plans/index.get.ts`                                        | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 426 | `server/api/recommendations/[id].get.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 427 | `server/api/recommendations/[id].patch.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 428 | `server/api/recommendations/[id]/accept.post.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 429 | `server/api/recommendations/[id]/guide.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 430 | `server/api/recommendations/categories.get.ts`                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 431 | `server/api/recommendations/clear.delete.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 432 | `server/api/recommendations/generate.post.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 433 | `server/api/recommendations/index.get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 434 | `server/api/recommendations/status.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 435 | `server/api/recommendations/today.get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 436 | `server/api/recommendations/today.post.ts`                                    | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 437 | `server/api/recovery-context.get.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 438 | `server/api/recovery-context/journey.post.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 439 | `server/api/recovery-context/journey/[id].delete.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 440 | `server/api/recovery-context/journey/[id].patch.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 441 | `server/api/referrals/claim.post.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 442 | `server/api/referrals/me.get.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 443 | `server/api/referrals/me/regenerate.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 444 | `server/api/releases/current.get.ts`                                          | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 445 | `server/api/releases/index.get.ts`                                            | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 446 | `server/api/reports/[id].get.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 447 | `server/api/reports/generate.post.ts`                                         | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 448 | `server/api/reports/index.get.ts`                                             | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 449 | `server/api/reports/templates.get.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 450 | `server/api/runs/[id].delete.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 451 | `server/api/runs/[id].get.ts`                                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 452 | `server/api/runs/active.get.ts`                                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 453 | `server/api/scores/athlete-profile.get.ts`                                    | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 454 | `server/api/scores/efficiency-trends.get.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 455 | `server/api/scores/explanation.get.ts`                                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 456 | `server/api/scores/generate-explanations.post.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 457 | `server/api/scores/nutrition-trends-explanation.post.ts`                      | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 458 | `server/api/scores/nutrition-trends.get.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 459 | `server/api/scores/readiness-correlation.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 460 | `server/api/scores/workout-trends-explanation.post.ts`                        | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 461 | `server/api/scores/workout-trends.get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 462 | `server/api/settings/ai.get.ts`                                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 463 | `server/api/settings/ai.post.ts`                                              | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 464 | `server/api/settings/api-keys/[id].delete.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 465 | `server/api/settings/api-keys/index.get.ts`                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 466 | `server/api/settings/api-keys/index.post.ts`                                  | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 467 | `server/api/share/[token].get.ts`                                             | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 468 | `server/api/share/chat/[token].get.ts`                                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 469 | `server/api/share/generate.post.ts`                                           | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 470 | `server/api/share/workouts/[token].get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 471 | `server/api/share/workouts/[token]/image.get.ts`                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 472 | `server/api/share/workouts/[token]/intervals.get.ts`                          | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 473 | `server/api/share/workouts/[token]/power-curve.get.ts`                        | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 474 | `server/api/share/workouts/[token]/streams.get.ts`                            | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 475 | `server/api/stats/monthly-comparison.get.ts`                                  | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 476 | `server/api/storage/upload.post.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 477 | `server/api/stripe/change-plan.post.ts`                                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 478 | `server/api/stripe/checkout-session.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 479 | `server/api/stripe/portal-session.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 480 | `server/api/stripe/sync.post.ts`                                              | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 481 | `server/api/stripe/webhook.post.ts`                                           | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 482 | `server/api/subscriptions/me.get.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 483 | `server/api/subscriptions/reconcile.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 484 | `server/api/support/send.post.ts`                                             | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 485 | `server/api/system-messages/dismiss.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 486 | `server/api/system-messages/latest.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 487 | `server/api/system-messages/share-reward/claim.post.ts`                       | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 488 | `server/api/user/analytics/account-created-claim.post.ts`                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 489 | `server/api/user/consent.post.ts`                                             | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 490 | `server/api/user/me.get.ts`                                                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 491 | `server/api/user/onboarding-status.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 492 | `server/api/user/onboarding/complete.post.ts`                                 | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 493 | `server/api/user/onboarding/restart.post.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 494 | `server/api/user/settings.patch.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 495 | `server/api/webhooks/garmin.post.ts`                                          | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 496 | `server/api/webhooks/oauth/[clientId].post.ts`                                | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 497 | `server/api/webhooks/resend.post.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 498 | `server/api/webhooks/revenuecat.post.ts`                                      | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 499 | `server/api/websocket-token.get.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 500 | `server/api/websocket.ts`                                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 501 | `server/api/wellness/[id].patch.ts`                                           | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 502 | `server/api/wellness/[wellnessId].get.ts`                                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 503 | `server/api/wellness/[wellnessId].patch.ts`                                   | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 504 | `server/api/wellness/[wellnessId]/analyze.post.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 505 | `server/api/wellness/analyze.post.ts`                                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 506 | `server/api/wellness/events.get.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 507 | `server/api/wellness/index.get.ts`                                            | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ✅ Pass          | 🔄 Remediating            |
| 508 | `server/api/wellness/index.post.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 509 | `server/api/wellness/trend.get.ts`                                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 510 | `server/api/workouts/[id].delete.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 511 | `server/api/workouts/[id].get.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 512 | `server/api/workouts/[id].patch.ts`                                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 513 | `server/api/workouts/[id]/analyze-adherence.post.ts`                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 514 | `server/api/workouts/[id]/analyze.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 515 | `server/api/workouts/[id]/export/gpx.get.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 516 | `server/api/workouts/[id]/intervals.get.ts`                                   | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 517 | `server/api/workouts/[id]/link.post.ts`                                       | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 518 | `server/api/workouts/[id]/metric-history.get.ts`                              | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 519 | `server/api/workouts/[id]/notes.patch.ts`                                     | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 520 | `server/api/workouts/[id]/power-curve.get.ts`                                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 521 | `server/api/workouts/[id]/promote.post.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 522 | `server/api/workouts/[id]/publish-summary.post.ts`                            | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 523 | `server/api/workouts/[id]/segment-summary.post.ts`                            | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 524 | `server/api/workouts/[id]/share.post.ts`                                      | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 525 | `server/api/workouts/[id]/streams.get.ts`                                     | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 526 | `server/api/workouts/[id]/unlink-duplicate.post.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 527 | `server/api/workouts/[id]/unlink.post.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 528 | `server/api/workouts/analyze-all.post.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 529 | `server/api/workouts/by-date.get.ts`                                          | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 530 | `server/api/workouts/count.get.ts`                                            | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 531 | `server/api/workouts/deduplicate.post.ts`                                     | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 532 | `server/api/workouts/generate-status.get.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 533 | `server/api/workouts/generate.post.ts`                                        | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 534 | `server/api/workouts/index.get.ts`                                            | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 535 | `server/api/workouts/manual.post.ts`                                          | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 536 | `server/api/workouts/merge.post.ts`                                           | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 537 | `server/api/workouts/planned/[id].get.ts`                                     | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 538 | `server/api/workouts/planned/[id]/adjust.post.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 539 | `server/api/workouts/planned/[id]/conflict.post.ts`                           | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 540 | `server/api/workouts/planned/[id]/download/[format].get.ts`                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 541 | `server/api/workouts/planned/[id]/fueling.get.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 542 | `server/api/workouts/planned/[id]/generate-structure.post.ts`                 | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 543 | `server/api/workouts/planned/[id]/intervals-preview.get.ts`                   | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 544 | `server/api/workouts/planned/[id]/link.post.ts`                               | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 545 | `server/api/workouts/planned/[id]/messages.post.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 546 | `server/api/workouts/planned/[id]/move.post.ts`                               | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 547 | `server/api/workouts/planned/[id]/neighbors.get.ts`                           | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 548 | `server/api/workouts/planned/[id]/publish-garmin.post.ts`                     | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 549 | `server/api/workouts/planned/[id]/publish.post.ts`                            | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 550 | `server/api/workouts/planned/[id]/structure.patch.ts`                         | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 551 | `server/api/workouts/planned/[id]/unlink.post.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 552 | `server/api/workouts/planned/bulk-delete.post.ts`                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 553 | `server/api/workouts/planned/range.get.ts`                                    | ⚠️ Finding      | ✅ Pass        | ✅ Pass       | ⚠️ Finding    | ⚠️ Finding       | 🔄 Remediating            |
| 554 | `server/api/workouts/planned/today.get.ts`                                    | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 555 | `server/api/workouts/planned/upcoming.get.ts`                                 | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 556 | `server/api/workouts/power-curve.get.ts`                                      | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 557 | `server/api/workouts/sports.get.ts`                                           | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ⚠️ Finding    | ✅ Pass          | 🔄 Remediating            |
| 558 | `server/api/workouts/streams.post.ts`                                         | ✅ Pass         | ⚠️ Finding     | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 559 | `server/api/workouts/tags.get.ts`                                             | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | ✅ Audited & Standardized |
| 560 | `server/api/workouts/upload-fit.post.ts`                                      | ✅ Pass         | ✅ Pass        | ⚠️ Finding    | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 561 | `server/routes/.well-known/[...path].get.ts`                                  | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
| 562 | `server/routes/mcp.ts`                                                        | ✅ Pass         | ⚠️ Finding     | ✅ Pass       | ✅ Pass       | ⚠️ Finding       | 🔄 Remediating            |
| 563 | `server/routes/sitemap.xml.ts`                                                | ✅ Pass         | ✅ Pass        | ✅ Pass       | ✅ Pass       | ✅ Pass          | ✅ Audited & Standardized |
