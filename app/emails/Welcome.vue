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
    <EPreview>Step 1 complete. Connect your first data source.</EPreview>
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
              font-size: 28px;
              line-height: 1.3;
              font-weight: 700;
              color: #09090b;
              margin-top: 0;
              margin-bottom: 20px;
              tracking: -0.025em;
            "
            >You're in. Let's make your next training day smarter.</EHeading
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px"
            >Hi {{ name || 'Athlete' }},</EText
          >

          <EContainer
            style="
              background-color: #fafafa;
              border: 1px solid #e4e4e7;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 20px;
            "
          >
            <EText
              style="
                font-size: 12px;
                font-weight: 700;
                color: #09090b;
                margin: 0 0 6px;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              "
              >Progress</EText
            >
            <EText style="font-size: 15px; color: #52525b; margin: 0"
              >Step 1 of 3 complete: your account is ready.</EText
            >
          </EContainer>

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 16px"
            >Next step: connect at least one training source so Coach Watts can start personalized
            guidance.</EText
          >

          <ul
            style="
              font-size: 15px;
              line-height: 1.6;
              color: #71717a;
              margin: 0 0 28px;
              padding-left: 20px;
            "
          >
            <li style="margin-bottom: 8px">Import your recent workouts automatically.</li>
            <li style="margin-bottom: 8px">Get your first AI workout analysis.</li>
            <li>Unlock daily training recommendations based on your data.</li>
          </ul>

          <EButton
            href="https://coachwatts.com/settings/apps?utm_source=coachwatts_email&utm_medium=lifecycle&utm_campaign=welcome_onboarding&utm_content=cta_connect_first_source"
            style="
              background-color: #00c16a;
              color: #ffffff;
              padding: 14px 28px;
              border-radius: 12px;
              font-weight: 600;
              text-decoration: none;
              display: inline-block;
              text-align: center;
            "
          >
            Connect Your First Data Source
          </EButton>
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
