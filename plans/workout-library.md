# Workout Library Implementation Plan

## 1. Objective

Implement a high-performance, AI-integrated **Workout Library** for Coach Watts that allows users to save, organize, and intelligently reuse structured workouts. The goal is to leapfrog existing platforms (TrainingPeaks, Intervals.icu) by moving from "digital filing cabinets" to an "intelligent workout assistant" that understands intent and context.

## 2. Scope

In scope:

- **Data Modeling**: New `WorkoutTemplate` schema with semantic metadata.
- **Backend API**: CRUD operations for library management and template application.
- **AI Integration**: New chat tools for auto-categorization, semantic search, and "Save to Library" flows.
- **Frontend UI**: Library management interface using Nuxt UI v4, including visual workout previews.
- **Calendar Integration**: Ability to schedule library workouts onto the training calendar.

Out of scope:

- Community sharing/marketplace (future phase).
- Video-based workout tutorials.
- Synchronous group training features.

## 3. Principles (Stellar Library Design)

1. **Intent over JSON**: Templates should store the "why" (physiological target, coaching intent) not just the "what" (intervals).
2. **Semantic Discovery**: Users should find workouts by intent (e.g., "spicy climbing session") rather than just exact titles.
3. **Frictionless Capture**: Saving a workout should be as easy as a single click or a chat command.
4. **Smart Scaling**: Library workouts should automatically adapt to the user's current FTP/Zones when applied to the calendar.
5. **Mobile-First Scannability**: High-density layouts with visual intensity profiles for quick recognition.

## 4. Workstreams And Task List

### A) Data Architecture & Schema (P0)

**Files**:

- `prisma/schema.prisma`

**Tasks**:

- [ ] Define `WorkoutTemplate` model with semantic fields:
  - `sport` (Enum: BIKE, RUN, SWIM, STRENGTH)
  - `tags` (String[])
  - `intensityFactor` (Float)
  - `targetZone` (Int)
  - `durationMinutes` (Int)
  - `usageAnalytics` (lastUsedAt, usageCount)
- [ ] Run `npx prisma migrate dev --name add_workout_library_model`
- [ ] Update `User` model relations if necessary.

### B) Backend API & Core Logic (P0)

**Files**:

- `server/api/library/workouts/index.get.ts`
- `server/api/library/workouts/index.post.ts`
- `server/api/library/workouts/[id].patch.ts`
- `server/api/library/workouts/[id].delete.ts`
- `server/api/library/workouts/[id]/plan.post.ts`

**Tasks**:

- [ ] Implement CRUD endpoints with strict `userId` scoping.
- [ ] Create utility for converting `PlannedWorkout` -> `WorkoutTemplate` (cloning logic).
- [ ] Create utility for applying `WorkoutTemplate` -> `PlannedWorkout` (scheduling logic).
- [ ] Ensure `formatDateUTC` is used for all scheduling operations.

### C) AI & Chat Integration (P0)

**Files**:

- `server/utils/ai-tools/library-tools.ts`
- `server/utils/ai-tools.ts` (Registration)

**Tasks**:

- [ ] Implement `save_to_workout_library` tool:
  - Extracts `structuredWorkout` from context.
  - AI-generates tags and descriptions automatically.
- [ ] Implement `search_workout_library` tool:
  - Supports semantic intent (e.g., "something intense under 60 mins").
  - Returns a list of matching templates for the AI to present.

### D) Frontend: Library Management (P1)

**Files**:

- `app/pages/workouts/library.vue`
- `app/components/workout/LibraryCard.vue`
- `app/components/workout/LibraryPreview.vue`

**Tasks**:

- [ ] Build the library grid view using `UDashboardPanel` and `UCard`.
- [ ] Implement "Smart Filter" bar with text and tag filtering.
- [ ] Create a Tailwind-based bar chart component for intensity visualization in the list view.
- [ ] Add "Save to Library" button to existing planned workout views.

### E) Integration & Calendar Flow (P1)

**Files**:

- `app/components/calendar/CalendarDayCell.vue`
- `app/pages/plan/index.vue`

**Tasks**:

- [ ] Add "Add from Library" action to calendar day cells.
- [ ] Implement a modal for picking a template and adjusting duration/intensity before scheduling.
- [ ] Verify real-time WebSocket updates when a library workout is scheduled.

## 5. Suggested Execution Order

1. **Phase 1 (Foundation)**: Schema update (A) + Core CRUD APIs (B).
2. **Phase 2 (Capture)**: AI Tool for saving (C) + "Save" button in UI (D).
3. **Phase 3 (Discovery)**: Library UI (D) + AI semantic search (C).
4. **Phase 4 (Refinement)**: Calendar integration (E) + visual previews (D).

## 6. Definition Of Done

- [ ] Users can save any generated or planned workout to their personal library.
- [ ] AI can accurately suggest library workouts based on conversational intent.
- [ ] Library workouts display visual intensity profiles for quick scanning.
- [ ] Scheduling a library workout to the calendar correctly scales to current user zones.
- [ ] Full mobile responsiveness and performance (lazy loading for large libraries).
