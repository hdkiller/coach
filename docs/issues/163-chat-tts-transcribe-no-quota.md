# 163 — Chat Tts Transcribe No Quota

**Type:** Bug  
**Priority:** Medium  
**Area:** `ai,backend`  
**Status:** Fixed

## Description

TTS and transcribe endpoints skip checkQuota unlike messages.post.

## Steps to Reproduce

Unlimited TTS/transcribe without quota enforcement.

## Affected Files

- `server/api/chat/tts.post.ts`
- `server/api/chat/transcribe.post.ts`

## Acceptance Criteria

- [ ] Issue no longer reproducible
