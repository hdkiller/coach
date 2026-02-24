<script setup lang="ts">
  import { EText, EContainer, EHeading, EButton } from 'vue-email'
  import BaseEmailLayout from './BaseEmailLayout.vue'

  defineProps<{
    name?: string
    workoutId?: string
    workoutUrl?: string
    workoutTitle: string
    workoutDate?: string
    workoutType?: string
    durationMinutes?: number
    averageHr?: number
    averageWatts?: number
    tss?: number
    overallScore?: number
    analysisSummary?: string
    recommendationHighlights?: string[]
    adherenceSummary?: string
    adherenceScore?: number
    unsubscribeUrl?: string
  }>()

  const siteUrl = 'https://coachwatts.com'
</script>

<template>
  <BaseEmailLayout
    :preview-text="`Excellent work. Your analysis is ready for ${workoutTitle}.`"
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
        letter-spacing: -0.025em;
      "
      >Excellent work. Your workout review is ready.</EHeading
    >

    <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px"
      >Hi {{ name || 'Athlete' }},</EText
    >

    <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 12px">
      We analyzed <strong style="color: #09090b">{{ workoutTitle }}</strong> and identified the
      highest-impact adjustments for your next sessions.
    </EText>

    <EText
      v-if="workoutDate || durationMinutes || tss || workoutType"
      style="
        font-size: 13px;
        line-height: 1.5;
        color: #71717a;
        margin: 0 0 20px;
        font-variant-numeric: tabular-nums;
      "
    >
      {{ workoutDate || 'Recent workout' }}
      <span v-if="durationMinutes"> • {{ durationMinutes }} min</span>
      <span v-if="tss"> • {{ tss }} TSS</span>
      <span v-if="workoutType"> • {{ workoutType }}</span>
    </EText>

    <EContainer
      v-if="overallScore"
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        margin-bottom: 14px;
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
          margin: 0 0 8px;
        "
        >Current Execution Score</EText
      >
      <EText
        style="
          font-size: 48px;
          font-weight: 700;
          color: #09090b;
          margin: 0;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        "
        >{{ overallScore }}<span style="font-size: 24px; color: #a1a1aa">/10</span></EText
      >
    </EContainer>

    <EContainer
      v-if="analysisSummary"
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 14px;
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
          margin: 0 0 8px;
        "
        >Key Insight</EText
      >
      <EText style="font-size: 15px; line-height: 1.6; color: #52525b; margin: 0">{{
        analysisSummary
      }}</EText>
    </EContainer>

    <EContainer
      v-if="recommendationHighlights && recommendationHighlights.length > 0"
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 14px;
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
          margin: 0 0 8px;
        "
        >Observations</EText
      >
      <ul style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0; padding-left: 18px">
        <li v-for="(item, idx) in recommendationHighlights.slice(0, 3)" :key="idx">
          {{ item }}
        </li>
      </ul>
    </EContainer>

    <EContainer
      v-if="averageHr || averageWatts || tss"
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 14px;
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
          margin: 0 0 8px;
        "
        >Effort Snapshot</EText
      >
      <EText
        style="
          font-size: 14px;
          line-height: 1.6;
          color: #52525b;
          margin: 0;
          font-variant-numeric: tabular-nums;
        "
      >
        <span v-if="averageHr"
          ><strong style="color: #09090b">Avg HR:</strong> {{ averageHr }} bpm</span
        >
        <span v-if="averageHr && averageWatts"> | </span>
        <span v-if="averageWatts"
          ><strong style="color: #09090b">Avg Power:</strong> {{ averageWatts }} W</span
        >
        <span v-if="(averageHr || averageWatts) && tss"> | </span>
        <span v-if="tss"><strong style="color: #09090b">TSS:</strong> {{ tss }}</span>
      </EText>
    </EContainer>

    <EContainer
      v-if="adherenceSummary || adherenceScore"
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 18px;
        margin-bottom: 14px;
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
          margin: 0 0 8px;
        "
        >Plan Adherence</EText
      >
      <EText
        v-if="adherenceScore"
        style="font-size: 14px; color: #09090b; margin: 0 0 8px; font-variant-numeric: tabular-nums"
      >
        Score: {{ adherenceScore }}/100
      </EText>
      <EText
        v-if="adherenceSummary"
        style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0"
      >
        {{ adherenceSummary }}
      </EText>
    </EContainer>

    <EText style="font-size: 15px; line-height: 1.6; color: #71717a; margin: 0 0 28px">
      Open your review to see the exact pacing, effort, and execution priorities to carry into your
      next workout.
    </EText>

    <div style="text-align: center; margin-bottom: 18px">
      <EButton
        :href="
          workoutUrl ||
          (workoutId
            ? `${siteUrl}/workouts/${workoutId}?utm_source=coachwatts_email&utm_medium=engagement&utm_campaign=workout_analysis_ready&utm_content=cta_review_priorities`
            : 'https://coachwatts.com/dashboard?utm_source=coachwatts_email&utm_medium=engagement&utm_campaign=workout_analysis_ready&utm_content=cta_review_priorities')
        "
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
        Review My Priorities
      </EButton>
    </div>
  </BaseEmailLayout>
</template>
