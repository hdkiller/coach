# Fix Athlete Unit Selection and Preferences

This plan addresses issues where user unit preferences (distance, height, weight, elevation, temperature) are not correctly applied in AI prompts and certain UI components.

## Objective

- Centralize AI prompt unit formatting logic in `server/utils/ai-prompt-format.ts`.
- Update all AI trigger tasks to use centralized formatting, respecting user preferences.
- Implement "Distance Units for Elevation" logic (Miles -> Feet, Kilometers -> Meters).
- Fix height data corruption in AI prompts (raw CM being labeled as ft/in).
- Fix hardcoded metric labels in Strength workout prompts.
- Ensure imperial unit support for temperature in AI analysis.

## Proposed Changes

### 1. Centralize Formatting Logic (DONE)

Created `server/utils/ai-prompt-format.ts` with:

- `formatPromptWeight`
- `formatPromptHeight`
- `formatPromptDistance`
- `formatPromptElevation`
- `formatPromptTemperature`
- `formatPromptPace`

### 2. Update AI Trigger Tasks

#### `trigger/analyze-workout.ts`

- Update imports to include `formatPromptHeight`, `formatPromptDistance`, `formatPromptElevation`, `formatPromptTemperature`, and `formatPromptPace`.
- Replace local `formatPromptWeight` and `formatPaceFromSecondsPerKm` with centralized versions.
- Update `buildWorkoutAnalysisPrompt` to use these helpers for distance, elevation, temperature, and height.
- Update strength exercise formatting to use user weight units if available (or stay metric if hevy provides raw kg, but ideally convert). _Note: Hevy provides kg, but we should label it correctly or convert._

#### `trigger/generate-athlete-profile.ts`

- Update imports.
- Update height and weight formatting in the user profile block.
- Use `formatPromptHeight` to fix the `Height: 180 ft/in` bug.

#### `trigger/generate-weekly-plan.ts`

- Update height and weight formatting.

#### `trigger/daily-checkin.ts`

- Update height and weight formatting.

#### `trigger/suggest-goals.ts`

- Update height and weight formatting.
- Fix hardcoded weight units in goal suggestions.

#### `trigger/analyze-last-3-workouts.ts` / `trigger/analyze-last-7-nutrition.ts`

- Ensure weight and distance are formatted correctly.

### 3. Fix Ambiguity in Elevation

- Use `distanceUnits` to determine elevation units (Miles -> Feet, Kilometers -> Meters).

### 4. Improve AI Tools (Chat)

- Update `server/utils/ai-tools/profile.ts` to ensure `update_user_profile` handles incoming weight/height by converting to metric before saving, based on the _provided_ or _current_ user units.

### 5. Frontend Fixes (Optional/Future if scope is strictly Trigger tasks)

- `FitnessWellnessEditModal.vue`: Update labels to be dynamic based on user profile.
- `ExerciseList.vue`: Update labels for weight (kg/lbs) and distance (m/ft).

## Verification Plan

### Automated Tests

- Run existing trigger tests to ensure no regressions in prompt structure.
- Create unit tests for `server/utils/ai-prompt-format.ts`.

### Manual Verification

- Trigger a workout analysis for a user with "Miles" and "Feet" preferences and verify the prompt (via logs) contains correctly converted values (e.g., Distance in miles, Elevation in feet, Height in ft/in).
- Verify the "Athlete Profile" generation doesn't show "180 ft/in" for height.
- Test "Update my weight to 150 lbs" in chat and verify the database record is ~68kg.
