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
    trialEndsAt: string
    usageHighlights?: Array<{ operation: string; count: number }>
    supporterHighlights?: Array<{ label: string; value: string }>
    pricingUrl?: string
    unsubscribeUrl?: string
    utmQuery?: string
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
    <EPreview
      >Your performance trial ends on {{ trialEndsAt }}. Keep Supporter-level AI access.</EPreview
    >
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
        <ESection
          style="
            background: linear-gradient(135deg, #00dc82 0%, #00c16a 100%);
            height: 4px;
            width: 100%;
          "
        ></ESection>

        <ESection style="padding: 32px 40px 0; text-align: center">
          <ELink :href="siteUrl + (utmQuery || '')">
            <EImg
              :src="logoUrl"
              width="64"
              height="64"
              alt="Journey Endurance Coaching"
              style="margin: 0 auto; border-radius: 12px; display: block"
            />
          </ELink>
        </ESection>

        <ESection style="padding: 32px 40px">
          <EHeading
            style="
              font-size: 26px;
              line-height: 1.3;
              font-weight: 700;
              color: #09090b;
              margin-top: 0;
              margin-bottom: 16px;
              letter-spacing: -0.025em;
            "
            >Your performance trial ends soon</EHeading
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px"
            >Hi {{ name || 'Athlete' }},</EText
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 20px"
            >Your Supporter-level performance trial ends on
            <strong style="color: #09090b">{{ trialEndsAt }}</strong
            >. After that, your account returns to Free-tier AI limits unless you upgrade.</EText
          >

          <EContainer
            v-if="usageHighlights && usageHighlights.length > 0"
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
                font-size: 10px;
                font-weight: 900;
                color: #71717a;
                margin: 0 0 10px;
                letter-spacing: 0.2em;
                text-transform: uppercase;
              "
              >What you've used this week</EText
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
              <li v-for="item in usageHighlights" :key="item.operation" style="margin-bottom: 6px">
                {{ item.operation }} — {{ item.count }}
                {{ item.count === 1 ? 'use' : 'uses' }}
              </li>
            </ul>
          </EContainer>

          <EContainer
            v-if="supporterHighlights && supporterHighlights.length > 0"
            style="
              background-color: #fafafa;
              border: 1px solid #e4e4e7;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 24px;
            "
          >
            <EText
              style="
                font-size: 10px;
                font-weight: 900;
                color: #71717a;
                margin: 0 0 10px;
                letter-spacing: 0.2em;
                text-transform: uppercase;
              "
              >What Supporter keeps unlocked</EText
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
              <li v-for="item in supporterHighlights" :key="item.label" style="margin-bottom: 6px">
                {{ item.label }}: {{ item.value }}
              </li>
            </ul>
          </EContainer>

          <div style="text-align: center; margin-bottom: 18px">
            <EButton
              :href="(pricingUrl || siteUrl + '/settings/billing') + (utmQuery || '')"
              style="
                background-color: #00c16a;
                background: linear-gradient(135deg, #00dc82 0%, #00c16a 100%);
                color: #ffffff;
                padding: 14px 28px;
                border-radius: 12px;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
                text-align: center;
              "
            >
              View plans and pricing
            </EButton>
          </div>
        </ESection>

        <ESection
          style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7"
        >
          <EText style="font-size: 12px; color: #a1a1aa; line-height: 1.6; margin: 0">
            You're receiving this because your performance trial is ending soon.
            <br />
            <ELink
              :href="unsubscribeUrl || siteUrl + '/profile/settings?tab=communication'"
              style="color: #00c16a; text-decoration: underline"
            >
              Manage email preferences
            </ELink>
          </EText>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>
