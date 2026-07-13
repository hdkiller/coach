# 225 — WebSocket Auth Tokens Stored In-Memory (Multi-Instance)

**Type:** Bug  
**Priority:** High  
**Area:** `chat, realtime`  
**Status:** Fixed

## Description

WebSocket handshake tokens live in a process-local `Map`. Behind a load balancer without sticky sessions, `/api/websocket-token` and the WS upgrade can land on different instances, causing silent auth failure and polling-only fallback.

## Affected Files

- `server/utils/ws-auth.ts`
- `server/api/websocket-token.get.ts`
- `server/api/websocket.ts`

## Acceptance Criteria

- Any app instance can validate tokens minted by any other instance.
- Existing 10-second TTL preserved.
- Dev/single-instance behavior unchanged when secret is configured.
