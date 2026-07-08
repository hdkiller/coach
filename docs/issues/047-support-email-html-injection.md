# 047 — Support API embeds raw user input in HTML email

**Type:** Bug  
**Priority:** Medium  
**Area:** `backend`, `infra`  
**Status:** Open

## Description

`subject`, `message`, `userName`, and `userEmail` are interpolated directly into the HTML support email body without escaping. Malicious or accidental HTML in a support message can alter email rendering.

## Root Cause

```52:59:server/api/support/send.post.ts
  const htmlContent = `
    <h2>New Support Message</h2>
    <p><strong>From:</strong> ${userName} (${userEmail})</p>
    ...
    <div style="white-space: pre-wrap;">${message}</div>
  `
```

Unlike `server/api/public/contact.post.ts`, which uses `escapeHtml`, support emails are unescaped.

## Steps to Reproduce

1. Submit support form with message containing HTML (e.g. `<img onerror=...>`).
2. Inspect received support email HTML.

## Expected Behavior

- User input is HTML-escaped before interpolation.

## Actual Behavior

- Raw user strings embedded in HTML.

## Affected Files

- `server/api/support/send.post.ts`

## Suggested Fix

Reuse shared `escapeHtml` helper for all interpolated fields.

## Acceptance Criteria

- [ ] HTML/script in support messages renders as literal text in email
- [ ] Normal messages still display correctly
