<script setup lang="ts">
  import {
    EText,
    EContainer,
    EHeading,
    EButton,
    EHtml,
    EHead,
    EPreview,
    EBody,
    ESection,
    EImg,
    ELink,
    EFont
  } from 'vue-email'

  defineProps<{
    name?: string
    workoutId?: string
    workoutUrl?: string
    workoutTitle: string
    metricLabel: string // e.g. "Functional Threshold Power"
    sportProfileName?: string
    oldValue: number
    newValue: number
    unit: string // e.g. "W" or "bpm"
    peakValue: number
    percentIncrease?: number
    unsubscribeUrl?: string
    utmQuery?: string
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
    <EPreview>{{
      `Level Up! New ${sportProfileName ? `${sportProfileName} ` : ''}${metricLabel} detected in your workout.`
    }}</EPreview>
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
          <ELink :href="siteUrl + (utmQuery || '')">
            <EImg
              :src="logoUrl"
              width="64"
              height="64"
              alt="Coach Watts"
              style="margin: 0 auto; border-radius: 12px; display: block"
            />
          </ELink>
        </ESection>

        <!-- Main Content -->
        <ESection style="padding: 32px 40px">
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
            >Level Up Detected! 🚀</EHeading
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px"
            >Hi {{ name || 'Athlete' }},</EText
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 24px">
            Based on your performance in <strong style="color: #09090b">{{ workoutTitle }}</strong
            >, Coach Watts has detected an improvement in your
            <strong>{{ sportProfileName ? `${sportProfileName} ` : '' }}{{ metricLabel }}</strong
            >.
          </EText>

          <!-- Metric Comparison Box -->
          <EContainer
            style="
              background-color: #1a1a1a;
              border-radius: 16px;
              padding: 32px;
              margin-bottom: 24px;
              text-align: center;
              color: #ffffff;
            "
          >
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px">
              <!-- Old -->
              <div style="flex: 1; text-align: center">
                <div
                  style="
                    font-size: 10px;
                    font-weight: 900;
                    color: #71717a;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                  "
                >
                  Old
                </div>
                <div
                  style="
                    font-size: 24px;
                    font-weight: 700;
                    color: #52525b;
                    text-decoration: line-through;
                  "
                >
                  {{ oldValue }}<span style="font-size: 14px; margin-left: 2px">{{ unit }}</span>
                </div>
              </div>

              <!-- Arrow -->
              <div style="text-align: center; padding: 0 10px">
                <div
                  v-if="percentIncrease && percentIncrease > 0"
                  style="
                    font-size: 10px;
                    font-weight: 900;
                    color: #00dc82;
                    background-color: rgba(0, 220, 130, 0.1);
                    padding: 2px 8px;
                    border-radius: 99px;
                    margin-bottom: 4px;
                  "
                >
                  +{{ percentIncrease }}%
                </div>
                <div style="font-size: 24px; color: #52525b">→</div>
              </div>

              <!-- New -->
              <div style="flex: 1; text-align: center">
                <div
                  style="
                    font-size: 10px;
                    font-weight: 900;
                    color: #00dc82;
                    text-transform: uppercase;
                    margin-bottom: 4px;
                  "
                >
                  New
                </div>
                <div style="font-size: 36px; font-weight: 900; color: #ffffff; line-height: 1">
                  {{ newValue
                  }}<span
                    style="font-size: 16px; font-weight: 700; color: #71717a; margin-left: 2px"
                    >{{ unit }}</span
                  >
                </div>
              </div>
            </div>
          </EContainer>

          <EText
            style="
              font-size: 14px;
              line-height: 1.6;
              color: #71717a;
              margin-bottom: 24px;
              text-align: center;
            "
          >
            Detected Peak 20-minute effort: <strong>{{ peakValue }}{{ unit }}</strong>
          </EText>

          <EText style="font-size: 15px; line-height: 1.6; color: #52525b; margin: 0 0 28px">
            Updating your threshold will ensure your training zones, intensity, and historical
            performance stats are calculated correctly.
          </EText>

          <div style="text-align: center; margin-bottom: 18px">
            <EButton
              :href="
                (workoutUrl ||
                  (workoutId ? `${siteUrl}/workouts/${workoutId}` : `${siteUrl}/dashboard`)) +
                (utmQuery || '') +
                '&utm_content=cta_update_threshold'
              "
              style="
                background: linear-gradient(135deg, #00dc82 0%, #00c16a 100%);
                color: #ffffff;
                padding: 14px 28px;
                border-radius: 12px;
                font-weight: 700;
                text-decoration: none;
                display: inline-block;
                width: auto;
                text-transform: uppercase;
                letter-spacing: 0.025em;
              "
            >
              Update My Threshold
            </EButton>
          </div>
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
            You're receiving this because you enabled threshold notifications in your settings.
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
