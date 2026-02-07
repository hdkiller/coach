# LLM Operations Control Panel - Implementation Plan

## Overview

This feature allows administrators to fine-tune LLM parameters (model selection, thinking budget, etc.) globally or per subscription tier (Free, Supporter, Pro). This ensures cost control for free users while providing high-intelligence reasoning for paid subscribers.

## 1. Requirements

### A. Core Capabilities

- **Tier & Status Routing**: Map subscription tiers (`FREE`, `SUPPORTER`, `PRO`) AND special user statuses (`CONTRIBUTOR`) to different Gemini models.
- **Hierarchical Overrides**:
  1.  **Tier Default**: Standard settings for all operations within a tier.
  2.  **Operation Override**: Specific settings for a single operation (e.g., higher reasoning for `generate_training_block`) within a tier.
- **Reasoning Control**: Set `thinkingBudget` (2.5 models) and `thinkingLevel` (3.0 models) per group/operation.
- **Contributor Beta Access**: Allow developers/contributors to use the most advanced models with high reasoning budgets for testing.
- **Real-time Updates**: Changes should take effect immediately without server restarts.

### B. Parameters to Control

- `model`: 'flash' | 'pro'
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

Update `LlmTierSettings` to include a reference to overrides, or use a new `LlmOperationOverride` model:

```prisma
model LlmTierSettings {
  id               String   @id @default(uuid())
  tier             String   @unique // 'FREE', 'SUPPORTER', 'PRO', 'CONTRIBUTOR'
  model            String   @default("flash")
  thinkingBudget   Int      @default(2000)
  thinkingLevel    String   @default("low")
  maxSteps         Int      @default(3)
  updatedAt        DateTime @updatedAt
  overrides        LlmOperationOverride[]
}

model LlmOperationOverride {
  id               String   @id @default(uuid())
  tierSettingsId   String
  operation        String   // e.g., 'generate_training_block'
  model            String?  // Optional: override tier default
  thinkingBudget   Int?     // Optional: override tier default
  thinkingLevel    String?  // Optional: override tier default
  maxSteps         Int?     // Optional: override tier default
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  tierSettings     LlmTierSettings @relation(fields: [tierSettingsId], references: [id], onDelete: Cascade)

  @@unique([tierSettingsId, operation])
}
```

### B. Configuration Engine

- Update `getLlmOperationSettings(userId, operation)`:
  1.  Resolve `targetTier` (Contributor vs. Subscription).
  2.  Fetch `LlmTierSettings` for that tier with `overrides`.
  3.  Find specific override for the `operation`.
  4.  Merge: `Override ?? Default`.
- Use memory cache with `tier:operation` keying.

## 3. UI/UX Design (`/admin/llm/settings`)

### A. Tier Management Dashboard

- **Tabs/Grid**: Separate columns for Free, Supporter, and Pro tiers.
- **Model Selector**: Dropdown to switch between Flash (low cost) and Pro (high intelligence).
- **Reasoning Sliders**:
  - For Flash: Numeric input/slider for `thinkingBudget`.
  - For Pro/3.0: Level selector (Minimal -> High).
- **Cost Preview**: Dynamic estimate of "Cost per 1k requests" based on the selected parameters and current rates.

### B. Monitoring Integration

- Quick links back to the `cw:cli llm stats` data to see current performance vs. new limits.

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
