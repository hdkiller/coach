<script setup lang="ts">
  import {
    EText,
    EContainer,
    EHeading,
    EHtml,
    EHead,
    EPreview,
    EBody,
    ESection,
    EImg,
    ELink,
    EFont
  } from 'vue-email'

  interface Props {
    name?: string
    initiatedBy: 'self' | 'admin'
    actorEmail?: string | null
    requestedAt: string
    unsubscribeUrl?: string
    utmQuery?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    name: 'Athlete',
    actorEmail: null,
    unsubscribeUrl: '',
    utmQuery: ''
  })

  const siteUrl = 'https://coachwatts.com'
  const logoUrl = 'https://coachwatts.com/icon.png'
  const supportEmail = 'hello@coachwatts.com'
  const formattedRequestedAt = new Date(props.requestedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  })
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
    <EPreview>Your Coach Watts account deletion has been scheduled.</EPreview>
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
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            height: 4px;
            width: 100%;
          "
        ></ESection>

        <ESection style="padding: 32px 40px 0; text-align: center">
          <ELink :href="siteUrl + (props.utmQuery || '')">
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
              letter-spacing: -0.025em;
            "
            >Account deletion scheduled</EHeading
          >

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 14px">
            Hi {{ props.name }},
          </EText>

          <EText style="font-size: 16px; line-height: 1.6; color: #71717a; margin-bottom: 18px">
            Your Coach Watts account deletion has been scheduled and all active sessions were
            invalidated.
          </EText>

          <EContainer
            style="
              background-color: #fafafa;
              border: 1px solid #e4e4e7;
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 24px;
            "
          >
            <EText style="font-size: 14px; color: #52525b; margin: 0 0 8px">
              <strong style="color: #09090b">Requested:</strong> {{ formattedRequestedAt }} UTC
            </EText>
            <EText style="font-size: 14px; color: #52525b; margin: 0 0 8px">
              <strong style="color: #09090b">Initiated by:</strong>
              {{ props.initiatedBy === 'admin' ? 'Coach Watts support/admin staff' : 'You' }}
            </EText>
            <EText
              v-if="props.initiatedBy === 'admin' && props.actorEmail"
              style="font-size: 14px; color: #52525b; margin: 0"
            >
              <strong style="color: #09090b">Admin contact:</strong> {{ props.actorEmail }}
            </EText>
          </EContainer>

          <EText style="font-size: 15px; line-height: 1.6; color: #71717a; margin: 0 0 12px">
            If you did not expect this request, reply immediately to
            <ELink
              :href="`mailto:${supportEmail}`"
              style="color: #dc2626; text-decoration: underline"
            >
              {{ supportEmail }}
            </ELink>
            so support can investigate.
          </EText>
        </ESection>

        <ESection
          style="background-color: #fafafa; padding: 32px 40px; border-top: 1px solid #e4e4e7"
        >
          <EText style="font-size: 14px; font-weight: 600; color: #09090b; margin: 0 0 8px">
            Coach Watts
          </EText>
          <EText style="font-size: 12px; color: #71717a; line-height: 1.6; margin: 0 0 16px">
            Transactional account notice.
          </EText>
          <EText style="font-size: 12px; color: #a1a1aa; line-height: 1.6; margin: 0">
            You can still manage communication settings here:
            <ELink
              :href="props.unsubscribeUrl || siteUrl + '/profile/settings?tab=communication'"
              style="color: #00c16a; text-decoration: underline"
            >
              email preferences
            </ELink>
          </EText>
        </ESection>
      </EContainer>
    </EBody>
  </EHtml>
</template>
