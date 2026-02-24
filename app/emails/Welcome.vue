<script setup lang="ts">
  import { EText, EContainer, EHeading, EButton } from 'vue-email'
  import BaseEmailLayout from './BaseEmailLayout.vue'

  defineProps<{
    name?: string
    unsubscribeUrl?: string
  }>()
</script>

<template>
  <BaseEmailLayout
    preview-text="Step 1 complete. Connect your first data source."
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
          font-size: 10px;
          font-weight: 900;
          color: #a1a1aa;
          margin: 0 0 6px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        "
        >Progress</EText
      >
      <EText style="font-size: 15px; color: #52525b; margin: 0"
        >Step 1 of 3 complete: your account is ready.</EText
      >
    </EContainer>

    <!-- Top Gradient Accent -->
    <ESection
      style="
        background: linear-gradient(135deg, #00dc82 0%, #00c16a 100%);
        height: 4px;
        width: 100%;
      "
    ></ESection>

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

    <div style="text-align: center; margin-bottom: 18px">
      <EButton
        href="https://coachwatts.com/settings/apps?utm_source=coachwatts_email&utm_medium=lifecycle&utm_campaign=welcome_onboarding&utm_content=cta_connect_first_source"
        style="
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
        Connect Your First Data Source
      </EButton>
    </div>
  </BaseEmailLayout>
</template>
