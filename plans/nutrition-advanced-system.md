# Plan: Dynamic Periodized Fueling System (Implementation Spec)

## 1. Goal

Transition from static "Daily Goals" to a **Dynamic Periodized Fueling** system. The system adjusts nutritional targets (specifically carbohydrates) based on the **Energy Demand** and **Timing** of planned and completed training. This logic is anchored in "Fuel for the Work Required" and "Train High, Sleep Low" periodization models.

## 2. Core Logic: "The Metabolic Engine"

We will implement a `calculateFuelingStrategy(profile, workout)` function.

### A. Inputs

- **Athlete Profile**: `weight` (kg), `ftp`, `carbRatio` (1.2 for high-carb adaptation).
- **Metabolic Profile**: `currentCarbMax` (g/hr tolerance), `sweatRate` (L/hr), `sodiumTarget` (mg/L).
- **Workout**: `duration` (minutes), `intensityFactor` (IF), `kJ` (work done/planned), `strategyOverride` (e.g., 'TRAIN_LOW').

### B. Fueling Zones (Logic Table)

| Workout Intensity   | Zone Description | Duration Threshold | Intra-Workout Carbs (g/hr)  | Pre-Workout (g/kg) | Post-Workout (Ratio) | Supplements (Auto-Add)         |
| :------------------ | :--------------- | :----------------- | :-------------------------- | :----------------- | :------------------- | :----------------------------- |
| **Z1 / Recovery**   | IF < 0.60        | Any                | **0g** (Water/Electrolytes) | 0.5g (Light meal)  | 0.2g P / 0.5g C      | None                           |
| **Z2 / Endurance**  | IF 0.60 - 0.75   | < 90 min           | **0g - 30g**                | 1.0g               | 0.3g P / 0.8g C      | -                              |
| **Z2 / Long**       | IF 0.60 - 0.75   | > 90 min           | **30g - 60g**               | 1.5g               | 0.3g P / 1.0g C      | -                              |
| **Z3 / Tempo**      | IF 0.76 - 0.89   | > 60 min           | **60g - 90g**               | 2.0g               | 0.3g P / 1.2g C      | Nitrate Load (2h prior)        |
| **Z4+ / Threshold** | IF > 0.90        | Any                | **90g+**                    | 3.0g               | 0.4g P / 1.5g C      | Caffeine (200mg), Beta-Alanine |

### C. Logic Overrides ("Pro" Features)

The `calculateFuelingStrategy` function applies these overrides _before_ finalizing values:

1.  **Gut Training Cap**:
    - `targetCarbs = Math.min(calculatedTarget, userSettings.currentCarbMax)`
    - If `calculatedTarget > currentCarbMax`, add advice: _"Your workout demands 90g/hr, but we capped you at 60g/hr to prevent GI distress. Practice 75g next week."_

2.  **"Train Low" Protocol**:
    - If `workout.strategyOverride == 'TRAIN_LOW'`:
      - **Pre-Workout**: 0g Carbs (Fasted / Protein only).
      - **Intra-Workout**: 0g Carbs (Water + Electrolytes only).
      - **Post-Workout**: **Increased Protein** (0.5g/kg) to support adaptation, moderate carbs delayed.

### D. The `fuelingPlan` JSON Structure

The `Nutrition` model will store a calculated plan in this format:

```typescript
interface Supplement {
  name: string // "Caffeine", "Nitrates", "Sodium"
  dosage: string // "200mg", "500ml", "1000mg"
  timing: string // "30 min before", "During", "Post-workout"
}

interface FuelingWindow {
  type: 'PRE_WORKOUT' | 'INTRA_WORKOUT' | 'POST_WORKOUT' | 'DAILY_BASE'
  startTime: string // ISO timestamp
  endTime: string
  targetCarbs: number // grams (e.g. 60g)
  targetProtein: number // grams
  targetHydration: number
  targetSodium?: number // mg (New for Pro hydration)
  plannedWorkoutId?: string // Link to the driving factor
  status: 'PENDING' | 'HIT' | 'MISSED' | 'PARTIAL'
  actualCarbs?: number // Filled from logging logic
  advice: string // "Consume 60g carbs/hr during ride"
  supplements?: Supplement[] // New for Pro
  notes?: string // "Train Low session: Avoid carbs before/during."
}

interface FuelingPlan {
  generatedAt: string
  strategy: 'HIGH_CARB' | 'MODERATE' | 'LOW_CARB' | 'TRAIN_LOW'
  windows: FuelingWindow[]
  dailyTotals: {
    calories: number
    carbs: number
    protein: number
    fat: number
  }
}
```

## 3. Schema & Data Model Hardening

### A. New Model: `UserNutritionSettings`

Stores the athlete's metabolic profile & preferences.

```prisma
model UserNutritionSettings {
  id              String   @id @default(uuid())
  userId          String   @unique

  // Baselines (Rest Day / Non-Training)
  bmr             Int      // Mapped from weight/height/age
  activityLevel   String   // SEDENTARY, ACTIVE, VERY_ACTIVE
  baseProteinPerKg Float   @default(1.6) // Pro-standard (1.6 - 2.2)
  baseFatPerKg     Float   @default(1.0)

  // Gut Training & Limits
  currentCarbMax   Int      @default(60)  // Current stomach capacity (g/hr)
  ultimateCarbGoal Int      @default(90)  // Target capacity

  // Hydration Precision
  sweatRate        Float?   // L/hr (optional/measured)
  sodiumTarget     Int      @default(750) // mg per Liter of fluid

  // Timing Preferences
  preWorkoutWindow   Int @default(120) // Minutes before
  postWorkoutWindow  Int @default(60)  // Minutes after

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### B. Updated Model: `Nutrition`

Enhance traceability and planning.

```prisma
model Nutrition {
  // ... existing fields ...

  // The Computed Plan
  fuelingPlan     Json?    // Stores the FuelingPlan interface

  // Traceability & Locking
  isManualLock    Boolean  @default(false) // If true, auto-calc will NOT overwrite daily totals, only update advice
  sourcePrecedence String? // 'MANUAL', 'AI', 'INTEGRATION'

  // Relations are essentially the same
}
```

### C. Updated Model: `PlannedWorkout` (via Metadata/JSON)

We don't need a schema migration for `strategyOverride` if we store it in `rawJson` or a flexible column, but adding a dedicated field is cleaner for querying.

```prisma
model PlannedWorkout {
  // ... existing fields ...
  fuelingStrategy  String?  // 'STANDARD', 'TRAIN_LOW', 'HIGH_CARB_TEST'
}
```

## 4. State Machine: Workout Re-calculation

We need a background task that reacts to **Workout Completions** to adjust the _rest of the day_.

### Trigger: `workout.created` or `workout.updated`

**Logic Flow:**

1. **Fetch**: Get the Completed Workout and the associated `PlannedWorkout` (if any).
2. **Compare**: Calculate `Intensity Factor` (IF) and `Kilojoules` (kJ) for both.
3. **Threshold Check**:
   - If Actual kJ > Planned kJ + 10% OR Actual IF > Planned IF + 0.05:
   - **Trigger Re-calc**: Increase `POST_WORKOUT` recovery targets.
   - **Update Plan**: Modify `fuelingPlan` for the `POST_WORKOUT` window and `DAILY_BASE` (Dinner).
4. **Notify**: Send a push/system message: _"Harder ride than planned! Bumped recovery carbs by 50g."_

### Trigger: `daily-checkin.created` (Morning Process)

**Logic Flow:**

1.  **Check Yesterday**: Look up yesterday's `Workout` summary.
2.  **Excess Load Check**: If yesterday's `actualKJ` > `plannedKJ` \* 1.2 (20% surplus):
3.  **Rest Day Bridge**:
    - If today is a Rest Day (or Z1 Recovery), _increase_ `DAILY_BASE` (Breakfast/Lunch) carbs.
    - Rationale: Glycogen replenishment spills over 24-48h after massive depletion.
    - Advice: _"Yesterday was huge. Eat an extra portion of oats this morning to top off glycogen."_

### Trigger: `planned-workout.updated` (Intervals.icu Sync)

1. **Fetch**: Get the new planned structure.
2. **Re-run Logic**: Regenerate `fuelingPlan` windows based on new duration/intensity.

## 5. API & Chat Tool Design

### Tool: `get_fueling_recommendations`

Exposes the fueling plan to the AI agent.

**Input**:

- `date` (optional, default today)
- `userId`

**Output (JSON)**:

```json
{
  "summary": "Threshold Ladder today. Focus on 90g/hr intra-workout + Caffeine.",
  "windows": [
    {
      "time": "06:00 - 08:00",
      "type": "PRE_WORKOUT",
      "recommendation": "120g Carbs (Bagel + Jam, Banana)",
      "supplements": [{ "name": "Caffeine", "dosage": "200mg", "timing": "30 mins prior" }],
      "status": "PENDING"
    },
    {
      "time": "08:00 - 10:00",
      "type": "INTRA_WORKOUT",
      "recommendation": "90g Carbs/hr (Cap applied: 75g/hr). Hydration: 1.5L w/ 1200mg Sodium.",
      "status": "UPCOMING"
    }
  ],
  "daily_macros_left": {
    "carbs": 250,
    "protein": 120
  }
}
```

## 6. Implementation Checklist

### Phase 1: Schema & Utilities

- [ ] Create `UserNutritionSettings` model with "Pro" fields (Gut training, Sodium).
- [ ] Update `Nutrition` model with `fuelingPlan`.
- [ ] Implement `calculateFuelingStrategy` utility function (Math + Overrides).

### Phase 2: Background Tasks (Trigger.dev)

- [ ] Create `trigger/generate-fueling-plan.ts`.
  - Listens for `planned-workout` events.
  - Applies "Train Low" logic if flagged.
- [ ] Create `trigger/adjust-fueling-post-workout.ts`.
  - Listens for `workout` events.
  - Performs Delta check (Planned vs Actual).

### Phase 3: Chat Integration

- [ ] Implement `get_fueling_recommendations` tool.
- [ ] Update System Prompt to understand "Fueling Windows" & Supplements.

### Phase 4: UI Updates

- [ ] Update Nutrition Details page to visualize the `fuelingPlan` timeline (Pre/Intra/Post bars).

### Phase 5: "Pro" Polish (Advanced Triggers)

- [ ] **TTE Logic**: Ensure `calculateFuelingStrategy` prioritizes Pre-Workout over Intra-Workout for short (<45m) high-intensity sessions.
- [ ] **Last Call Notification**: 2h before workout: _"Fuel up now! Target: 60g carbs."_
- [ ] **Hunger Sensor**: If `sleepScore` < 70 & `hrv` < baseline, suggest late-night Casein protein.
