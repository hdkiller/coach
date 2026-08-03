import { describe, expect, it } from 'vitest'
import {
  sanitizeSharedWellness,
  sanitizeSharedReport,
  sanitizeSharedTrainingPlan
} from '../../../../../server/utils/share-response'

describe('share response sanitizers (CW-147)', () => {
  it('strips wellness internal/PII and clinical fields', () => {
    const result = sanitizeSharedWellness({
      id: 'wellness-1',
      userId: 'user-1',
      date: '2026-07-28',
      recoveryScore: 82,
      readiness: 8,
      hrv: 65,
      sleepHours: 7.5,
      aiAnalysisJson: { executive_summary: 'Recovered well' },
      rawJson: { secret: true },
      comments: 'private coach note',
      history: [{ source: 'oura' }],
      lastSource: 'oura',
      feedback: 'thumbs_up',
      feedbackText: 'private feedback',
      customMetrics: { privateKey: 1 },
      aiAnalysis: 'raw analysis text',
      aiAnalysisStatus: 'COMPLETED',
      aiAnalyzedAt: '2026-07-28T12:00:00.000Z',
      bloodGlucose: 95,
      diastolic: 80,
      systolic: 120,
      injury: 'knee',
      menstrualPhase: 'follicular',
      lactate: 1.2,
      abdomen: 80,
      bodyFat: 12,
      hydration: 'dehydrated',
      hydrationVolume: 500,
      skinTemp: 36.5,
      tags: 'Alcohol,Sick'
    })

    expect(result).toEqual({
      id: 'wellness-1',
      date: '2026-07-28',
      recoveryScore: 82,
      readiness: 8,
      hrv: 65,
      sleepHours: 7.5,
      aiAnalysisJson: { executive_summary: 'Recovered well' }
    })

    for (const denied of [
      'userId',
      'rawJson',
      'comments',
      'history',
      'feedbackText',
      'bloodGlucose',
      'injury',
      'menstrualPhase',
      'customMetrics',
      'tags'
    ]) {
      expect(result).not.toHaveProperty(denied)
    }
  })

  it('excludes a hypothetical future Wellness field not present in the allowlist', () => {
    // Simulates a new column being added to the Prisma Wellness model in the
    // future. Because sanitizeSharedWellness is allowlist-based, an unknown
    // field must be dropped by default instead of leaking automatically.
    const result = sanitizeSharedWellness({
      id: 'wellness-2',
      date: '2026-07-29',
      recoveryScore: 90,
      futureClinicalMetric: 'super-secret-future-field'
    })

    expect(result).toEqual({
      id: 'wellness-2',
      date: '2026-07-29',
      recoveryScore: 90
    })
    expect(result).not.toHaveProperty('futureClinicalMetric')
  })

  it('allowlists REPORT / ATHLETE_PROFILE fields and drops private ones', () => {
    const analysisJson = {
      title: 'Athlete Profile',
      executive_summary: 'Strong aerobic base'
    }

    const result = sanitizeSharedReport({
      id: 'report-1',
      userId: 'user-1',
      type: 'ATHLETE_PROFILE',
      status: 'COMPLETED',
      createdAt: '2026-07-28T10:00:00.000Z',
      updatedAt: '2026-07-28T11:00:00.000Z',
      dateRangeStart: '2026-07-01T00:00:00.000Z',
      dateRangeEnd: '2026-07-28T00:00:00.000Z',
      analysisJson,
      markdown: '# Profile',
      suggestions: [{ text: 'Sleep more' }],
      overallScore: 78,
      trainingLoadScore: 70,
      recoveryScore: 80,
      progressScore: 75,
      consistencyScore: 82,
      trainingLoadExplanation: 'Balanced',
      recoveryBalanceExplanation: 'Good',
      progressTrendExplanation: 'Up',
      adaptationReadinessExplanation: 'Ready',
      injuryRiskExplanation: 'Low',
      feedback: 'thumbs_up',
      feedbackText: 'private coach feedback',
      modelVersion: 'gpt-secret',
      latex: '\\documentclass{article}',
      pdfUrl: 'https://internal.example/report.pdf',
      templateId: 'template-1'
    })

    expect(result).toEqual({
      id: 'report-1',
      type: 'ATHLETE_PROFILE',
      status: 'COMPLETED',
      createdAt: '2026-07-28T10:00:00.000Z',
      updatedAt: '2026-07-28T11:00:00.000Z',
      dateRangeStart: '2026-07-01T00:00:00.000Z',
      dateRangeEnd: '2026-07-28T00:00:00.000Z',
      analysisJson,
      markdown: '# Profile',
      suggestions: [{ text: 'Sleep more' }],
      overallScore: 78,
      trainingLoadScore: 70,
      recoveryScore: 80,
      progressScore: 75,
      consistencyScore: 82,
      trainingLoadExplanation: 'Balanced',
      recoveryBalanceExplanation: 'Good',
      progressTrendExplanation: 'Up',
      adaptationReadinessExplanation: 'Ready',
      injuryRiskExplanation: 'Low'
    })

    for (const denied of [
      'userId',
      'feedback',
      'feedbackText',
      'modelVersion',
      'latex',
      'pdfUrl',
      'templateId'
    ]) {
      expect(result).not.toHaveProperty(denied)
    }
  })

  it('sanitizes TRAINING_PLAN share payload and nested workouts', () => {
    const result = sanitizeSharedTrainingPlan({
      id: 'plan-1',
      userId: 'user-1',
      teamId: 'team-1',
      folderId: 'folder-1',
      name: 'Base Build',
      description: '12-week base',
      startDate: '2026-08-01T00:00:00.000Z',
      coachNotes: 'private coach notes',
      athleteNotes: 'private athlete notes',
      customInstructions: 'do not leak',
      fromTemplateId: 'template-9',
      hasBeenSavedAsTemplate: true,
      goal: {
        id: 'goal-1',
        userId: 'user-1',
        title: 'Marathon',
        notes: 'secret goal notes'
      },
      blocks: [
        {
          id: 'block-1',
          name: 'Block A',
          order: 1,
          weeks: [
            {
              id: 'week-1',
              weekNumber: 1,
              workouts: [
                {
                  id: 'workout-1',
                  userId: 'user-1',
                  title: 'Easy Run',
                  type: 'RUN',
                  durationSec: 3600,
                  rawJson: { secret: true },
                  syncStatus: 'SYNCED',
                  syncError: 'boom',
                  externalId: 'ext-1',
                  structureHash: 'hash',
                  pendingRemoteStructuredWorkout: { steps: [] },
                  createdFromSettingsSnapshot: { ftp: 250 },
                  lastGenerationContext: { prompt: 'secret' },
                  shareToken: { token: 'pw-token' }
                }
              ]
            }
          ]
        }
      ]
    })

    expect(result).not.toHaveProperty('userId')
    expect(result).not.toHaveProperty('teamId')
    expect(result).not.toHaveProperty('folderId')
    expect(result).not.toHaveProperty('coachNotes')
    expect(result).not.toHaveProperty('athleteNotes')
    expect(result).not.toHaveProperty('customInstructions')
    expect(result).not.toHaveProperty('fromTemplateId')
    expect(result).not.toHaveProperty('hasBeenSavedAsTemplate')

    expect(result.name).toBe('Base Build')
    expect(result.goal).toEqual({ title: 'Marathon' })

    const workout = (result.blocks as any)[0].weeks[0].workouts[0]
    expect(workout).toEqual({
      id: 'workout-1',
      title: 'Easy Run',
      type: 'RUN',
      durationSec: 3600,
      shareToken: { token: 'pw-token' }
    })
    expect(workout).not.toHaveProperty('userId')
    expect(workout).not.toHaveProperty('rawJson')
    expect(workout).not.toHaveProperty('syncStatus')
    expect(workout).not.toHaveProperty('externalId')
    expect(workout).not.toHaveProperty('lastGenerationContext')
  })

  it('excludes a hypothetical future TrainingPlan field not present in the allowlist', () => {
    // Simulates a new column being added to the Prisma TrainingPlan model in
    // the future. Because sanitizeSharedTrainingPlan is allowlist-based, an
    // unknown top-level field must be dropped by default instead of leaking.
    const result = sanitizeSharedTrainingPlan({
      id: 'plan-2',
      name: 'Peak Block',
      internalBillingTier: 'super-secret-future-field',
      goal: null,
      blocks: []
    })

    expect(result).toEqual({
      id: 'plan-2',
      name: 'Peak Block',
      goal: null,
      blocks: []
    })
    expect(result).not.toHaveProperty('internalBillingTier')
  })
})
