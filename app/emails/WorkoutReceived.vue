<script setup lang="ts">
  import {
    EText,
    EContainer,
    EHeading,
    EButton,
    ERow,
    EColumn,
    EHtml,
    EHead,
    EPreview,
    EBody,
    ESection,
    EImg,
    EHr,
    ELink,
    EFont
  } from 'vue-email'

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
    shareUrl?: string
  }>()

  const logoUrl = 'https://coachwatts.com/icon.png'
  const siteUrl = 'https://coachwatts.com'
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
    <EPreview>{{ previewLine || `${workoutTitle} is synced and ready to review.` }}</EPreview>
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
        <!-- Top Gradient Accent -->
        <ESection
          style="
            background: linear-gradient(135deg, #00dc82 0%, #00c16a 100%);
            height: 4px;
            width: 100%;
          "
        ></ESection>

        <!-- Header -->
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

        <!-- Main Content (Slot) -->
        <ESection style="padding: 32px 40px">
          <!-- Dynamic Header Graphic -->
          <svg
            width="100%"
            height="40"
            viewBox="0 0 600 40"
            preserveAspectRatio="none"
            style="display: block; margin-bottom: 24px"
          >
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

            <EText style="font-size: 15px; line-height: 1.7; color: #27272a; margin: 0 0 12px">
              {{ introLine || `We added your latest workout to your timeline: ${workoutTitle}.` }}
              <span v-if="quickTakeBody"> {{ quickTakeBody }}</span>
              <span v-if="sportLensBody"> {{ sportLensBody }}</span>
              <span v-if="efficiencyMessage || recoveryMessage">
                {{ efficiencyMessage ? ` ${efficiencyMessage}` : ''
                }}{{ recoveryMessage ? ` ${recoveryMessage}` : '' }}
              </span>
            </EText>

            <EText
              v-if="loadContextBody"
              style="font-size: 15px; line-height: 1.7; color: #27272a; margin: 0"
            >
              {{ loadContextBody }}
              <span v-if="consistencyMessage" style="color: #059669; font-weight: 500">
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
              <EColumn
                v-if="tss !== undefined"
                style="width: 33%; text-align: center; border-right: 1px solid #e4e4e7"
              >
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
                <EText
                  style="
                    font-size: 22px;
                    font-weight: 700;
                    color: #09090b;
                    margin: 0;
                    font-variant-numeric: tabular-nums;
                  "
                >
                  {{ tss }}
                  <span style="font-size: 12px; font-weight: 500; color: #71717a">TSS</span>
                </EText>
              </EColumn>

              <!-- Metric 2: Duration / Distance -->
              <EColumn style="width: 33%; text-align: center; border-right: 1px solid #e4e4e7">
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
                <EText
                  style="
                    font-size: 22px;
                    font-weight: 700;
                    color: #09090b;
                    margin: 0;
                    font-variant-numeric: tabular-nums;
                  "
                >
                  <template v-if="durationMinutes">
                    {{ durationMinutes }}
                    <span style="font-size: 12px; font-weight: 500; color: #71717a">min</span>
                  </template>
                  <template v-else-if="distanceKm">
                    {{ distanceKm }}
                    <span style="font-size: 12px; font-weight: 500; color: #71717a">km</span>
                  </template>
                  <template v-else>-</template>
                </EText>
              </EColumn>

              <!-- Metric 3: Output (Power or HR) -->
              <EColumn style="width: 34%; text-align: center">
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
                <EText
                  style="
                    font-size: 22px;
                    font-weight: 700;
                    color: #09090b;
                    margin: 0;
                    font-variant-numeric: tabular-nums;
                  "
                >
                  <template v-if="normalizedPower">
                    {{ normalizedPower }}
                    <span style="font-size: 12px; font-weight: 500; color: #71717a">W NP</span>
                  </template>
                  <template v-else-if="averageWatts">
                    {{ averageWatts }}
                    <span style="font-size: 12px; font-weight: 500; color: #71717a">W Avg</span>
                  </template>
                  <template v-else-if="averageHr">
                    {{ averageHr }}
                    <span style="font-size: 12px; font-weight: 500; color: #71717a">bpm</span>
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

          <EText
            style="
              font-size: 14px;
              line-height: 1.6;
              color: #71717a;
              margin: 0 0 20px;
              text-align: center;
            "
          >
            {{ nextStepMessage || 'See how this session impacted your Fitness vs Fatigue trend.' }}
          </EText>

          <!-- Public Share Block -->
          <template v-if="shareUrl">
            <EContainer
              style="
                background-color: #f8fafc;
                border-radius: 12px;
                padding: 24px;
                margin-top: 32px;
                text-align: center;
                border: 1px dashed #cbd5e1;
              "
            >
              <EText
                style="
                  font-size: 16px;
                  font-weight: 700;
                  color: #0f172a;
                  margin: 0 0 8px;
                  letter-spacing: -0.01em;
                "
              >
                Proud of this activity?
              </EText>
              <EText style="font-size: 14px; line-height: 1.5; color: #64748b; margin: 0 0 16px">
                Share your effort and your coach's insights with your friends.
              </EText>
              <EButton
                :href="shareUrl"
                style="
                  background-color: #ffffff;
                  color: #0f172a;
                  padding: 10px 20px;
                  border-radius: 8px;
                  font-size: 13px;
                  font-weight: 600;
                  text-decoration: none;
                  display: inline-block;
                  border: 1px solid #cbd5e1;
                  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                "
              >
                Share This Workout
              </EButton>
            </EContainer>
          </template>
        </ESection>

        <!-- Footer -->
        <ESection
          style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7"
        >
          <EText style="font-size: 14px; font-weight: 600; color: #09090b; margin: 0 0 8px">
            Coach Watts
          </EText>
          <EText style="font-size: 12px; color: #71717a; line-height: 1.6; margin: 0 0 16px">
            AI-powered endurance coaching that adapts to you.
          </EText>
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
