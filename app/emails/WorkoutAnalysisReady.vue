<script setup lang="ts">
  import {
    EHtml,
    EHead,
    EPreview,
    EBody,
    EContainer,
    ESection,
    EImg,
    EText,
    ELink,
    EFont,
    EHeading,
    EButton
  } from 'vue-email'

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
  const logoUrl = 'https://coachwatts.com/icon.png'
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <EFont
        font-family="Public Sans"
        fallback-font-family="sans-serif"
        :web-font="{
          url: 'https://fonts.gstatic.com/s/publicsans/v14/ijwQs572Xtc6ZYQws9YVwnNGfJ4.woff2',
          format: 'woff2'
        }"
        :font-weight="400"
        font-style="normal"
      />
    </EHead>
    <EPreview>Excellent work. Your analysis is ready for {{ workoutTitle }}.</EPreview>
    <EBody
      style="
        background-color: #f4f4f5;
        font-family:
          'Public Sans',
          Inter,
          -apple-system,
          BlinkMacSystemFont,
          'Segoe UI',
          Roboto,
          sans-serif;
        padding: 40px 0;
      "
    >
      <EContainer
        style="
          background-color: #ffffff;
          margin: 0 auto;
          border-radius: 12px;
          border: 1px solid #e4e4e7;
          overflow: hidden;
          max-width: 600px;
          box-shadow:
            0 4px 6px -1px rgba(0, 0, 0, 0.05),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
        "
      >
        <ESection style="padding: 32px 40px 0; text-align: center">
          <ELink :href="siteUrl">
            <EImg
              :src="logoUrl"
              width="64"
              height="64"
              alt="Coach Watts"
              style="margin: 0 auto; border-radius: 12px; display: block"
            />
          </ELink>
        </ESection>

        <ESection style="padding: 32px 40px">
          <EHeading
            style="
              font-size: 24px;
              line-height: 1.3;
              font-weight: 700;
              color: #09090b;
              margin-top: 0;
              margin-bottom: 20px;
              tracking: -0.025em;
            "
            >Excellent work. Your workout review is ready.</EHeading
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px"
            >Hi {{ name || 'Athlete' }},</EText
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 12px">
            We analyzed <strong style="color: #09090b">{{ workoutTitle }}</strong> and identified
            the highest-impact adjustments for your next sessions.
          </EText>

          <EText
            v-if="workoutDate || durationMinutes || tss || workoutType"
            style="font-size: 13px; line-height: 1.5; color: #71717a; margin: 0 0 20px"
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
                tabular-nums: tabular-nums;
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
            <ul
              style="
                font-size: 14px;
                line-height: 1.6;
                color: #52525b;
                margin: 0;
                padding-left: 18px;
              "
            >
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
            <EText style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0">
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
            <EText v-if="adherenceScore" style="font-size: 14px; color: #09090b; margin: 0 0 8px">
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
            Open your review to see the exact pacing, effort, and execution priorities to carry into
            your next workout.
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
                background-color: #00c16a;
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
        </ESection>

        <ESection
          style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7"
        >
          <EText style="font-size: 14px; font-weight: 600; color: #09090b; margin: 0 0 8px"
            >Coach Watts</EText
          >
          <EText style="font-size: 12px; color: #71717a; line-height: 1.6; margin: 0 0 16px"
            >AI-powered endurance coaching that adapts to you.</EText
          >
          <EText style="font-size: 12px; color: #a1a1aa; line-height: 1.6; margin: 0">
            You're receiving this because you registered at Coach Watts.
            <br />
            You can
            <ELink
              :href="unsubscribeUrl || siteUrl + '/profile/settings?tab=communication'"
              style="color: #00c16a; text-decoration: underline"
            >
              manage your email preferences
            </ELink>
            at any time.
          </EText>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>
