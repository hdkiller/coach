# 231 — Share Token Minted on Modal Open

**Type:** Bug  
**Priority:** Medium  
**Area:** `chat, privacy`  
**Status:** Fixed

## Description

Opening the share modal immediately calls `generateShareLink()`, minting a public token before user confirmation. The expiry selector is ignored on that initial call (server defaults to 30 days).

## Affected Files

- `app/pages/chat.vue`

## Acceptance Criteria

- Share tokens are created only when the user clicks Generate/Confirm.
- Expiry selection applies to the generated token.
