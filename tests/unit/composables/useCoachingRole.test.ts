import { describe, it, expect } from 'vitest'
import { resolveCoachingRole } from '~/components/navigation/useCoachingRole'

describe('resolveCoachingRole (CW-103)', () => {
  it('shows the full coaching suite for an active coach', () => {
    const role = resolveCoachingRole({
      coachedAthletesCount: 3,
      pendingCoachRequestsCount: 0,
      ownCoachesCount: 0
    })

    expect(role.isCoachForAnyone).toBe(true)
    expect(role.isPureAthlete).toBe(false)
    expect(role.showFullCoachingSuite).toBe(true)
  })

  it('shows the full coaching suite for a coach awaiting first athlete approval', () => {
    const role = resolveCoachingRole({
      coachedAthletesCount: 0,
      pendingCoachRequestsCount: 2,
      ownCoachesCount: 0
    })

    expect(role.isCoachForAnyone).toBe(true)
    expect(role.isPureAthlete).toBe(false)
    expect(role.showFullCoachingSuite).toBe(true)
  })

  it('treats a user connected to a coach with no coaching relationships of their own as a pure athlete', () => {
    const role = resolveCoachingRole({
      coachedAthletesCount: 0,
      pendingCoachRequestsCount: 0,
      ownCoachesCount: 1
    })

    expect(role.isCoachForAnyone).toBe(false)
    expect(role.isPureAthlete).toBe(true)
    expect(role.showFullCoachingSuite).toBe(false)
  })

  it('keeps the full suite for a brand-new user with no coaching relationships at all', () => {
    const role = resolveCoachingRole({
      coachedAthletesCount: 0,
      pendingCoachRequestsCount: 0,
      ownCoachesCount: 0
    })

    expect(role.isCoachForAnyone).toBe(false)
    expect(role.isPureAthlete).toBe(false)
    expect(role.showFullCoachingSuite).toBe(true)
  })

  it('prioritizes the coach suite when a user both coaches others and has their own coach', () => {
    const role = resolveCoachingRole({
      coachedAthletesCount: 1,
      pendingCoachRequestsCount: 0,
      ownCoachesCount: 1
    })

    expect(role.isCoachForAnyone).toBe(true)
    expect(role.isPureAthlete).toBe(false)
    expect(role.showFullCoachingSuite).toBe(true)
  })
})
