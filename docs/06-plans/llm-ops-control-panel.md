# LLM Operations Control Panel - Implementation Plan

## Overview

This feature allows administrators to fine-tune LLM parameters (model selection, thinking budget, etc.) based on the user's selected **AI Analysis Level** (Quick, Thoughtful, Experimental). This ensures cost control for standard users while providing high-intelligence reasoning for power users who opt-in to more advanced levels.

## 1. Requirements

### A. Core Capabilities

- **Analysis Level Routing**: Map user preferences (`flash`, `pro`, `experimental`) to different Gemini models.
- **Hierarchical Overrides**:
  1.  **Level Default**: Standard settings for all operations within an analysis level.
  2.  **Operation Override**: Specific settings for a single operation (e.g., higher reasoning for `generate_training_block`) within a level.
- **Reasoning Control**: Set `thinkingBudget` (2.5 models) and `thinkingLevel` (3.0 models) per group/operation.
- **Experimental Access**: Allow users on high-tier plans to opt-in to experimental models for cutting-edge features.
- **Real-time Updates**: Changes should take effect immediately without server restarts.

### B. Parameters to Control

- `model`: 'flash' | 'pro'
- `modelId`: Exact Gemini identifier (e.g., `gemini-3-pro-preview`)
- `thinkingBudget`: 0 - 16,000 (for Gemini 2.5)
- `thinkingLevel`: 'minimal' | 'low' | 'medium' | 'high' (for Gemini 3.0)
- `maxSteps`: Limit multi-step tool calls

### C. Identified Operations

The following operations can be fine-tuned:

- **Chat**: `chat`, `chat_ws`, `chat_title_generation`
- **Profiling & Plans**: `athlete_profile_generation`, `generate_training_block`, `weekly_plan_generation`, `plan_structure`
- **Analysis**: `workout_analysis`, `nutrition_analysis`, `wellness_analysis`, `analyze_plan_adherence`
- **Recommendations**: `activity_recommendation`, `generate_recommendations`, `daily_coach_suggestion`, `deduplicate_recommendations`
- **Reports**: `weekly_report_generation`, `custom_report_generation`, `unified_report_generation`
- **Workouts**: `generate_structured_workout`, `adjust_structured_workout`, `generate_ad_hoc_workout`
- **Utilities**: `goal_review`, `goal_suggestions`, `workout_score_explanation_batch`, `nutrition_score_explanation_batch`, `workout_trends_explanation`, `nutrition_trends_explanation`

## 2. Technical Architecture

### A. Database Schema

```prisma
model LlmAnalysisLevelSettings {
  id               String   @id @default(uuid())
  level            String   @unique // 'flash', 'pro', 'experimental'
  model            String   @default("flash")
  modelId          String   @default("gemini-flash-latest")
  thinkingBudget   Int      @default(2000)
  thinkingLevel    String   @default("low")
  maxSteps         Int      @default(3)
  updatedAt        DateTime @updatedAt
  overrides        LlmOperationOverride[]
}

model LlmOperationOverride {
  id                       String   @id @default(uuid())
  analysisLevelSettingsId  String
  operation                String   // e.g., 'generate_training_block'
  model                    String?  // Optional: override level default
  modelId                  String?
  thinkingBudget           Int?     // Optional: override level default
  thinkingLevel            String?  // Optional: override level default
  maxSteps                 Int?     // Optional: override level default
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt
  analysisLevelSettings     LlmAnalysisLevelSettings @relation(fields: [analysisLevelSettingsId], references: [id], onDelete: Cascade)

  @@unique([analysisLevelSettingsId, operation])
}
```

### B. Configuration Engine

- Update `getLlmOperationSettings(userId, operation)`:
  1.  Resolve `level` (from user preference `aiModelPreference`).
  2.  Fetch `LlmAnalysisLevelSettings` for that level with `overrides`.
  3.  Find specific override for the `operation`.
  4.  Merge: `Override ?? Default`.
- Use memory cache with `level:operation` keying.

## 3. UI/UX Design (`/admin/llm/settings`)

### A. Analysis Level Dashboard

- **Grid**: Separate cards for Quick, Thoughtful, and Experimental levels.
- **Model Selector**: Dropdown to switch between Flash (low cost) and Pro (high intelligence).
- **Reasoning Sliders**:
  - For Flash: Numeric input/slider for `thinkingBudget`.
  - For Pro/3.0: Level selector (Minimal -> High).
- **Override Management**: Table view for operation-specific adjustments.

## 4. Implementation Steps

1.  **Phase 1: DB & Utils (Infrastructure)**
    - Run Prisma migration for `LlmTierSettings`.
    - Seed default values matching current behavior.
    - Create `server/utils/ai-settings.ts` to provide a cached getter for tier parameters.

2.  **Phase 2: API & Logic (Backend)**
    - Create `GET /api/admin/llm/settings` and `POST /api/admin/llm/settings`.
    - Update `generateCoachAnalysis` and `generateStructuredAnalysis` to use the dynamic settings instead of hardcoded budgets.

3.  **Phase 3: Control Panel (Frontend)**
    - Build `/app/pages/admin/llm/settings.vue`.
    - Implement tiered configuration UI using Nuxt UI components.

4.  **Phase 4: Validation**
    - Verify that a Free user request correctly uses the restricted budget while a Pro user gets full reasoning depth.

## 5. Information Collected & Assumptions

- **User Tiers**: Assumed values are `FREE`, `SUPPORTER`, `PRO`.
- **Reasoning Billing**: Confirmed that reasoning tokens are billed as output tokens at the base model rate.
- **Models**: Control will focus on `gemini-flash-latest` (2.5) and `gemini-3-flash-preview` (3.0).

---

_Created on 2026-02-07_
