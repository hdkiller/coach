<script setup lang="ts">
  import { EText, EContainer, EHeading, EButton, ERow, EColumn } from 'vue-email'
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
    <!-- Dynamic Header Graphic -->
    <svg width="100%" height="40" viewBox="0 0 600 40" preserveAspectRatio="none" style="display: block; margin-bottom: 24px;">
      <defs>
        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00dc82" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#00c16a" stop-opacity="0.9" />
        </linearGradient>
      </defs>
      <path d="M0,40 L600,40 L600,0 L100,0 L0,30 Z" fill="url(#brandGrad)" />
      <polygon points="580,10 590,10 600,0 590,0" fill="#00dc82" />
      <polygon points="560,15 575,15 590,0 575,0" fill="#00c16a" opacity="0.6" />
    </svg>

    <EHeading
      style="
        font-size: 24px;
        line-height: 1.3;
        font-weight: 700;
        color: #09090b;
        margin-top: 0;
        margin-bottom: 20px;
        letter-spacing: -0.025em;
      "
    >
      {{ heroTitle || 'Your workout is synced and ready to review.' }}
    </EHeading>

    <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 24px">
      Hi {{ name || 'Athlete' }},
    </EText>

    <!-- Unified Coach Synthesis -->
    <EContainer
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
        border-left: 4px solid #00dc82;
        border-top: 1px solid #e4e4e7;
        border-right: 1px solid #e4e4e7;
        border-bottom: 1px solid #e4e4e7;
      "
    >
      <EText
        style="
          font-size: 10px;
          font-weight: 900;
          color: #a1a1aa;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin: 0 0 12px;
        "
      >
        Coach's Synthesis
      </EText>
      
      <EText style="font-size: 15px; line-height: 1.7; color: #27272a; margin: 0 0 12px;">
        {{ introLine || `We added your latest workout to your timeline: ${workoutTitle}.` }}
        <span v-if="quickTakeBody"> {{ quickTakeBody }}</span>
        <span v-if="sportLensBody"> {{ sportLensBody }}</span>
        <span v-if="efficiencyMessage || recoveryMessage"> 
          {{ efficiencyMessage ? ` ${efficiencyMessage}` : '' }}{{ recoveryMessage ? ` ${recoveryMessage}` : '' }}
        </span>
      </EText>

      <EText v-if="loadContextBody" style="font-size: 15px; line-height: 1.7; color: #27272a; margin: 0;">
        {{ loadContextBody }}
        <span v-if="consistencyMessage" style="color: #059669; font-weight: 500;">
          {{ consistencyMessage }}
        </span>
      </EText>
    </EContainer>

    <!-- Key Metrics Grid -->
    <EContainer
      style="
        background-color: #ffffff;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
        border: 1px solid #e4e4e7;
      "
    >
      <ERow>
        <!-- Metric 1: TSS -->
        <EColumn v-if="tss !== undefined" style="width: 33%; text-align: center; border-right: 1px solid #e4e4e7;">
          <EText
            style="
              font-size: 10px;
              font-weight: 900;
              color: #a1a1aa;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin: 0 0 4px;
            "
          >
            Load
          </EText>
          <EText style="font-size: 22px; font-weight: 700; color: #09090b; margin: 0; font-variant-numeric: tabular-nums;">
            {{ tss }} <span style="font-size: 12px; font-weight: 500; color: #71717a">TSS</span>
          </EText>
        </EColumn>
        
        <!-- Metric 2: Duration / Distance -->
        <EColumn style="width: 33%; text-align: center; border-right: 1px solid #e4e4e7;">
          <EText
            style="
              font-size: 10px;
              font-weight: 900;
              color: #a1a1aa;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin: 0 0 4px;
            "
          >
            Volume
          </EText>
          <EText style="font-size: 22px; font-weight: 700; color: #09090b; margin: 0; font-variant-numeric: tabular-nums;">
            <template v-if="durationMinutes">
              {{ durationMinutes }} <span style="font-size: 12px; font-weight: 500; color: #71717a">min</span>
            </template>
            <template v-else-if="distanceKm">
              {{ distanceKm }} <span style="font-size: 12px; font-weight: 500; color: #71717a">km</span>
            </template>
            <template v-else>-</template>
          </EText>
        </EColumn>

        <!-- Metric 3: Output (Power or HR) -->
        <EColumn style="width: 34%; text-align: center;">
          <EText
            style="
              font-size: 10px;
              font-weight: 900;
              color: #a1a1aa;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin: 0 0 4px;
            "
          >
            Output
          </EText>
          <EText style="font-size: 22px; font-weight: 700; color: #09090b; margin: 0; font-variant-numeric: tabular-nums;">
            <template v-if="normalizedPower">
              {{ normalizedPower }} <span style="font-size: 12px; font-weight: 500; color: #71717a">W NP</span>
            </template>
            <template v-else-if="averageWatts">
              {{ averageWatts }} <span style="font-size: 12px; font-weight: 500; color: #71717a">W Avg</span>
            </template>
            <template v-else-if="averageHr">
              {{ averageHr }} <span style="font-size: 12px; font-weight: 500; color: #71717a">bpm</span>
            </template>
            <template v-else>-</template>
          </EText>
        </EColumn>
      </ERow>
    </EContainer>

    <div style="text-align: center; margin-bottom: 24px">
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

    <EText style="font-size: 14px; line-height: 1.6; color: #71717a; margin: 0 0 20px; text-align: center;">
      {{ nextStepMessage || 'See how this session impacted your Fitness vs Fatigue trend.' }}
    </EText>
  </BaseEmailLayout>
</template>
