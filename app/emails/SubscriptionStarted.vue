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
    tier: string
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
    <EPreview>Welcome to Coach Watts {{ tier }}!</EPreview>
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
              style="margin: 0 auto; border-radius: 16px; display: block"
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
              margin-bottom: 24px;
              tracking: -0.025em;
            "
            >Welcome to {{ tier }}!</EHeading
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 20px"
            >Hi {{ name || 'Athlete' }},</EText
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 20px">
            Thank you for upgrading to <strong style="color: #09090b">{{ tier }}</strong
            >. Your support helps us keep building the most advanced AI coaching platform for
            endurance athletes.
          </EText>

          <EContainer
            style="
              background-color: #fafafa;
              border-left: 4px solid #00dc82;
              padding: 20px;
              margin-bottom: 28px;
              border-radius: 4px;
              border-top: 1px solid #e4e4e7;
              border-right: 1px solid #e4e4e7;
              border-bottom: 1px solid #e4e4e7;
            "
          >
            <EText
              style="
                font-size: 16px;
                font-weight: 600;
                color: #09090b;
                margin-top: 0;
                margin-bottom: 12px;
              "
              >What's unlocked:</EText
            >
            <ul
              style="
                font-size: 15px;
                line-height: 1.6;
                color: #71717a;
                margin: 0;
                padding-left: 20px;
              "
            >
              <li style="margin-bottom: 6px">Access to advanced reasoning AI models</li>
              <li style="margin-bottom: 6px">Deep analytics and recovery scoring</li>
              <li style="margin-bottom: 6px">Priority access to new features</li>
              <li>Expanded AI chat context and analysis</li>
            </ul>
          </EContainer>

          <div style="text-align: center">
            <EButton
              href="https://coachwatts.com/dashboard?utm_source=coachwatts_email&utm_medium=transactional&utm_campaign=subscription_started&utm_content=cta_dashboard"
              style="
                background-color: #00c16a;
                color: #ffffff;
                padding: 14px 28px;
                border-radius: 12px;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
              "
            >
              Go to Dashboard
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
