# Coaching Experience Upgrade: Athlete Groups

This plan outlines the implementation of a new feature for coaches to organize their athletes into groups. This will improve management efficiency for coaches with many athletes (e.g., teams, training squads).

## 1. Database Schema Changes

### New Models

- `CoachGroup`: Represents a named collection of athletes owned by a coach.
- `CoachGroupMember`: Join table for Many-to-Many relationship between groups and athletes (Users).

### Relationship

- A coach (User) can have many `CoachGroup`s.
- A `CoachGroup` can have many `CoachGroupMember`s.
- An athlete (User) can belong to many `CoachGroupMember`s.
- An athlete in a group MUST have a `CoachingRelationship` with the group's owner (coach).

## 2. API Endpoints

- `GET /api/coaching/groups`: List all groups for the current coach (with member count).
- `POST /api/coaching/groups`: Create a new group.
- `GET /api/coaching/groups/:id`: Get group details and list of members.
- `PATCH /api/coaching/groups/:id`: Update group metadata (e.g., name).
- `DELETE /api/coaching/groups/:id`: Delete a group.
- `POST /api/coaching/groups/:id/members`: Add an athlete to a group.
- `DELETE /api/coaching/groups/:id/members/:athleteId`: Remove an athlete from a group.

## 3. Frontend Implementation

### UI Components

- `app/components/coaching/GroupList.vue`: Displays a list of groups with summary info.
- `app/components/coaching/GroupCard.vue`: Card representing a group.
- `app/components/coaching/GroupModal.vue`: For creating/editing groups.
- `app/components/coaching/GroupMemberManager.vue`: Component to add/remove athletes from a group.

### Page Updates

- `app/pages/coaching/athletes/index.vue`:
  - Add a "Groups" view toggle or section.
  - Allow filtering athletes by group.
- `app/pages/coaching/groups/[id].vue`: Dedicated page for group management (optional, could be in modals).

## 4. Implementation Steps

### Phase 1: Database & Migration

1. Update `prisma/schema.prisma`.
2. Generate and apply migration.

### Phase 2: Backend API

1. Implement the CRUD endpoints in `server/api/coaching/groups/`.
2. Add validation to ensure coaches only manage groups they own and add athletes they are connected to.

### Phase 3: Frontend

1. Build the UI components for group management.
2. Integrate group management into the main "My Athletes" roster.
3. Add group-based filtering to the athlete list.
