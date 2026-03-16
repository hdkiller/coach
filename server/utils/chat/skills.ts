import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { z } from 'zod'
import { calculateLlmCost } from '../ai-config'
import { filterChatToolsForChat, isChatToolTemporarilyDisabled } from '../ai-tools'
import { prisma } from '../db'

export const CHAT_SKILL_IDS = [
  'support',
  'planning_read',
  'planning_write',
  'workout_read',
  'workout_update',
  'profile',
  'availability',
  'recommendations',
  'wellness',
  'analysis',
  'nutrition',
  'general_chat'
] as const

export type ChatSkillId = (typeof CHAT_SKILL_IDS)[number]

export type ChatSkillContextFlag =
  | 'support'
  | 'planning'
  | 'workout'
  | 'profile'
  | 'availability'
  | 'recommendations'
  | 'wellness'
  | 'analysis'
  | 'nutrition'
  | 'time'
  | 'date_context'

export type ChatSkillManifest = {
  id: ChatSkillId
  description: string
  toolNames: string[]
  instructionFragment: string
  contextFlags: ChatSkillContextFlag[]
  approvalToolNames: string[]
  priority: number
  fallbackSkill?: ChatSkillId
}

export type ChatSkillSelection = {
  skillIds: ChatSkillId[]
  confidence: number
  useTools: boolean
  reason?: string
  usedFallback?: boolean
  source?: 'router' | 'continuation' | 'retry_continuation' | 'pending_approval' | 'fallback'
}

type ChatSkillRouterParams = {
  userId: string
  turnId: string
  messages: any[]
  roomMetadata?: Record<string, any> | null
  requireToolApproval?: boolean
  nutritionTrackingEnabled?: boolean
}

type ComposeSkillInstructionsContext = {
  aiRequireToolApproval?: boolean
  nutritionTrackingEnabled?: boolean
  useTools?: boolean
  approvalToolNames?: string[]
}

const ROUTER_MODEL_ID = 'gemini-3.1-flash-lite-preview'
const ROUTER_CONFIDENCE_THRESHOLD = 0.55

const skillSelectionSchema = z.object({
  skillIds: z.array(z.enum(CHAT_SKILL_IDS)).max(3).default(['general_chat']),
  confidence: z.number().min(0).max(1).default(0.5),
  useTools: z.boolean().default(false),
  reason: z.string().max(240).optional()
})

const CHAT_SKILL_MANIFESTS: Record<ChatSkillId, ChatSkillManifest> = {
  support: {
    id: 'support',
    description:
      'Ticket and issue workflows: create, inspect, search, or update support tickets when the user reports a bug, issue, or support problem.',
    toolNames: [
      'ticket_create',
      'report_bug',
      'ticket_get',
      'ticket_search',
      'find_bug_reports',
      'ticket_update',
      'ticket_comment'
    ],
    instructionFragment: `## Support Skill

- Use support tools for tickets, product issues, and bug-report workflows.
- Draft ticket language cleanly before creating or updating records.
- Ask only for missing facts that materially affect the ticket.
- If the needed facts are discoverable from support tools, fetch them instead of asking the user to repeat them.
- When the user asks to create or update a ticket and you already have the required details, call the support tool immediately.
- If approval is required, the approval UI must come from the support tool call itself.
- If approval would be needed, emit the support tool call first so the system can create the approval request. Without the tool call, there is nothing for the user to approve.
- Never ask the user to approve a ticket in plain text without first invoking the relevant support tool.
- Do not claim a ticket was created or updated unless the support tool actually ran successfully.`,
    contextFlags: ['support'],
    approvalToolNames: ['ticket_create', 'report_bug', 'ticket_update', 'ticket_comment'],
    priority: 100,
    fallbackSkill: 'general_chat'
  },
  planning_read: {
    id: 'planning_read',
    description:
      'Read-only planning workflows: answer questions about upcoming or planned workouts, current plan structure, and scheduled sessions.',
    toolNames: [
      'get_planned_workouts',
      'search_planned_workouts',
      'get_current_plan',
      'get_planned_workout_details',
      'get_planned_workout_structure',
      'get_training_availability'
    ],
    instructionFragment: `## Planning Read Skill

- Use planning read tools when the athlete asks about upcoming workouts, plan structure, or scheduled sessions.
- Prefer the smallest read-only planning tool that answers the question.
- If the user references a workout by title, date, or rough timeframe, identify the matching planned workout via planning read tools instead of guessing.
- If a natural-language timeframe is not directly supported, either resolve it with tools or fall back to an explicit date-range lookup before asking the user to restate it.
- Summarize results in plain language; do not dump raw tool payloads.`,
    contextFlags: ['planning', 'date_context'],
    approvalToolNames: [],
    priority: 90,
    fallbackSkill: 'general_chat'
  },
  planning_write: {
    id: 'planning_write',
    description:
      'Planning mutation workflows: create, move, adjust, publish, or delete planned workouts and training availability.',
    toolNames: [
      'resolve_temporal_reference',
      'get_planned_workouts',
      'search_planned_workouts',
      'get_current_plan',
      'get_planned_workout_details',
      'get_planned_workout_structure',
      'update_training_week',
      'set_planned_workout_structure',
      'patch_planned_workout_structure',
      'create_planned_workout',
      'update_planned_workout',
      'reschedule_planned_workout',
      'adjust_planned_workout',
      'generate_planned_workout_structure',
      'publish_planned_workout',
      'delete_planned_workout',
      'delete_workout',
      'modify_training_plan_structure',
      'get_training_availability',
      'update_training_availability'
    ],
    instructionFragment: `## Planning Write Skill

- You must use planning tools for plan mutations. Do not describe the change without calling the tool.
- For relative date phrases used in writes, call \`resolve_temporal_reference\` before mutating.
- If the user refers to a workout by title, date, sport, or rough timeframe rather than by ID, first use planning read/search tools to identify the exact target record. Do not ask for an ID that you can discover yourself.
- For delete or update requests, perform discovery with planning tools first, then call the mutation tool once the target is clear.
- If multiple plausible target workouts are found, ask a concise clarification question that names the candidates.
- For schedule changes, prefer updating or rescheduling over delete-and-recreate unless the user explicitly wants replacement.
- When the user has already provided enough details for a plan change, call the planning mutation tool immediately.
- If approval is required, the approval UI must come from the planning tool call itself.
- If approval would be needed, emit the planning mutation tool call first so the system can create the approval request. Without the tool call, there is nothing for the user to approve.
- Never ask for approval in plain text without first invoking the relevant planning mutation tool.
- If the user approves a prepared planning action, immediately execute that exact approved planning tool call.
- After approval, do not just acknowledge the action in text. Execute the tool first, then report the result.
- Do not claim a workout was created, updated, moved, published, or deleted unless the planning tool actually ran successfully.`,
    contextFlags: ['planning', 'date_context', 'time'],
    approvalToolNames: [
      'update_training_availability',
      'set_planned_workout_structure',
      'patch_planned_workout_structure',
      'create_planned_workout',
      'update_planned_workout',
      'reschedule_planned_workout',
      'publish_planned_workout',
      'delete_planned_workout',
      'delete_workout'
    ],
    priority: 95,
    fallbackSkill: 'general_chat'
  },
  workout_read: {
    id: 'workout_read',
    description:
      'Read-only completed workout workflows: review recent workouts, inspect workout details, streams, and post-workout analysis.',
    toolNames: [
      'get_recent_workouts',
      'search_workouts',
      'get_workout_details',
      'get_workout_analysis',
      'get_workout_streams',
      'create_chart'
    ],
    instructionFragment: `## Workout Read Skill

- Use workout read tools for completed or recent workout questions.
- If the user wants deeper analysis, fetch the relevant workout details or streams first.
- If the user points to a workout by description instead of ID, identify it with search tools before answering.
- Charts are optional and should only be created when they improve the answer.`,
    contextFlags: ['workout', 'date_context', 'time'],
    approvalToolNames: [],
    priority: 80,
    fallbackSkill: 'general_chat'
  },
  workout_update: {
    id: 'workout_update',
    description:
      'Completed workout mutation workflows: update an existing workout record, its notes, tags, or metadata.',
    toolNames: [
      'search_workouts',
      'get_workout_details',
      'update_workout',
      'update_workout_notes',
      'update_workout_tags',
      'analyze_activity'
    ],
    instructionFragment: `## Workout Update Skill

- Use \`update_workout\` for edits to completed workout records.
- Use \`update_workout_notes\` to append or replace personal notes.
- Use \`update_workout_tags\` to manage local workout tags.
- Use \`analyze_activity\` when the user explicitly asks for a deep performance re-analysis.
- Verify the target workout first when the request is ambiguous.
- If the user refers to a workout by title, date, or description rather than by ID, search for it first. Do not ask for an ID if the toolset can discover it.
- Preserve existing user-entered content unless the user explicitly asks to overwrite it.
- When the user has given enough detail to perform the edit, call the relevant workout mutation tool instead of only describing the intended change.
- If approval is required for any future workout-edit flow, the approval UI must come from the tool call, not from plain text.
- If approval would be needed, emit the workout mutation tool call first so the system can create the approval request. Without the tool call, there is nothing for the user to approve.
- Do not claim a workout edit succeeded unless the tool actually ran successfully.`,
    contextFlags: ['workout', 'date_context', 'time'],
    approvalToolNames: [
      'update_workout',
      'update_workout_notes',
      'update_workout_tags',
      'analyze_activity'
    ],
    priority: 85,
    fallbackSkill: 'general_chat'
  },
  profile: {
    id: 'profile',
    description:
      'Profile and sport-setting workflows: inspect or update athlete profile data, sport zones, preferences, and athlete profile recalculation.',
    toolNames: [
      'get_user_profile',
      'generate_athlete_profile',
      'update_user_profile',
      'get_sport_settings',
      'update_sport_settings'
    ],
    instructionFragment: `## Profile Skill

- Use profile tools for athlete settings, zones, units, location, FTP, HR, and persona preferences.
- For read-only profile questions, fetch the minimum profile or sport-setting data needed before answering.
- When the user clearly asks to change profile or sport settings, call the relevant profile tool instead of only describing the intended change.
- If both read and write tools are needed to complete the request safely, fetch current profile state first and then perform the change.
- If approval would be needed, emit the profile mutation tool call first so the system can create the approval request. Without the tool call, there is nothing for the user to approve.
- Do not claim a profile or sport-setting change succeeded unless the tool actually ran successfully.`,
    contextFlags: ['profile'],
    approvalToolNames: ['update_user_profile', 'update_sport_settings'],
    priority: 82,
    fallbackSkill: 'general_chat'
  },
  availability: {
    id: 'availability',
    description:
      'Availability workflows: inspect or update the athlete training schedule, available slots, and day-specific constraints.',
    toolNames: ['get_training_availability', 'update_training_availability'],
    instructionFragment: `## Availability Skill

- Use availability tools when the user asks about their training schedule, available slots, gym access, or day constraints.
- Treat slot updates as mutations to the athlete schedule; do not describe a schedule change without calling the relevant tool.
- If the target day is described relatively or informally, resolve or inspect it with tools before mutating.
- Ask for clarification only when the target day or slot data is ambiguous.
- If approval would be needed, emit the availability mutation tool call first so the system can create the approval request. Without the tool call, there is nothing for the user to approve.
- Do not claim the training availability changed unless the tool actually ran successfully.`,
    contextFlags: ['availability', 'planning', 'time', 'date_context'],
    approvalToolNames: ['update_training_availability'],
    priority: 84,
    fallbackSkill: 'general_chat'
  },
  recommendations: {
    id: 'recommendations',
    description:
      'Recommendation workflows: inspect recommendation details, list pending recommendations, or generate a workout recommendation.',
    toolNames: ['recommend_workout', 'get_recommendation_details', 'list_pending_recommendations'],
    instructionFragment: `## Recommendations Skill

- Use recommendation tools when the athlete asks what workout is recommended, wants recommendation details, or wants to review pending recommendations.
- Ground recommendation summaries in tool output; do not invent recommendation records.
- If the user asks for a recommendation now, call the recommendation tool rather than improvising one from scratch.`,
    contextFlags: ['recommendations', 'planning'],
    approvalToolNames: [],
    priority: 78,
    fallbackSkill: 'general_chat'
  },
  wellness: {
    id: 'wellness',
    description:
      'Wellness and recovery workflows: inspect recovery metrics, log symptoms or wellness events, and manage wellness history.',
    toolNames: [
      'get_wellness_metrics',
      'record_wellness_event',
      'get_wellness_events',
      'update_wellness_event',
      'delete_wellness_event'
    ],
    instructionFragment: `## Wellness Skill

- Use wellness tools for recovery, sleep, soreness, fatigue, symptoms, and subjective wellness logging.
- When the user wants to log, update, or delete a wellness event, call the relevant wellness tool instead of only acknowledging the request.
- If the target event is discoverable from recent wellness history, inspect it with tools before asking the user to restate details.
- For recovery questions, prefer fetching wellness metrics before interpreting how the athlete is doing.
- If approval would be needed, emit the wellness mutation tool call first so the system can create the approval request. Without the tool call, there is nothing for the user to approve.
- Do not claim a wellness event or recovery change was saved unless the tool actually ran successfully.`,
    contextFlags: ['wellness', 'time', 'date_context'],
    approvalToolNames: ['record_wellness_event', 'update_wellness_event', 'delete_wellness_event'],
    priority: 77,
    fallbackSkill: 'general_chat'
  },
  analysis: {
    id: 'analysis',
    description:
      'Analysis and calculation workflows: analyze training load, forecast load, sync data, generate reports, or perform explicit math/calculation requests.',
    toolNames: [
      'analyze_training_load',
      'forecast_training_load',
      'sync_data',
      'generate_report',
      'create_chart',
      'calculate_training_metrics',
      'perform_calculation'
    ],
    instructionFragment: `## Analysis Skill

- Use analysis or calculation tools for training-load analysis, forecasts, zone calculations, conversions, charts, or explicit math.
- Use \`sync_data\` when the user asks to refresh their data or says a recent workout is missing.
- Use \`generate_report\` when the user wants a structured summary of progress (e.g., Weekly Training report).
- Prefer calculation tools over mental math when the user asks for numbers, zones, pace, conversions, or metric formulas.
- When the user asks for analysis of specific workouts or planning records, fetch the relevant records first instead of inferring from memory.
- Create charts only when they materially improve the answer.
- Ground analytical conclusions in the returned tool data; do not invent metrics.`,
    contextFlags: ['analysis', 'workout', 'planning'],
    approvalToolNames: [],
    priority: 76,
    fallbackSkill: 'general_chat'
  },
  nutrition: {
    id: 'nutrition',
    description:
      'Nutrition and hydration workflows: log meals, fix nutrition entries, inspect fueling, and review daily nutrition state.',
    toolNames: [
      'get_current_time',
      'resolve_temporal_reference',
      'get_nutrition_log',
      'log_nutrition_meal',
      'log_hydration_intake',
      'delete_hydration',
      'delete_nutrition_item',
      'patch_nutrition_items',
      'get_fueling_recommendations',
      'get_metabolic_strategy',
      'get_daily_fueling_status',
      'get_meal_recommendations',
      'lock_meal_to_plan'
    ],
    instructionFragment: `## Nutrition Skill

- When logging food or hydration "now" or for the current moment, call \`get_current_time\` first and pass the exact local time.
- For relative day references in nutrition writes like "yesterday", "last night", or "tomorrow", call \`resolve_temporal_reference\` before mutating.
- When a meal log references a past meal as the source context, such as "same as yesterday", "same as last Friday", or "same as 2026-03-01", first call \`get_nutrition_log\` for that historical date instead of estimating from memory.
- Reuse the historical meal's actual macro profile when the referenced meal is found. If the user changes the portion size, scale the retrieved calories and macros proportionally rather than falling back to a generic estimate.
- For nutrition corrections, prefer \`patch_nutrition_items\` instead of deleting and recreating entries.
- If the user refers to an existing meal item by name or context rather than item ID, first inspect the relevant nutrition log to discover the exact item ID before patching or deleting.
- Explain nutrition results clearly and keep recommendations grounded in the returned data.
- When the user has provided enough information to log, patch, or delete a nutrition entry, call the relevant nutrition tool immediately.
- If approval is required, the approval UI must come from the nutrition tool call itself.
- If approval would be needed, emit the nutrition tool call first so the system can create the approval request. Without the tool call, there is nothing for the user to approve.
- Never ask for approval in plain text without first invoking the relevant nutrition tool.
- Do not claim a nutrition change was saved unless the tool actually ran successfully.`,
    contextFlags: ['nutrition', 'time', 'date_context'],
    approvalToolNames: ['delete_nutrition_item', 'delete_hydration'],
    priority: 75,
    fallbackSkill: 'general_chat'
  },
  general_chat: {
    id: 'general_chat',
    description:
      'General conversation, coaching, and questions that do not currently require tools.',
    toolNames: [],
    instructionFragment: `## General Chat Skill

- Answer directly when tools are not needed.
- Do not invent tool outputs or claim actions that were not executed.`,
    contextFlags: [],
    approvalToolNames: [],
    priority: 10
  }
}

function uniq<T>(values: T[]) {
  return [...new Set(values)]
}

function sortSkillIds(skillIds: ChatSkillId[]) {
  return [...skillIds].sort(
    (a, b) => CHAT_SKILL_MANIFESTS[b].priority - CHAT_SKILL_MANIFESTS[a].priority
  )
}

function stripApprovalInstructionLines(fragment: string) {
  return fragment
    .split('\n')
    .filter((line) => !/approval|approve/i.test(line))
    .join('\n')
}

function getRecentConversationSummary(messages: any[], limit = 4) {
  const normalized = messages
    .slice(-limit)
    .map((message: any) => {
      const role = message?.role || 'unknown'
      const text =
        typeof message?.content === 'string'
          ? message.content
          : Array.isArray(message?.parts)
            ? message.parts
                .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
                .map((part: any) => part.text)
                .join(' ')
            : Array.isArray(message?.content)
              ? message.content
                  .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
                  .map((part: any) => part.text)
                  .join(' ')
              : ''

      if (!text.trim()) return null
      return `${role}: ${text.trim().slice(0, 280)}`
    })
    .filter(Boolean)

  return normalized.join('\n')
}

function getLatestUserText(messages: any[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user') continue

    if (typeof message.content === 'string' && message.content.trim()) {
      return message.content.trim()
    }

    const text = Array.isArray(message.parts)
      ? message.parts
          .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
          .map((part: any) => part.text)
          .join(' ')
          .trim()
      : ''

    if (text) return text
  }

  return ''
}

function buildRouterPrompt(params: {
  messages: any[]
  roomMetadata?: Record<string, any> | null
  requireToolApproval?: boolean
  nutritionTrackingEnabled?: boolean
}) {
  const latestUserText = getLatestUserText(params.messages)
  const recentConversation = getRecentConversationSummary(params.messages)
  const historySummary =
    typeof params.roomMetadata?.historySummary === 'string'
      ? params.roomMetadata.historySummary.slice(0, 500)
      : ''

  const skillsText = sortSkillIds([...CHAT_SKILL_IDS]).map((skillId) => {
    const skill = CHAT_SKILL_MANIFESTS[skillId]
    return `- ${skill.id}: ${skill.description}`
  })

  return `You route multilingual athlete-chat turns into skill bundles.

Choose from these skills:
${skillsText.join('\n')}

Rules:
- Prefer the smallest set of skills that can answer the current turn.
- Multiple skills are allowed when one skill provides the main workflow and another provides required helper context or supporting tools.
- Use "support" for tickets, issues, bugs, or support workflows.
- Use "planning_read" for upcoming/planned workout questions.
- Use "planning_write" for creating, moving, adjusting, publishing, or deleting planned workouts or availability.
- Use "workout_read" for completed or recent workout analysis.
- Use "workout_update" for edits to a completed workout record.
- Use "profile" for athlete profile, sport settings, zones, units, or preference changes.
- Use "availability" for schedule slots, training availability, gym access, or day constraints.
- Use "recommendations" for workout recommendations or recommendation details.
- Use "wellness" for recovery metrics, symptom logging, sleep, soreness, fatigue, or wellness history.
- Use "analysis" for training-load analysis, forecasting, explicit math, pace/zones calculations, or charts.
- Use "nutrition" for meal, hydration, fueling, or nutrition-log requests.
- Use "general_chat" when no tools are needed right now.
- If a write workflow is already in progress and the user reports a problem with approval UI, missing buttons, or asks what happened, keep the original write skill in the bundle. You may add "support", but do not replace the write skill with support-only routing.
- Preserve helper tool access when needed. Example: nutrition logging "right now" still needs time-related helper tools; relative-day writes still need temporal resolution tools.
- Never route a turn to tool-free behavior if the assistant still needs tools to safely complete or explain an in-progress mutation.
- If unsure, return skillIds ["general_chat"] and useTools false.
- This router must work across languages. Infer intent semantically, not by English-only wording.
- No more than 3 skills.
- useTools should be true only when the current turn needs tool access now.

Context:
- Tool approval enabled: ${params.requireToolApproval ? 'yes' : 'no'}
- Nutrition tracking enabled: ${params.nutritionTrackingEnabled === false ? 'no' : 'yes'}
${historySummary ? `- Room history summary: ${historySummary}` : ''}

Recent conversation:
${recentConversation || '(none)'}

Latest user message:
${latestUserText || '(empty)'}`
}

function normalizeChatSkillSelection(raw: Partial<ChatSkillSelection> | null | undefined) {
  const validSkillIds = uniq(
    Array.isArray(raw?.skillIds)
      ? raw!.skillIds.filter((skillId): skillId is ChatSkillId =>
          CHAT_SKILL_IDS.includes(skillId as ChatSkillId)
        )
      : []
  )

  const confidence = Number.isFinite(raw?.confidence) ? Number(raw?.confidence) : 0
  const useTools = !!raw?.useTools
  const normalizedSkillIds =
    validSkillIds.length > 0 ? validSkillIds.filter((skillId) => skillId !== 'general_chat') : []

  if (confidence < ROUTER_CONFIDENCE_THRESHOLD || normalizedSkillIds.length === 0) {
    return {
      skillIds: ['general_chat'] as ChatSkillId[],
      confidence,
      useTools: false,
      reason: raw?.reason || 'Low-confidence or empty router result.',
      usedFallback: true,
      source: 'fallback' as const
    }
  }

  return {
    skillIds: sortSkillIds(normalizedSkillIds),
    confidence,
    useTools,
    reason: raw?.reason,
    usedFallback: false,
    source: 'router' as const
  }
}

function inferToolNameFromPart(part: any) {
  if (typeof part?.toolName === 'string' && part.toolName) return part.toolName
  if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
    return part.type.slice('tool-'.length)
  }
  return null
}

function getPendingApprovalToolNames(messages: any[]) {
  const toolNames = new Set<string>()

  for (const message of messages) {
    const metadata = message?.metadata || {}
    const pendingApprovals = Array.isArray(metadata?.pendingApprovals)
      ? metadata.pendingApprovals
      : []

    for (const pending of pendingApprovals) {
      if (typeof pending?.toolName === 'string' && pending.toolName) {
        toolNames.add(pending.toolName)
      }
    }

    const parts = Array.isArray(message?.parts)
      ? message.parts
      : Array.isArray(message?.content)
        ? message.content
        : []

    for (const part of parts) {
      const state = typeof part?.state === 'string' ? part.state : ''
      const toolName = inferToolNameFromPart(part)
      if (state === 'approval-requested' && toolName) {
        toolNames.add(toolName)
      }
    }
  }

  return [...toolNames]
}

function latestUserMentionsApprovalUiIssue(messages: any[]) {
  const latestUserText = getLatestUserText(messages).toLowerCase()
  if (!latestUserText) return false

  const patterns = [
    'approve',
    'approval',
    'button',
    'gomb',
    'cannot see',
    "can't see",
    'dont see',
    "don't see",
    'nem latom',
    'nem látom',
    'missing',
    'not visible',
    'where is'
  ]

  return patterns.some((pattern) => latestUserText.includes(pattern))
}

function latestUserLooksLikeApprovalContinuation(messages: any[]) {
  const latestUserText = getLatestUserText(messages).trim().toLowerCase()
  if (!latestUserText) return false

  if (latestUserMentionsApprovalUiIssue(messages)) {
    return true
  }

  const exactMatches = new Set([
    'yes',
    'y',
    'ok',
    'okay',
    'sure',
    'approve',
    'approved',
    'go ahead',
    'do it',
    'proceed',
    'confirm',
    'confirmed',
    'delete it',
    'cancel it',
    'no',
    'nope',
    'stop',
    'dont',
    "don't",
    'igen',
    'jó',
    'jo',
    'mehet',
    'torold',
    'töröld',
    'ne',
    'nem'
  ])

  if (exactMatches.has(latestUserText)) {
    return true
  }

  const phrasePatterns = [
    'approve',
    'approved',
    'go ahead',
    'do it',
    'proceed',
    'confirm',
    'confirmed',
    'delete it',
    'cancel it',
    'yes,',
    'no,',
    'igen,',
    'mehet',
    'töröld',
    'torold'
  ]

  return phrasePatterns.some((pattern) => latestUserText.includes(pattern))
}

function latestUserLooksLikeRetryRequest(messages: any[]) {
  const latestUserText = getLatestUserText(messages).trim().toLowerCase()
  if (!latestUserText) return false

  const exactMatches = new Set([
    'retry',
    'retry it',
    'try again',
    'again',
    'once more',
    'please retry',
    'run it again',
    'probaljuk meg ujra',
    'próbáljuk meg újra',
    'ujra',
    'újra',
    'megint'
  ])

  if (exactMatches.has(latestUserText)) {
    return true
  }

  const phrasePatterns = [
    'retry',
    'try again',
    'once more',
    'again',
    'run it again',
    'probaljuk meg ujra',
    'próbáljuk meg újra',
    'ujra',
    'újra',
    'megint'
  ]

  return phrasePatterns.some((pattern) => latestUserText.includes(pattern))
}

function looksLikeRetryableToolFailureAssistantMessage(message: any) {
  if (message?.role !== 'assistant') {
    return false
  }

  const skillSelection = message?.metadata?.skillSelection
  const skillIds = Array.isArray(skillSelection?.skillIds)
    ? skillSelection.skillIds.filter((skillId: any): skillId is ChatSkillId =>
        CHAT_SKILL_IDS.includes(skillId as ChatSkillId)
      )
    : []

  if (!skillSelection?.useTools || !skillIds.some((skillId) => skillId !== 'general_chat')) {
    return false
  }

  const content = String(message?.content || '').toLowerCase()

  return (
    /retry your last message|response issue|technical issue|processing issue/.test(content) ||
    Boolean(message?.metadata?.turnFailureReason)
  )
}

export function getSkillIdsForToolNames(toolNames: string[]) {
  const matches = uniq(
    toolNames.flatMap((toolName) =>
      Object.values(CHAT_SKILL_MANIFESTS)
        .filter((skill) => skill.toolNames.includes(toolName))
        .map((skill) => skill.id)
    )
  )

  return sortSkillIds(matches.filter((skillId) => skillId !== 'general_chat'))
}

export function getContinuationSkillSelection(messages: any[]): ChatSkillSelection | null {
  const toolCallToName = new Map<string, string>()

  for (const message of messages) {
    const parts = Array.isArray(message?.parts)
      ? message.parts
      : Array.isArray(message?.content)
        ? message.content
        : []

    for (const part of parts) {
      const toolCallId = part?.toolCallId || part?.approvalId
      const toolName = inferToolNameFromPart(part)
      if (
        toolCallId &&
        toolName &&
        toolName !== 'approval-response' &&
        toolName !== 'approval-request'
      ) {
        toolCallToName.set(toolCallId, toolName)
      }
    }
  }

  const latestMessage = messages[messages.length - 1]
  if (latestMessage?.role !== 'tool') {
    return null
  }

  const latestParts = Array.isArray(latestMessage?.parts)
    ? latestMessage.parts
    : Array.isArray(latestMessage?.content)
      ? latestMessage.content
      : []

  const continuationToolNames = uniq(
    latestParts
      .filter((part: any) => part?.type === 'tool-approval-response')
      .map((part: any) => toolCallToName.get(part.toolCallId || part.approvalId))
      .filter((toolName): toolName is string => !!toolName)
  )

  if (!continuationToolNames.length) {
    return null
  }

  const skillIds = getSkillIdsForToolNames(continuationToolNames)
  if (!skillIds.length) {
    return null
  }

  return {
    skillIds,
    confidence: 1,
    useTools: true,
    reason: 'Continuation of an approved tool action.',
    usedFallback: false,
    source: 'continuation'
  }
}

export function getPendingApprovalSkillSelection(messages: any[]): ChatSkillSelection | null {
  const pendingToolNames = getPendingApprovalToolNames(messages)
  if (!pendingToolNames.length) {
    return null
  }

  if (!latestUserLooksLikeApprovalContinuation(messages)) {
    return null
  }

  const skillIds = getSkillIdsForToolNames(pendingToolNames)
  if (!skillIds.length) {
    return null
  }

  const combinedSkillIds = latestUserMentionsApprovalUiIssue(messages)
    ? sortSkillIds(uniq([...skillIds, 'support']))
    : skillIds

  return {
    skillIds: combinedSkillIds,
    confidence: 1,
    useTools: true,
    reason:
      'A previously prepared approval-required action is still pending, so preserve the original tool domain and any support context.',
    usedFallback: false,
    source: 'pending_approval'
  }
}

export function getRetryContinuationSkillSelection(messages: any[]): ChatSkillSelection | null {
  if (!latestUserLooksLikeRetryRequest(messages)) {
    return null
  }

  for (let index = messages.length - 2; index >= 0; index -= 1) {
    const message = messages[index]
    if (!looksLikeRetryableToolFailureAssistantMessage(message)) {
      continue
    }

    const skillIds = sortSkillIds(
      uniq(
        ((message?.metadata?.skillSelection?.skillIds as ChatSkillId[]) || []).filter(
          (skillId) => skillId !== 'general_chat'
        )
      )
    )

    if (!skillIds.length) {
      continue
    }

    return {
      skillIds,
      confidence: 1,
      useTools: true,
      reason:
        'Retry the most recent failed tool-enabled action instead of falling back to general chat.',
      usedFallback: false,
      source: 'retry_continuation'
    }
  }

  return null
}

async function logRouterUsage(params: {
  userId: string
  turnId: string
  provider: string
  model: string
  success: boolean
  promptPreview: string
  responsePreview: string
  durationMs: number
  usage?: {
    inputTokens?: number
    outputTokens?: number
    inputTokenDetails?: { cacheReadTokens?: number }
    outputTokenDetails?: { reasoningTokens?: number }
  } | null
  errorMessage?: string | null
  errorType?: string | null
}) {
  const promptTokens = params.usage?.inputTokens || 0
  const completionTokens = params.usage?.outputTokens || 0
  const cachedTokens = params.usage?.inputTokenDetails?.cacheReadTokens || 0
  const reasoningTokens = params.usage?.outputTokenDetails?.reasoningTokens || 0

  await prisma.llmUsage
    .create({
      data: {
        userId: params.userId,
        turnId: params.turnId,
        provider: params.provider,
        model: params.model,
        modelType: 'router',
        operation: 'chat_skill_router',
        entityType: 'ChatTurn',
        entityId: params.turnId,
        promptTokens,
        completionTokens,
        cachedTokens,
        reasoningTokens,
        totalTokens: promptTokens + completionTokens,
        estimatedCost:
          params.provider === 'gemini'
            ? calculateLlmCost(
                params.model,
                promptTokens,
                completionTokens + reasoningTokens,
                cachedTokens
              )
            : 0,
        durationMs: params.durationMs,
        success: params.success,
        errorType: params.errorType || null,
        errorMessage: params.errorMessage || null,
        promptPreview: params.promptPreview.slice(0, 500),
        responsePreview: params.responsePreview.slice(0, 500)
      }
    })
    .catch(() => null)
}

export async function classifyChatSkills(
  params: ChatSkillRouterParams
): Promise<ChatSkillSelection> {
  const continuation = getContinuationSkillSelection(params.messages)
  if (continuation) {
    await logRouterUsage({
      userId: params.userId,
      turnId: params.turnId,
      provider: 'internal',
      model: 'approval_continuation',
      success: true,
      promptPreview: getLatestUserText(params.messages) || '(continuation)',
      responsePreview: JSON.stringify(continuation),
      durationMs: 0
    })
    return continuation
  }

  const pendingApproval = getPendingApprovalSkillSelection(params.messages)
  if (pendingApproval) {
    await logRouterUsage({
      userId: params.userId,
      turnId: params.turnId,
      provider: 'internal',
      model: 'pending_approval_context',
      success: true,
      promptPreview: getLatestUserText(params.messages) || '(pending approval)',
      responsePreview: JSON.stringify(pendingApproval),
      durationMs: 0
    })
    return pendingApproval
  }

  const retryContinuation = getRetryContinuationSkillSelection(params.messages)
  if (retryContinuation) {
    await logRouterUsage({
      userId: params.userId,
      turnId: params.turnId,
      provider: 'internal',
      model: 'retry_continuation',
      success: true,
      promptPreview: getLatestUserText(params.messages) || '(retry continuation)',
      responsePreview: JSON.stringify(retryContinuation),
      durationMs: 0
    })
    return retryContinuation
  }

  const prompt = buildRouterPrompt(params)
  const startedAt = Date.now()
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY
  })

  try {
    const { object, usage } = await generateObject({
      model: google(ROUTER_MODEL_ID),
      schema: skillSelectionSchema,
      prompt,
      maxRetries: 1
    })

    const selection = normalizeChatSkillSelection(object as ChatSkillSelection)

    await logRouterUsage({
      userId: params.userId,
      turnId: params.turnId,
      provider: 'gemini',
      model: ROUTER_MODEL_ID,
      success: true,
      promptPreview: prompt,
      responsePreview: JSON.stringify(selection),
      durationMs: Date.now() - startedAt,
      usage: usage as any
    })

    return selection
  } catch (error: any) {
    const selection: ChatSkillSelection = {
      skillIds: ['general_chat'],
      confidence: 0,
      useTools: false,
      reason: 'Router error fallback.',
      usedFallback: true,
      source: 'fallback'
    }

    await logRouterUsage({
      userId: params.userId,
      turnId: params.turnId,
      provider: 'gemini',
      model: ROUTER_MODEL_ID,
      success: false,
      promptPreview: prompt,
      responsePreview: JSON.stringify(selection),
      durationMs: Date.now() - startedAt,
      errorType: 'ROUTER_FAILED',
      errorMessage: error?.message || 'Chat skill routing failed.'
    })

    return selection
  }
}

export function selectToolsForSkills(
  allTools: Record<string, any>,
  skillIds: ChatSkillId[],
  options: { useTools?: boolean } = {}
) {
  if (!options.useTools) return {}

  const selectedSkillIds = uniq(
    skillIds.filter((skillId): skillId is ChatSkillId =>
      CHAT_SKILL_IDS.includes(skillId as ChatSkillId)
    )
  )

  const contextFlags = uniq(
    selectedSkillIds.flatMap((skillId) => CHAT_SKILL_MANIFESTS[skillId]?.contextFlags || [])
  )

  const selectedToolNames = uniq([
    ...selectedSkillIds.flatMap((skillId) => CHAT_SKILL_MANIFESTS[skillId]?.toolNames || []),
    ...(contextFlags.includes('time') ? ['get_current_time'] : []),
    ...(contextFlags.includes('date_context') ? ['resolve_temporal_reference'] : [])
  ]).filter((toolName) => !isChatToolTemporarilyDisabled(toolName))

  const selectedTools = Object.fromEntries(
    Object.entries(allTools).filter(([toolName]) => selectedToolNames.includes(toolName))
  )

  return filterChatToolsForChat(selectedTools)
}

async function toolRequiresApproval(tool: any) {
  if (!tool) return false
  if (typeof tool.needsApproval === 'boolean') return tool.needsApproval
  if (typeof tool.needsApproval === 'function') {
    try {
      return !!(await tool.needsApproval())
    } catch {
      return false
    }
  }
  return false
}

export async function resolveApprovalToolNamesForSelection(
  tools: Record<string, any>,
  options: {
    aiRequireToolApproval?: boolean
    useTools?: boolean
  } = {}
) {
  if (!options.aiRequireToolApproval || !options.useTools) {
    return []
  }

  const approvalToolNames: string[] = []

  for (const [toolName, tool] of Object.entries(tools)) {
    if (await toolRequiresApproval(tool)) {
      approvalToolNames.push(toolName)
    }
  }

  return approvalToolNames.sort()
}

export function composeSkillInstructions(
  baseInstruction: string,
  skillIds: ChatSkillId[],
  context: ComposeSkillInstructionsContext = {}
) {
  const selectedSkills = sortSkillIds(
    uniq(
      skillIds.filter((skillId): skillId is ChatSkillId =>
        CHAT_SKILL_IDS.includes(skillId as ChatSkillId)
      )
    )
  )

  if (!selectedSkills.length || selectedSkills.every((skillId) => skillId === 'general_chat')) {
    return `${baseInstruction}\n\n${CHAT_SKILL_MANIFESTS.general_chat.instructionFragment}`
  }

  if (!context.useTools) {
    const contextualDomains = selectedSkills.filter((skillId) => skillId !== 'general_chat')
    const contextualHint = contextualDomains.length
      ? `- Domain context for this turn: ${contextualDomains.join(', ')}.\n- Answer without tools and never imply a tool action was executed.`
      : ''

    return [
      baseInstruction,
      '## Active Skill Instructions',
      CHAT_SKILL_MANIFESTS.general_chat.instructionFragment,
      contextualHint
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  const fragments = selectedSkills
    .map((skillId) => {
      const baseFragment =
        context.aiRequireToolApproval === false
          ? stripApprovalInstructionLines(CHAT_SKILL_MANIFESTS[skillId].instructionFragment)
          : CHAT_SKILL_MANIFESTS[skillId].instructionFragment

      if (skillId === 'nutrition' && context.nutritionTrackingEnabled === false) {
        return `${baseFragment}\n- Nutrition tracking may be limited; handle missing nutrition data explicitly.`
      }

      return baseFragment
    })
    .join('\n\n')

  const approvalToolNames = uniq(context.approvalToolNames || [])

  const approvalInstruction = approvalToolNames.length
    ? `## Active Approval Rules

The following tools require explicit user approval before execution:
${approvalToolNames.map((toolName) => `- \`${toolName}\``).join('\n')}

When using any of these tools:
- Do not claim the action is already done before approval.
- Approval only exists after you emit the actual tool call in this turn. Without the tool call, there is nothing for the user to approve.
- If the request is specific enough, emit the tool call immediately and let the system render the approval UI.
- Do not ask the user to click **Approve** or to confirm in prose as a substitute for making the tool call.
- If the user approves a prepared tool action, immediately execute that approved tool.
- If the user responds with text instead of approving, the draft is cancelled and must be re-created if still needed.
- If the user denies approval, treat it as user intent and ask what should change.`
    : ''

  const executionIntegrityInstruction =
    context.aiRequireToolApproval === false
      ? `## Execution Integrity Rules

- Never claim that a write action was completed, is currently being applied, or was handled manually unless a matching tool call actually succeeded in this turn.
- When helper tools are available for the selected domains, use them instead of improvising missing facts like the current time, resolved date, or record IDs.
- When tools are enabled and the user refers to an existing record by title, date, rough timeframe, or descriptive text, use discovery/read tools first to identify the exact target before mutating.
- Do not finish a tool-enabled turn with zero tool calls unless you are asking a specific blocking clarification question that names the missing detail.
- If tools are enabled for this turn and the user has already provided enough information, prefer calling the relevant tool over answering with unsupported free text.`
      : `## Execution Integrity Rules

- Never claim that a write action was completed, is currently being applied, or was handled manually unless a matching tool call actually succeeded in this turn.
- If a write action still needs approval, say it is pending approval. Do not imply it already happened.
- If approval is required for a write action, approval must come from a real tool call in this turn. Never ask the user to approve, confirm, or click **Approve** unless that tool call has already been emitted.
- If the user reports that approval UI is missing or broken, explain that the action is blocked until approval can be completed or the action is re-issued through the proper tool flow.
- When helper tools are available for the selected domains, use them instead of improvising missing facts like the current time, resolved date, or record IDs.
- When tools are enabled and the user refers to an existing record by title, date, rough timeframe, or descriptive text, use discovery/read tools first to identify the exact target before mutating.
- Do not finish a tool-enabled turn with zero tool calls unless you are asking a specific blocking clarification question that names the missing detail.
- If tools are enabled for this turn and the user has already provided enough information, prefer calling the relevant tool over answering with unsupported free text.`

  return [
    baseInstruction,
    '## Active Skill Instructions',
    fragments,
    approvalInstruction,
    executionIntegrityInstruction
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function getChatSkillManifests() {
  return CHAT_SKILL_MANIFESTS
}
