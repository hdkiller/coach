# Coaching Experience: Strategic Plan

## 1. Executive Summary

The goal is to transition the current coaching experience from a basic "impersonation" model to a robust, **coach-first platform**. Instead of logging in as the athlete, coaches need a dedicated suite of tools to efficiently manage multiple athletes, build reusable training assets, monitor compliance, and analyze performance from a centralized command center.

## 2. Core Features (Coach-First Paradigm)

### A. The Coach's Command Center (Roster Overview) [IN PROGRESS]

- **Global Athlete Dashboard:** A single, dense tabular or card-based view displaying all assigned athletes. (Basic Grid Done)
- **Key Metrics at a Glance:** Instantly view current Fatigue (ATL), Fitness (CTL), Form (TSB), and overall readiness for each athlete. (In Progress)
- **Attention Flags:** Automatically highlight athletes requiring action (e.g., missed workouts, left feedback).
- **Quick Actions:** One-click access to message an athlete, view their calendar, or adjust their next block.

### B. Dedicated Athlete Profile (Non-Impersonated) [IN PROGRESS]

- **Contextual Identity:** Dedicated routes (`/coaching/athletes/[id]`) that maintain coach identity while viewing athlete data. (Done)
- **Coach's Calendar View:** A specialized calendar showing the athlete's completed vs. planned workouts side-by-side. Includes inline editing and drag-and-drop. (Scaffolded)
- **Performance Analytics:** Direct access to the athlete's performance curves and historical trends. (Basic Chart Done)

### C. Workout Library & Builder

- **Structured Workout Builder:** Advanced visual tool to create interval-based workouts. (Existing, needs coach-specific library integration)
- **Coach's Personal Library:** Centralized repository where coaches can save and organize workouts.
- **Drag-and-Drop Scheduling:** Drag workouts from library sidebar directly onto athlete calendars.

### D. Training Plan Templates

- **Dynamic Plan Creation:** Build reusable, multi-week training blocks.
- **Event Anchoring:** Apply a plan to an athlete that automatically schedules relative to a race date.

### E. Communication & Compliance

- **Workout-Level Feedback:** Direct commenting system on individual activities.
- **Compliance Scoring:** Automatic calculation of how closely the athlete followed the prescribed workout.

## 3. Phased Implementation Strategy

### Phase 1: Foundations & The Coach Dashboard (Current)

- **Objective:** Remove reliance on impersonation for basic management.
- **Tasks:**
  - [x] Establish DB relationships and permissions.
  - [x] Create non-impersonated athlete detail routes.
  - [x] Build enriched API for cross-user data fetching.
  - [ ] Fix metrics display and chart reactivity.
  - [ ] Implement "Attention Flags" on the roster.

### Phase 2: The Coach's Calendar & Scheduling

- **Objective:** Allow coaches to actively manage training.
- **Tasks:**
  - [ ] Build `CoachAthleteCalendar` component.
  - [ ] Enable "Add Planned Workout" for an athlete from the coach's view.
  - [ ] Implement "Sync to Intervals" trigger from the coach view.

### Phase 3: Reusability & Efficiency

- **Objective:** Scale the coaching business.
- **Tasks:**
  - [ ] Implement Coach's Personal Library.
  - [ ] Enable Library -> Calendar drag-and-drop.
  - [ ] Build Block/Template application logic.
