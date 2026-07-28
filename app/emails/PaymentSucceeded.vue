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

  withDefaults(
    defineProps<{
      name?: string
      tier?: string
      amount?: string
      siteUrl?: string
      logoUrl?: string
      unsubscribeUrl?: string
      utmQuery?: string
    }>(),
    {
      siteUrl: 'https://coachwatts.com',
      logoUrl: 'https://coachwatts.com/icon.png'
    }
  )
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
    <EPreview>Your Coach Watts subscription payment was successful.</EPreview>
    <EBody
      style="
        background-color: #f4f4f5;
        font-family: 'Public Sans', Inter, sans-serif;
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
              alt="Coach Watts"
              style="margin: 0 auto; border-radius: 12px; display: block"
            />
          </ELink>
        </ESection>
        <ESection style="padding: 32px 40px">
          <EHeading
            style="
              font-size: 24px;
              font-weight: 700;
              color: #09090b;
              margin-top: 0;
              margin-bottom: 18px;
              letter-spacing: -0.025em;
            "
          >
            Payment Received
          </EHeading>
          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px">
            Hi {{ name || 'Athlete' }},
          </EText>
          <EText style="font-size: 15px; line-height: 1.6; color: #71717a; margin-bottom: 20px">
            Thank you for your payment {{ amount ? '(' + amount + ')' : '' }} for your
            {{ tier || 'Coach Watts' }} subscription. Your plan remains active.
          </EText>
          <div style="text-align: center; margin-bottom: 24px">
            <EButton
              :href="
                siteUrl + '/settings/billing' + (utmQuery || '') + '&utm_content=cta_view_billing'
              "
              style="
                background-color: #00c16a;
                background: linear-gradient(135deg, #00dc82 0%, #00c16a 100%);
                color: #ffffff;
                padding: 14px 28px;
                border-radius: 12px;
                font-weight: 600;
                text-decoration: none;
                display: inline-block;
              "
            >
              View Billing Settings
            </EButton>
          </div>
        </ESection>
        <ESection
          style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7"
        >
          <EText style="font-size: 14px; font-weight: 600; color: #09090b; margin: 0 0 8px">
            Coach Watts
          </EText>
          <EText style="font-size: 12px; color: #71717a; line-height: 1.6; margin: 0">
            AI-powered endurance coaching that adapts to you.
          </EText>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>
