<script setup lang="ts">
  import { EText, EContainer, EHeading, EButton } from 'vue-email'
  import BaseEmailLayout from './BaseEmailLayout.vue'

  defineProps<{
    name?: string
    workoutId: string
    workoutTitle: string
    previewLine?: string
    heroTitle?: string
    introLine?: string
    workoutDate?: string
    workoutType?: string
    durationMinutes?: number
    distanceKm?: number
    elevationGain?: number
    averageCadence?: number
    cadenceUnit?: string
    averageHr?: number
    maxHr?: number
    averageWatts?: number
    normalizedPower?: number
    tss?: number
    tss7d?: number
    weeklyTssBaseline28d?: number
    loadContextLabel?: string
    loadContextBody?: string
    loadDeltaPct?: number
    sportLensLabel?: string
    sportLensBody?: string
    kilojoules?: number
    calories?: number
    workoutsLast7Days?: number
    consistencyMessage?: string
    quickTakeLabel?: string
    quickTakeBody?: string
    efficiencyMessage?: string
    recoveryMessage?: string
    ctaLabel?: string
    nextStepMessage?: string
    workoutUrl?: string
    unsubscribeUrl?: string
  }>()

  const siteUrl = 'https://coachwatts.com'
</script>

<template>
  <BaseEmailLayout
    :preview-text="previewLine || `${workoutTitle} is synced and ready to review.`"
    :unsubscribe-url="unsubscribeUrl"
  >
    <EHeading
      style="
        font-size: 24px;
        line-height: 1.3;
        font-weight: 700;
        color: #09090b;
        margin-top: 0;
        margin-bottom: 20px;
      "
    >
      {{ heroTitle || 'Your workout is synced and ready to review.' }}
    </EHeading>

    <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px">
      Hi {{ name || 'Athlete' }},
    </EText>

    <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 20px">
      {{ introLine || `We added your latest workout to your timeline: ${workoutTitle}` }}
    </EText>

    <EText
      v-if="consistencyMessage"
      style="
        font-size: 14px;
        line-height: 1.6;
        color: #14532d;
        background-color: #ecfdf3;
        border: 1px solid #bbf7d0;
        border-radius: 10px;
        padding: 10px 12px;
        margin: 0 0 16px;
      "
    >
      {{ consistencyMessage }}
    </EText>

    <EText style="font-size: 15px; line-height: 1.6; color: #71717a; margin: 0 0 20px">
      Open your workout details to review splits, heart rate, power, and training load while the
      session is still fresh.
    </EText>

    <EContainer
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 20px;
        border: 1px solid #e4e4e7;
      "
    >
      <EText
        style="
          font-size: 10px;
          font-weight: 900;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin: 0 0 10px;
        "
      >
        Session Snapshot
      </EText>
      <EText v-if="workoutDate" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Date:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ workoutDate }}</span>
      </EText>
      <EText v-if="workoutType" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Type:</strong> {{ workoutType }}
      </EText>
      <EText v-if="durationMinutes" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Duration:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ durationMinutes }} min</span>
      </EText>
      <EText v-if="distanceKm" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Distance:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ distanceKm }} km</span>
      </EText>
      <EText v-if="elevationGain" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Elevation Gain:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ elevationGain }} m</span>
      </EText>
      <EText v-if="averageHr" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Avg HR:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ averageHr }} bpm</span>
      </EText>
      <EText v-if="maxHr" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Max HR:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ maxHr }} bpm</span>
      </EText>
      <EText v-if="averageCadence" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Avg Cadence:</strong>
        <span style="font-variant-numeric: tabular-nums"
          >{{ averageCadence }} {{ cadenceUnit || 'spm' }}</span
        >
      </EText>
      <EText v-if="averageWatts" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Avg Power:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ averageWatts }} W</span>
      </EText>
      <EText v-if="normalizedPower" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">Normalized Power:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ normalizedPower }} W</span>
      </EText>
      <EText v-if="tss" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">TSS:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ tss }}</span>
      </EText>
      <EText v-if="kilojoules" style="font-size: 14px; margin: 0 0 8px; color: #52525b">
        <strong style="color: #09090b">kJ:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ kilojoules }} kJ</span>
      </EText>
      <EText v-if="calories" style="font-size: 14px; margin: 0; color: #52525b">
        <strong style="color: #09090b">Calories:</strong>
        <span style="font-variant-numeric: tabular-nums">{{ calories }} kcal</span>
      </EText>
    </EContainer>

    <EContainer
      style="
        background-color: #fffbeb;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 20px;
        border: 1px solid #fde68a;
      "
    >
      <EText
        style="
          font-size: 10px;
          font-weight: 900;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin: 0 0 10px;
        "
      >
        Load Context
      </EText>
      <EText
        style="
          font-size: 12px;
          color: #78350f;
          margin: 0 0 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        "
      >
        {{ loadContextLabel || 'Balanced training week' }}
      </EText>
      <EText style="font-size: 14px; line-height: 1.6; color: #92400e; margin: 0 0 8px">
        {{
          loadContextBody ||
          'Your recent sessions are contributing meaningful load while keeping progression sustainable.'
        }}
      </EText>
      <EText
        v-if="tss7d || weeklyTssBaseline28d"
        style="
          font-size: 13px;
          line-height: 1.6;
          color: #a16207;
          margin: 0;
          font-variant-numeric: tabular-nums;
        "
      >
        {{ tss7d ? `Last 7d: ${Math.round(tss7d)} TSS` : '' }}
        {{
          weeklyTssBaseline28d
            ? `${tss7d ? ' • ' : ''}4-week weekly baseline: ${Math.round(weeklyTssBaseline28d)}`
            : ''
        }}
        {{ typeof loadDeltaPct === 'number' ? ` • Delta: ${loadDeltaPct}%` : '' }}
      </EText>
    </EContainer>

    <EContainer
      style="
        background-color: #eff6ff;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 20px;
        border: 1px solid #bfdbfe;
      "
    >
      <EText
        style="
          font-size: 10px;
          font-weight: 900;
          color: #1d4ed8;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin: 0 0 10px;
        "
      >
        {{ sportLensLabel || 'Sport Lens' }}
      </EText>
      <EText style="font-size: 14px; line-height: 1.6; color: #1e3a8a; margin: 0">
        {{
          sportLensBody ||
          'Sport-specific context helps translate raw metrics into actionable feedback for your next session.'
        }}
      </EText>
    </EContainer>

    <EContainer
      style="
        background-color: #f8fafc;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 20px;
        border: 1px solid #e2e8f0;
      "
    >
      <EText
        style="
          font-size: 10px;
          font-weight: 900;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin: 0 0 10px;
        "
      >
        Coach's Quick Take
      </EText>
      <EText
        style="
          font-size: 12px;
          color: #0f172a;
          margin: 0 0 8px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        "
      >
        {{ quickTakeLabel || 'Session logged' }}
      </EText>
      <EText style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 8px">
        {{
          quickTakeBody ||
          'Nice work getting this session in. Consistency is what drives long-term gains.'
        }}
      </EText>
      <EText
        v-if="efficiencyMessage"
        style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 8px"
      >
        {{ efficiencyMessage }}
      </EText>
      <EText
        v-if="recoveryMessage"
        style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0"
      >
        {{ recoveryMessage }}
      </EText>
    </EContainer>

    <EText style="font-size: 15px; line-height: 1.6; color: #3f3f46; margin: 0 0 20px">
      <strong style="color: #09090b">What's next?</strong>
      {{ nextStepMessage || 'See how this session impacted your Fitness vs Fatigue trend.' }}
    </EText>

    <div style="text-align: center; margin-bottom: 18px">
      <EButton
        :href="workoutUrl || siteUrl + '/workouts/' + workoutId"
        style="
          background: linear-gradient(135deg, #00dc82 0%, #00c16a 100%);
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
          width: auto;
        "
      >
        {{ ctaLabel || 'View Full Analysis & Splits' }}
      </EButton>
    </div>
  </BaseEmailLayout>
</template>
