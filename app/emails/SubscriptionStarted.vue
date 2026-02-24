<script setup lang="ts">
  import { EText, EContainer, EHeading, EButton } from 'vue-email'
  import BaseEmailLayout from './BaseEmailLayout.vue'

  defineProps<{
    name?: string
    tier: string
    unsubscribeUrl?: string
  }>()

  const siteUrl = 'https://coachwatts.com'
</script>

<template>
  <BaseEmailLayout
    :preview-text="`Your ${tier} plan is active. Advanced coaching is unlocked.`"
    :unsubscribe-url="unsubscribeUrl"
  >
    <EHeading
      style="
        font-size: 28px;
        line-height: 1.3;
        font-weight: 700;
        color: #09090b;
        margin-top: 0;
        margin-bottom: 20px;
        letter-spacing: -0.025em;
      "
      >{{ tier }} is active</EHeading
    >

    <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px"
      >Hi {{ name || 'Athlete' }},</EText
    >

    <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 18px">
      Your upgraded plan is live. You now have access to deeper analysis and faster coaching
      feedback loops.
    </EText>

    <EContainer
      style="
        background-color: #fafafa;
        border-left: 4px solid #00dc82;
        padding: 20px;
        margin-bottom: 24px;
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
        >What changes now:</EText
      >
      <ul style="font-size: 15px; line-height: 1.6; color: #71717a; margin: 0; padding-left: 20px">
        <li style="margin-bottom: 6px">More advanced AI reasoning for analysis and planning</li>
        <li style="margin-bottom: 6px">Richer workout and readiness insights</li>
        <li>Priority access to new coaching capabilities</li>
      </ul>
    </EContainer>

    <div style="text-align: center; margin-bottom: 18px">
      <EButton
        href="https://coachwatts.com/dashboard?utm_source=coachwatts_email&utm_medium=transactional&utm_campaign=subscription_started&utm_content=cta_use_pro_features"
        style="
          background: linear-gradient(135deg, #00dc82 0%, #00c16a 100%);
          color: #ffffff;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        "
      >
        Start Using Pro Features
      </EButton>
    </div>
  </BaseEmailLayout>
</template>
