# Coaching Invite System Overhaul Plan

This plan outlines the implementation of a more integrated and user-friendly invitation and onboarding system for Coach Watts, including universal join URLs, QR code support, group-specific invites, and teammate privacy controls.

## 1. Background & Motivation

Currently, Coach Watts handles coaching relationships and team memberships as separate, fragmented flows. Athletes generate codes to invite coaches, and teams generate codes to invite members. This requires manual back-and-forth and lacks direct onboarding into specific team structures (like groups).

The goal is to unify these into a single "Join" flow, simplify the coach-driven onboarding, and provide better privacy controls for team environments.

## 2. Scope & Impact

- **Join Flow**: A new `/join/[code]` route for both athlete-to-coach and team-to-member invitations.
- **Team Onboarding**: Automatic group assignment when joining a team via a group-specific invite.
- **Coach Onboarding**: Allow coaches to add athletes to their professional teams directly using the athlete's personal invite code.
- **Privacy**: A new `teamVisibility` setting for users to control data visibility in team rosters.
- **QR Codes**: Native QR code generation for sharing any invite link.

## 3. Database & Schema Changes

### 3.1 `prisma/schema.prisma` Updates

- **`User` Model**:
  - Add `teamVisibility TeamVisibility? @default(COACHES_ONLY)`
  - Add `enum TeamVisibility { COACHES_ONLY, TEAMMATES }`
- **`TeamInvite` Model**:
  - Add `groupId String?`
  - Add `group AthleteGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)`
- **`AthleteGroup` Model**:
  - Add `invites TeamInvite[]`

```prisma
enum TeamVisibility {
  COACHES_ONLY
  TEAMMATES
}

model User {
  // ... existing fields ...
  teamVisibility TeamVisibility? @default(COACHES_ONLY)
}

model TeamInvite {
  // ... existing fields ...
  groupId String?
  group   AthleteGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)
}

model AthleteGroup {
  // ... existing fields ...
  invites TeamInvite[]
}
```

### 3.2 Join URL Structure

The universal join URL will follow the pattern:
`https://coachwatts.com/join/[code]`

Where `[code]` can be either a **Team Invitation Code** or an **Athlete's Personal Invitation Code**.

## 4. Implementation Plan

### Phase 1: Database & Repositories

1.  Update `prisma/schema.prisma` and run `npx prisma migrate dev --name add_team_invitation_improvements`.
2.  Update `teamRepository.ts`:
    - Modify `createTeamInvite` to accept optional `groupId`.
    - Modify `acceptInvite` to automatically add the user to the `groupId` if present.
3.  Add `addAthleteToTeamByPersonalCode` to `teamRepository.ts`:
    - Handles the combined flow: Accept Coaching Relationship + Add to Team.

### Phase 2: API Enhancements

1.  **Universal Join Endpoint**:
    - `GET /api/join/[code]`: Identifies the invite type (Team vs. Coaching) and returns metadata (name, role, inviter).
    - `POST /api/join/[code]`: Processes the join action.
2.  **Team Invites**:
    - Update `POST /api/coaching/teams/[id]/invites` to accept `groupId`.
3.  **Coach-Driven Onboarding**:
    - `POST /api/coaching/teams/[id]/join-by-code`: For coaches to add a new athlete to the team using their `CoachingInvite` code.
4.  **Roster Privacy**:
    - Update `GET /api/coaching/teams/[id]/roster`:
      - Allow athletes to access the roster.
      - Mask sensitive data (metrics, trends) if the teammate's `teamVisibility` is `COACHES_ONLY` and the viewer is not a staff member.
5.  **Settings**:
    - Update `PATCH /api/profile/settings` to allow updating `teamVisibility`.

### Phase 3: Frontend - Join Page & Sharing

1.  **New Page**: `app/pages/join/[code].vue`:
    - Detects invite type and shows a friendly "Join [Team Name]" or "Connect with [Athlete Name]" interface.
    - Handles "Confirm Join" action.
2.  **QR Code Utility**:
    - Extract QR code generation into a reusable component or composable (leveraging the `qrcode` library already in use).
3.  **Invite Management UI**:
    - Update `app/pages/coaching/team/index.vue` and `app/pages/coaching/teams/[id].vue` to include:
      - "Copy URL" button (links to `/join/[code]`).
      - "Show QR Code" modal.

### Phase 4: Frontend - Team Management Overhaul

1.  **Refactor "Add Athlete" Modal** (`app/pages/coaching/teams/[id].vue`):
    - 2-tab layout:
      - **Tab 1: Connected Athletes**: Search through currently coached athletes (existing logic).
      - **Tab 2: By Invite Code**: Add a new athlete directly by entering their "Invite a Coach" code.
2.  **Group Selector in Invite Modal**:
    - Allow selecting a group when generating a team invite code.

### Phase 5: Frontend - Privacy Settings

1.  Update `app/pages/profile/settings.vue`:
    - Add a "Privacy" section with "Team Visibility" (Coaches Only vs. Teammates).

## 5. Verification & Testing

### 5.1 Manual Verification

- Generate a team invite with a group ID, use the join link, and verify the user is added to both the team and the group.
- As a coach, use an athlete's personal code in the Team dashboard and verify they are connected to both the coach and the team.
- Verify that an athlete viewing the roster sees their teammates but cannot see metrics for those who have restricted visibility.
- Scan QR codes with a mobile device to ensure they redirect correctly to the `/join/` URL.

### 5.2 Automated Testing

- Add unit tests for `teamRepository.acceptInvite` with group logic.
- Add integration tests for the new join API endpoints.
