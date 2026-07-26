# Hallmark Audit — AI Chat Interface

**Target**: [`app/pages/chat.vue`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/chat.vue) & [`app/components/chat/*`](file:///Users/hdkiller/Develop/coach-wattz/app/components/chat)  
**Declared Stamp**: `/* Hallmark · component: chat-interface · genre: atmospheric · tone: athletic */`

---

## Critical Findings (Ships as Slop)

### 1. Tool Call Card Stack Overflow on Mobile
- **Where**: [`app/components/chat/ChatToolCall.vue:L15-L80`](file:///Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatToolCall.vue#L15-L80)
- **Tell**: Multi-step tool call cards (Workout creation, calculation tools) truncate horizontally on 320px screens when displaying long parameters.
- **Fix**: Wrap tool execution payloads in responsive stacked preview layouts with expandable JSON accordions.

---

## Major Findings (Looks AI-Generated)

### 1. Generic AI Avatar Icon & Bubble Shapes
- **Where**: [`app/components/chat/ChatMessageList.vue:L40-L100`](file:///Users/hdkiller/Develop/coach-wattz/app/components/chat/ChatMessageList.vue#L40-L100)
- **Tell**: Rounded chat bubbles with generic bot avatar icon for assistant messages (`i-heroicons-sparkles` or generic robot).
- **Fix**: Elevate coach response container into an athletic editorial block with structured section dividers and inline metrics.

---

## Minor Findings

### 1. Fixed Viewport Height Hacks
- **Where**: [`app/pages/chat.vue:L61`](file:///Users/hdkiller/Develop/coach-wattz/app/pages/chat.vue#L61)
- **Tell**: Uses runtime `visualViewport` listener + inline height variable `100dvh`.
- **Fix**: Standardize flex layout containment to avoid layout shifts during virtual keyboard show/hide.

---

## Scorecard
- **AI SDK Integration**: Pass (Strict AI SDK v5 UIMessage schema & normalized sequence)
- **Mobile Responsive**: Requires tool call card adjustment at 320px
- **Summary**: `1 critical · 1 major · 1 minor`
