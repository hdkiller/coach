<script setup lang="ts">
  import { EText, EContainer, EHeading, EButton } from 'vue-email'
  import BaseEmailLayout from './BaseEmailLayout.vue'

  defineProps<{
    name?: string
    date: string
    recommendation: string
    reasoning: string
    unsubscribeUrl?: string
  }>()

  const siteUrl = 'https://coachwatts.com'
</script>

<template>
  <BaseEmailLayout
    :preview-text="`Your training focus for ${date} is ready.`"
    :unsubscribe-url="unsubscribeUrl"
  >
    <EHeading
      style="
        font-size: 24px;
        line-height: 1.3;
        font-weight: 700;
        color: #09090b;
        margin-top: 0;
        margin-bottom: 18px;
        letter-spacing: -0.025em;
      "
      >Your plan for today</EHeading
    >

    <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px"
      >Hi {{ name || 'Athlete' }},</EText
    >

    <EText style="font-size: 15px; line-height: 1.6; color: #71717a; margin: 0 0 20px">
      For <strong style="color: #09090b">{{ date }}</strong
      >, here's the highest-value move based on your latest training and recovery signals.
    </EText>

    <EContainer
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 20px;
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
        >Do This</EText
      >
      <EText
        style="font-size: 24px; font-weight: 700; color: #00c16a; margin: 0; line-height: 1.2"
        >{{ recommendation }}</EText
      >
    </EContainer>

    <EContainer
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 20px;
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
        >Why Now</EText
      >
      <EText style="font-size: 15px; line-height: 1.6; color: #52525b; margin: 0">{{
        reasoning
      }}</EText>
    </EContainer>

    <EContainer
      style="
        background-color: #fafafa;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 28px;
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
        >If Time Is Tight</EText
      >
      <EText style="font-size: 15px; line-height: 1.6; color: #52525b; margin: 0"
        >Do a 20-30 minute easy version and keep your routine alive. Consistency beats perfect
        execution.</EText
      >
    </EContainer>

    <div style="text-align: center; margin-bottom: 18px">
      <EButton
        href="https://coachwatts.com/dashboard?utm_source=coachwatts_email&utm_medium=engagement&utm_campaign=daily_recommendation&utm_content=cta_view_today_options"
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
        See Full Session Options
      </EButton>
    </div>
  </BaseEmailLayout>
</template>
