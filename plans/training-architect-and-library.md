# Training Architect & Library System

## 1. Objective

Establish a high-performance system for creating, managing, and sharing training content. This system separates "Active Training" (current user calendar) from "Architectural Blueprints" (reusable templates). The goal is to provide a dedicated workspace for drafting professional-grade training plans and individual workout structures.

## 2. Core Concepts

### A) Library vs. Active Separation

- **Library**: A sandbox for "Blueprints." No absolute dates, no completion status, and no synchronization with external hardware.
- **Active**: The implementation of a blueprint. Tied to specific calendar dates, user zones (FTP/Pace), and completion tracking.

### B) Relative Indexing (The Foundation)

To ensure plans are reusable across different years and users, we move away from calendar dates within the library.

- **Day Index**: (0-6) representing the day of the week (Monday-Sunday).
- **Week Index**: (1-N) representing the sequence within a block or plan.

---

## 3. Workstreams & Task List

### Phase 1: Data Architecture & Schema (P0)

**Objective**: Formalize the relative indexing model to replace the current "dummy date" hack.

- [x] **Schema Update**:
  - Add `dayIndex` (Int) and `weekIndex` (Int) to `PlannedWorkout`.
  - Add `isPublic` (Boolean), `slug` (String, Unique), and `difficulty` (Int) to `TrainingPlan`.
  - Enhance `WorkoutTemplate` with `category` and `sport` metadata.
- [x] **Migration**: Refactor existing templates to move workout dates into the `dayIndex` field.
- [x] **Expansion Service**: Refactor the activation logic to "inflate" a relative-indexed template into an absolute-dated active plan.

### Phase 2: The Workout Library (P1)

**Objective**: A central repository for individual structured sessions.

- [x] **Capture Logic**: Expand the "Save to Library" API to handle "Unstructured to Structured" conversion using AI.
- [x] **Manual Editor**: Build a dedicated UI for creating structured workouts from scratch (Warmup, Intervals, Cooldown).
- [x] **AI Assistant**: New chat tools to:
  - [x] "Generate a VO2Max session and save it to my library."
  - [x] "Find a climbing workout in my library under 90 minutes."

### Phase 3: The Plan Architect (P0)

**Objective**: A dedicated, date-less editor for building multi-week progressions.

- [x] **Architect View**: New route `/library/plans/[id]/architect`.
- [x] **Relative Timeline**: A vertical grid showing "Week 1, Week 2..." instead of specific dates.
- [x] **Library Sidebar**: A searchable drawer of the Workout Library for drag-and-drop planning.
- [ ] **Structural Tools**:
  - [x] "Duplicate Week" functionality.
  - [x] "Delete Block" functionality.
  - [ ] "Shift Block" (move entire multi-week sections).
  - [ ] "Relative Move" (drag workout from Week 1 Monday to Week 3 Friday).

### Phase 4: Community & Public Sharing (P2)

**Objective**: Enable public discovery and import of high-quality plans.

- [ ] **Public Gallery**: New route `/library/explore` to browse community-contributed plans.
- [ ] **SEO Optimization**: Generate clean URLs based on slugs (e.g., `/plans/advanced-marathon-prep`).
- [ ] **Import Engine**: One-click "Clone to My Library" for public plans.
- [ ] **Curation Tools**: Allow admins to "Verify" or "Feature" specific plans.

### Phase 5: AI-Assisted Architecture (P1)

**Objective**: Use AI to reduce the manual labor of planning.

- [ ] **Strategic Prompting**: "Fill this 4-week Base block with workouts from my library, increasing volume by 10% each week."
- [ ] **Intelligent Scaling**: Automatically adjust workout targets when importing a plan based on the user's recent performance history and current FTP.

---

## 4. Technical Strategy

### Date Handling

In the **Architect**, all date calculations must be pure integer math (`dayIndex + (weekIndex * 7)`). Absolute `Date` objects are strictly prohibited in the library logic to prevent timezone and leap-year drift.

### Component Reusability

The `PlanDashboard.vue` logic should be abstracted into a base renderer that can operate in two modes:

1.  **Calendar Mode**: (Active) Uses absolute dates and syncs to Intervals.icu.
2.  **Architect Mode**: (Library) Uses relative indices and manages structural blueprints.

## 5. Definition of Done

- Users can build a multi-block training plan without picking a start date.
- Individual workouts can be saved, edited, and dragged into any plan template.
- Templates can be shared via public, SEO-friendly URLs.
- Activation correctly maps Day 0 to the user's chosen "Start Date" (e.g., next Monday).
